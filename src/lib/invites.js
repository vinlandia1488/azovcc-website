import { getBackendDb } from "./backend";

const db = getBackendDb();

export async function isInviteSystemEnabled() {
  try {
    const settings = await db.entities.AppSetting.filter({ key: "invite_system_enabled" });
    if (settings && settings.length > 0) {
      return settings[0].value === "true";
    }
    // Default to true if not set
    return true;
  } catch (err) {
    console.error("Failed to check invite system status:", err);
    return true;
  }
}

export async function setInviteSystemEnabled(enabled) {
  const db = getBackendDb();
  const settings = await db.entities.AppSetting.filter({ key: "invite_system_enabled" });
  if (settings && settings.length > 0) {
    await db.entities.AppSetting.update(settings[0].id, { value: String(enabled) });
  } else {
    await db.entities.AppSetting.create({ key: "invite_system_enabled", value: String(enabled) });
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
    // Check if user generated a code in the last week
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const existingCodes = await db.entities.InviteCode.filter({ 
      generated_by: user.username,
      is_mod_generated: false
    });
    
    const recentCode = existingCodes.find(c => new Date(c.created_at) > oneWeekAgo);
    if (recentCode) {
      const nextAvailable = new Date(new Date(recentCode.created_at).getTime() + 7 * 24 * 60 * 60 * 1000);
      throw new Error(`You can only generate one invite code per week. Next available: ${nextAvailable.toLocaleDateString()}`);
    }
  }

  const code = generateRandomCode();
  const newInvite = await db.entities.InviteCode.create({
    code,
    generated_by: user.username,
    created_at: now.toISOString(),
    is_mod_generated: !!user.is_admin
  });

  return newInvite;
}

export async function validateInviteCode(code) {
  if (!code) throw new Error("Invite code is required");
  
  const enabled = await isInviteSystemEnabled();
  if (!enabled) return true; // System disabled, all codes valid or not needed

  const matches = await db.entities.InviteCode.filter({ code });
  if (!matches || matches.length === 0) {
    throw new Error("Invalid invite code");
  }

  const invite = matches[0];
  if (invite.used_by) {
    throw new Error("This invite code has already been used");
  }

  return invite;
}

export async function useInviteCode(code, username) {
  const matches = await db.entities.InviteCode.filter({ code });
  if (!matches || matches.length === 0) throw new Error("Invite code not found");
  
  const invite = matches[0];
  await db.entities.InviteCode.update(invite.id, {
    used_by: username,
    used_at: new Date().toISOString()
  });
}

export async function getUserInvites(username) {
  return await db.entities.InviteCode.filter({ generated_by: username });
}
