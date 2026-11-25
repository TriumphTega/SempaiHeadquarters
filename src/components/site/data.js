// Live numbers and covers for the public website (public rows only, cached for 10 minutes).
import { SB_URL as URL_, SB_KEY as KEY } from './supabasePublic';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const clean = (s, n = 60) => {
  const t = String(s ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

async function get(path) {
  if (!URL_ || !KEY) return [];
  try {
    const r = await fetch(`${URL_}/rest/v1/${path}`, { headers: H, next: { revalidate: 600 } });
    return r.ok ? await r.json() : [];
  } catch {
    return [];
  }
}

async function count(table, filter = '') {
  if (!URL_ || !KEY) return null;
  try {
    const r = await fetch(`${URL_}/rest/v1/${table}?select=id${filter}`, {
      method: 'HEAD',
      headers: { ...H, Prefer: 'count=exact', Range: '0-0' },
      next: { revalidate: 600 },
    });
    const n = Number((r.headers.get('content-range') || '').split('/')[1]);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export async function siteData() {
  const [novels, manga, books, nUsers, nNovels, nManga] = await Promise.all([
    get('novels?select=id,title,image,users(name)&image=not.is.null&order=viewers_count.desc.nullslast&limit=14'),
    get('manga?select=id,title,cover_image,author&cover_image=not.is.null&order=created_at.desc&limit=10'),
    get('bazaar_books?select=id,title,cover_url,author_name&status=eq.active&cover_url=not.is.null&order=created_at.desc&limit=8'),
    count('users'),
    count('novels'),
    count('manga'),
  ]);
  const titles = [
    ...novels.map((n) => ({ kind: 'novel', id: n.id, title: clean(n.title, 42), cover: n.image, by: n.users?.name && !BASE58.test(n.users.name) ? clean(n.users.name, 28) : null })),
    ...manga.map((m) => ({ kind: 'manga', id: m.id, title: clean(m.title, 42), cover: m.cover_image, by: m.author && !BASE58.test(m.author) ? clean(m.author, 28) : null })),
  ].filter((t) => t.cover);
  return {
    titles,
    books: books.map((b) => ({ id: b.id, title: clean(b.title, 40), cover: b.cover_url, by: clean(b.author_name, 28) || null })),
    stats: { users: nUsers, novels: nNovels, manga: nManga },
  };
}

export { APP, APK, X_URL } from './links';
