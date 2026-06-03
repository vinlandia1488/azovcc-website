/**
 * Forum posts lib — uses Base44 backend if available, otherwise falls back to localStorage.
 */
import { getBackendDb } from '@/lib/backend';

const LS_KEY = 'adderall_forum_posts';

function getLocalPosts() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; }
}

function saveLocalPosts(posts) {
  localStorage.setItem(LS_KEY, JSON.stringify(posts));
}

async function tryBackend(fn, fallback) {
  try {
    return await fn();
  } catch {
    return fallback();
  }
}

export async function getPostsBySection(sectionId) {
  return tryBackend(
    async () => {
      const db = getBackendDb();
      const posts = await db.entities.ForumPost.filter({ section: sectionId });
      return (posts || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    () => {
      const all = getLocalPosts();
      return all
        .filter(p => p.section === sectionId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }
  );
}

export async function getAllPostCounts() {
  return tryBackend(
    async () => {
      const db = getBackendDb();
      const posts = await db.entities.ForumPost.list();
      const counts = {};
      (posts || []).forEach(p => {
        counts[p.section] = (counts[p.section] || 0) + 1;
      });
      return counts;
    },
    () => {
      const all = getLocalPosts();
      const counts = {};
      all.forEach(p => { counts[p.section] = (counts[p.section] || 0) + 1; });
      return counts;
    }
  );
}

export async function createPost({ section, title, body, image_url, author, is_admin }) {
  return tryBackend(
    async () => {
      const db = getBackendDb();
      return await db.entities.ForumPost.create({ section, title, body, image_url, author, is_admin });
    },
    () => {
      const all = getLocalPosts();
      const post = {
        id: `local_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        section, title, body: body || '', image_url: image_url || '',
        author, is_admin: is_admin || false,
        created_at: new Date().toISOString(),
      };
      all.unshift(post);
      saveLocalPosts(all);
      return post;
    }
  );
}

export async function deletePost(postId) {
  return tryBackend(
    async () => {
      const db = getBackendDb();
      return await db.entities.ForumPost.delete(postId);
    },
    () => {
      const all = getLocalPosts().filter(p => p.id !== postId);
      saveLocalPosts(all);
    }
  );
}

export async function uploadImage(file) {
  try {
    const db = getBackendDb();
    const { file_url } = await db.integrations.Core.UploadFile({ file });
    return file_url;
  } catch {
    // Fallback: local object URL (temporary, won't persist across sessions)
    return URL.createObjectURL(file);
  }
}
