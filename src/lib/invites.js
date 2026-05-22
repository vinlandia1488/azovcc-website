import { getBackendDb } from "./backend";
import { createLicenseKeyRecord, deleteLicenseKeyRecord } from "./license-keys";

const db = getBackendDb();

// Repurposing CloudConfig for everything to avoid SDK schema errors
// Settings: name: "SETTING:invite_system_enabled"
// Invites: name: "INVITE:[CODE]" content: "[GEN:username] [MOD:true/false]"
// Chats: name: "CHAT:[SESSION_ID]:[TIMESTAMP]:[TYPE]" content: message

export async function isInviteSystemEnabled() {
  try {
    const settings = await db.entities.CloudConfig.filter({ name: "SETTING:invite_system_enabled" });
    if (settings && settings.length > 0) {
      return settings[0].content === "true";
    }
    return true;
  } catch (err) {
    console.error("Failed to check invite system status:", err);
    return true;
  }
}

export async function setInviteSystemEnabled(enabled) {
  const settings = await db.entities.CloudConfig.filter({ name: "SETTING:invite_system_enabled" });
  if (settings && settings.length > 0) {
    await db.entities.CloudConfig.update(settings[0].id, { content: String(enabled) });
  } else {
    await db.entities.CloudConfig.create({ 
      name: "SETTING:invite_system_enabled", 
      content: String(enabled),
      owner_username: "system"
    });
  }
}

export function generateRandomCode(length = 8) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function generateInviteCode(user) {
  if (!user) throw new Error("User not authenticated");

  const now = new Date();
  
  if (!user.is_admin) {
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const allConfigs = await db.entities.CloudConfig.filter({});
    const userInvites = (allConfigs || []).filter(c => 
      c.name.startsWith("INVITE:") && 
      c.content?.includes(`[GEN:${user.username}]`) &&
      !c.content?.includes(`[MOD:true]`)
    );
    
    // We don't have created_at on CloudConfig directly in the filterable properties usually, 
    // but we can store it in content
    const recentCode = userInvites.find(c => {
      const match = c.content.match(/\[DATE:([^\]]+)\]/);
      if (match) {
        return new Date(match[1]) > oneWeekAgo;
      }
      return false;
    });

    if (recentCode) {
      const dateStr = recentCode.content.match(/\[DATE:([^\]]+)\]/)[1];
      const nextAvailable = new Date(new Date(dateStr).getTime() + 7 * 24 * 60 * 60 * 1000);
      throw new Error(`You can only generate one invite code per week. Next available: ${nextAvailable.toLocaleDateString()}`);
    }
  }

  const code = generateRandomCode();
  const newInvite = await db.entities.CloudConfig.create({
    name: `INVITE:${code}`,
    content: `[GEN:${user.username}] [MOD:${!!user.is_admin}] [DATE:${now.toISOString()}]`,
    owner_username: user.username
  });

  return {
    id: newInvite.id,
    code,
    generated_by: user.username,
    created_at: now.toISOString(),
    is_mod_generated: !!user.is_admin
  };
}

export async function validateInviteCode(code) {
  if (!code) throw new Error("Invite code is required");
  
  const enabled = await isInviteSystemEnabled();
  if (!enabled) return true;

  const matches = await db.entities.CloudConfig.filter({ name: `INVITE:${code}` });
  if (!matches || matches.length === 0) {
    throw new Error("Invalid invite code");
  }

  const invite = matches[0];
  if (invite.content.includes("[USED_BY:")) {
    throw new Error("This invite code has already been used");
  }

  return invite;
}

export async function useInviteCode(code, username) {
  const matches = await db.entities.CloudConfig.filter({ name: `INVITE:${code}` });
  if (!matches || matches.length === 0) throw new Error("Invite code not found");
  
  const invite = matches[0];
  await db.entities.CloudConfig.update(invite.id, {
    content: `${invite.content} [USED_BY:${username}] [USED_AT:${new Date().toISOString()}]`
  });
}

export async function getUserInvites(username) {
  const allConfigs = await db.entities.CloudConfig.filter({ owner_username: username });
  return (allConfigs || [])
    .filter(c => c.name.startsWith("INVITE:"))
    .map(c => {
      const code = c.name.split(":")[1];
      const dateMatch = c.content.match(/\[DATE:([^\]]+)\]/);
      const usedMatch = c.content.match(/\[USED_BY:([^\]]+)\]/);
      return {
        id: c.id,
        code,
        generated_by: username,
        created_at: dateMatch ? dateMatch[1] : new Date().toISOString(),
        used_by: usedMatch ? usedMatch[1] : null
      };
    });
}

export async function getAllInvitesAdmin() {
  const allConfigs = await db.entities.CloudConfig.filter({});
  return (allConfigs || [])
    .filter(c => c.name && c.name.startsWith("INVITE:"))
    .map(c => {
      const nameParts = c.name.split(":");
      const code = nameParts[1] || "unknown";
      const content = c.content || "";
      const genMatch = content.match(/\[GEN:([^\]]+)\]/);
      const dateMatch = content.match(/\[DATE:([^\]]+)\]/);
      const usedMatch = content.match(/\[USED_BY:([^\]]+)\]/);
      return {
        id: c.id,
        code,
        generated_by: genMatch ? genMatch[1] : 'unknown',
        created_at: dateMatch ? dateMatch[1] : new Date().toISOString(),
        used_by: usedMatch ? usedMatch[1] : null
      };
    });
}

export async function sendChatMessage(sessionId, sender, content, type = 'text') {
  const timestamp = Date.now();
  await db.entities.CloudConfig.create({
    name: `CHAT:${sessionId}:${timestamp}:${type}`,
    content: content,
    owner_username: sender
  });
}

export async function getChatMessages(sessionId) {
  const configs = await db.entities.CloudConfig.filter({});
  return (configs || [])
    .filter(c => c.name && c.name.startsWith(`CHAT:${sessionId}:`))
    .map(c => {
      const parts = c.name.split(':');
      return {
        id: c.id,
        session_id: sessionId,
        timestamp: parseInt(parts[2]) || Date.now(),
        type: parts[3] || 'text',
        sender: c.owner_username,
        content: c.content || "",
        created_at: new Date(parseInt(parts[2]) || Date.now()).toISOString()
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function getAllChats() {
  const configs = await db.entities.CloudConfig.filter({});
  const chatConfigs = (configs || []).filter(c => c.name && c.name.startsWith('CHAT:'));
  
  const sessions = {};
  chatConfigs.forEach(c => {
    const parts = c.name.split(':');
    const sessionId = parts[1];
    if (!sessionId) return;

    const timestamp = parseInt(parts[2]) || 0;
    
    if (!sessions[sessionId] || timestamp > sessions[sessionId].lastTimestamp) {
      sessions[sessionId] = {
        id: sessionId,
        lastTimestamp: timestamp,
        lastMessage: {
          sender: c.owner_username,
          content: c.content || "",
          created_at: new Date(timestamp || Date.now()).toISOString()
        }
      };
    }
  });
  
  return Object.values(sessions).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
}

export async function deleteChat(sessionId) {
  const configs = await db.entities.CloudConfig.filter({});
  const sessionConfigs = (configs || []).filter(c => c.name.startsWith(`CHAT:${sessionId}:`));
  for (const c of sessionConfigs) {
    await db.entities.CloudConfig.delete(c.id);
  }
}
