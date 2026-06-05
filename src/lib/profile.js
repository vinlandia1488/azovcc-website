import { getBackendDb } from '@/lib/backend';

const db = getBackendDb();

export async function getProfileByUid(uid) {
  const rows = await db.entities.Account.filter({ unique_identifier: Number(uid) });
  const dbProfile = rows?.[0] || null;
  if (!dbProfile) return null;

  // Merge localStorage overrides (for fields not yet in DB schema)
  try {
    const lsKey = `adderall_profile_${dbProfile.username}`;
    const local = JSON.parse(localStorage.getItem(lsKey) || '{}');
    return {
      ...dbProfile,
      profile_pic: local.profile_pic || dbProfile.profile_pic || '',
      profile_pic_position: local.profile_pic_position || dbProfile.profile_pic_position || '50% 50%',
      profile_banner: local.profile_banner || dbProfile.profile_banner || '',
      profile_banner_position: local.profile_banner_position || dbProfile.profile_banner_position || '50% 50%',
      profile_accent: local.profile_accent || dbProfile.profile_accent || '#111111',
      description: local.description || dbProfile.description || '',
    };
  } catch {
    return dbProfile;
  }
}

export async function getPostsByAuthor(username) {
  try {
    const posts = await db.entities.ForumPost.list('-created_date', 100);
    return (posts || []).filter(p => p.author === username);
  } catch {
    return [];
  }
}

export async function getProfileComments(profileUid) {
  try {
    const rows = await db.entities.ProfileComment.filter({ profile_uid: Number(profileUid) });
    return (rows || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  } catch {
    return [];
  }
}

export async function addProfileComment({ profileUid, author, authorUid, body }) {
  return await db.entities.ProfileComment.create({
    profile_uid: Number(profileUid),
    author,
    author_uid: Number(authorUid),
    body,
    created_at: new Date().toISOString(),
  });
}

export async function deleteProfileComment(commentId) {
  return await db.entities.ProfileComment.delete(commentId);
}
