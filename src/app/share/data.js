// Public data for share cards and link previews (novel / manga, optionally a chapter).
// Uses the public (anon) key: these rows are readable by guests anyway.
import { SB_URL as URL_, SB_KEY as KEY } from '../../components/site/supabasePublic';

export const APP_ORIGIN = 'https://app.sempaihq.com';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (s, n = 140) => {
  const t = String(s ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

async function rest(path) {
  if (!URL_ || !KEY) return null;
  try {
    const r = await fetch(`${URL_}/rest/v1/${path}`, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
      next: { revalidate: 300 },
    });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j) ? j[0] ?? null : j;
  } catch {
    return null;
  }
}

/**
 * kind: 'novel' | 'manga'; id: title id; chapter: novel chapter index or manga chapter id (optional).
 * Returns { kind, title, cover, author, chapterLabel, chapterTitle, path } or null.
 */
export async function shareInfo(kind, id, chapter) {
  if (!UUID.test(String(id || ''))) return null;
  if (kind === 'novel') {
    const n = await rest(`novels?select=id,title,image,chaptertitles,users(name)&id=eq.${id}`);
    if (!n) return null;
    const idx = chapter != null && /^\d+$/.test(String(chapter)) ? Number(chapter) : null;
    const author = n.users?.name && !BASE58.test(n.users.name) ? n.users.name : null;
    return {
      kind,
      title: clean(n.title, 90),
      cover: n.image || null,
      author: author ? clean(author, 40) : null,
      chapterLabel: idx != null ? `Chapter ${idx + 1}` : null,
      chapterTitle: idx != null ? clean(n.chaptertitles?.[idx], 90) || null : null,
      path: idx != null ? `/novel/${id}/chapter/${idx}` : `/novel/${id}`,
    };
  }
  if (kind === 'manga') {
    const m = await rest(`manga?select=id,title,cover_image,author&id=eq.${id}`);
    if (!m) return null;
    let ch = null;
    if (chapter && UUID.test(String(chapter))) ch = await rest(`manga_chapters?select=id,title,chapter_number&id=eq.${chapter}`);
    return {
      kind,
      title: clean(m.title, 90),
      cover: m.cover_image || null,
      author: m.author && !BASE58.test(m.author) ? clean(m.author, 40) : null,
      chapterLabel: ch ? `Chapter ${ch.chapter_number}` : null,
      chapterTitle: ch ? clean(ch.title, 90) || null : null,
      path: ch ? `/manga/${id}/chapter/${ch.id}` : `/manga/${id}`,
    };
  }
  return null;
}
