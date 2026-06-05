import { getBackendDb } from '@/lib/backend';

const db = getBackendDb();

export async function getProfileByUid(uid) {
  const rows = await db.entities.Account.filter({ unique_identifier: Number(uid) });
  return rows?.[0] || null;
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
