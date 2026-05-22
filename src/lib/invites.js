import { getBackendDb } from "./backend";
import { createLicenseKeyRecord, deleteLicenseKeyRecord } from "./license-keys";

const db = getBackendDb();

// Repurposing CloudConfig for settings
// name: "SETTING:invite_system_enabled"
// content: "true" | "false"
// owner_username: "system"

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

// Repurposing LicenseKey for invites
// type: "script"
// key: "INVITE-XXXX"
// note: "[INVITE] [GEN:username] [MOD:true/false]"

export async function generateInviteCode(user) {
  if (!user) throw new Error("User not authenticated");

  const now = new Date();
  
  if (!user.is_admin) {
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const allKeys = await db.entities.LicenseKey.filter({ type: "script" });
    const userInvites = (allKeys || []).filter(k => 
      k.note?.includes(`[INVITE]`) && 
      k.note?.includes(`[GEN:${user.username}]`) &&
      !k.note?.includes(`[MOD:true]`)
    );
    
    const recentCode = userInvites.find(c => new Date(c.created_date || now) > oneWeekAgo);
    if (recentCode) {
      const nextAvailable = new Date(new Date(recentCode.created_date).getTime() + 7 * 24 * 60 * 60 * 1000);
      throw new Error(`You can only generate one invite code per week. Next available: ${nextAvailable.toLocaleDateString()}`);
    }
  }

  const code = `INVITE-${generateRandomCode()}`;
  const newInvite = await createLicenseKeyRecord({
    type: "script",
    key: code,
    script_key: code,
    note: `[INVITE] [GEN:${user.username}] [MOD:${!!user.is_admin}]`,
    used: false
  });

  return {
    ...newInvite,
    code: newInvite.key,
    generated_by: user.username,
    created_at: newInvite.created_date || now.toISOString(),
    is_mod_generated: !!user.is_admin
  };
}

export async function validateInviteCode(code) {
  if (!code) throw new Error("Invite code is required");
  
  const enabled = await isInviteSystemEnabled();
  if (!enabled) return true;

  const matches = await db.entities.LicenseKey.filter({ key: code });
  const invite = (matches || []).find(k => k.note?.includes("[INVITE]"));
  
  if (!invite) {
    throw new Error("Invalid invite code");
  }

  if (invite.used) {
    throw new Error("This invite code has already been used");
  }

  return invite;
}

export async function useInviteCode(code, username) {
  const matches = await db.entities.LicenseKey.filter({ key: code });
  const invite = (matches || []).find(k => k.note?.includes("[INVITE]"));
  if (!invite) throw new Error("Invite code not found");
  
  await db.entities.LicenseKey.update(invite.id, {
    used: true,
    used_by_username: username,
    used_at: new Date().toISOString()
  });
}

export async function getUserInvites(username) {
  const allKeys = await db.entities.LicenseKey.filter({ type: "script" });
  return (allKeys || [])
    .filter(k => k.note?.includes("[INVITE]") && k.note?.includes(`[GEN:${username}]`))
    .map(k => ({
      ...k,
      code: k.key,
      generated_by: username,
      created_at: k.created_date || new Date().toISOString()
    }));
}

// Repurposing CloudConfig for Chat
// name: "CHAT:[SESSION_ID]:[TIMESTAMP]"
// content: message text
// owner_username: sender

export async function sendChatMessage(sessionId, sender, content, type = 'text', metadata = '') {
  const timestamp = Date.now();
  await db.entities.CloudConfig.create({
    name: `CHAT:${sessionId}:${timestamp}:${type}`,
    content: content,
    owner_username: sender,
    // Store metadata in a separate config if needed, but for now we'll pack it into name if small or ignore
  });
}

export async function getChatMessages(sessionId) {
  const configs = await db.entities.CloudConfig.filter({});
  return (configs || [])
    .filter(c => c.name.startsWith(`CHAT:${sessionId}:`))
    .map(c => {
      const parts = c.name.split(':');
      return {
        id: c.id,
        session_id: sessionId,
        timestamp: parseInt(parts[2]),
        type: parts[3] || 'text',
        sender: c.owner_username,
        content: c.content,
        created_at: new Date(parseInt(parts[2])).toISOString()
      };
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

export async function getAllChats() {
  const configs = await db.entities.CloudConfig.filter({});
  const chatConfigs = (configs || []).filter(c => c.name.startsWith('CHAT:'));
  
  const sessions = {};
  chatConfigs.forEach(c => {
    const parts = c.name.split(':');
    const sessionId = parts[1];
    const timestamp = parseInt(parts[2]);
    
    if (!sessions[sessionId] || timestamp > sessions[sessionId].lastTimestamp) {
      sessions[sessionId] = {
        id: sessionId,
        lastTimestamp: timestamp,
        lastMessage: {
          sender: c.owner_username,
          content: c.content,
          created_at: new Date(timestamp).toISOString()
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
