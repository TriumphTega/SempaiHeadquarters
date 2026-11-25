// Link previews for shared novels / manga / chapters.
// proxy.js sends link-preview bots (X, WhatsApp, Telegram, Discord…) here so they get a title,
// description and the share card. People are sent straight on to the app.
import { shareInfo, APP_ORIGIN } from '../data';

export const revalidate = 300;

function parse(path = []) {
  // novel/<id>[/chapter/<n>]   manga/<id>[/chapter/<chapterId>]
  const [kind, id, word, ch] = path;
  if (kind !== 'novel' && kind !== 'manga') return null;
  return { kind, id, ch: word === 'chapter' ? ch : null };
}

export async function generateMetadata({ params }) {
  const { path } = await params;
  const p = parse(path);
  const info = p ? await shareInfo(p.kind, p.id, p.ch) : null;
  if (!info) return { title: 'Sempai HQ', robots: { index: false } };
  const title = info.chapterLabel
    ? `${info.title} — ${info.chapterLabel}${info.chapterTitle ? `: ${info.chapterTitle}` : ''}`
    : info.title;
  const description = `${info.kind === 'manga' ? 'Manga' : 'Novel'}${info.author ? ` by ${info.author}` : ''} on Sempai HQ — read free, earn as you read.`;
  const url = `${APP_ORIGIN}${info.path}`;
  const image = `https://www.sempaihq.com/api/og?kind=${info.kind}&id=${p.id}${p.ch != null ? `&ch=${encodeURIComponent(p.ch)}` : ''}`;
  return {
    title: `${title} · Sempai HQ`,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Sempai HQ', type: 'article', images: [{ url: image, width: 1200, height: 630, alt: title }] },
    twitter: { card: 'summary_large_image', site: '@HomeforSempai', title, description, images: [image] },
    other: { 'al:android:package': 'com.turningpointKS.sempaihq', 'al:android:app_name': 'Sempai HQ', 'al:android:url': url, 'al:web:url': url },
  };
}

export default async function SharePage({ params }) {
  const { path } = await params;
  const p = parse(path);
  const info = p ? await shareInfo(p.kind, p.id, p.ch) : null;
  const target = `${APP_ORIGIN}${info?.path || '/'}`;
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0B0B14', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <meta httpEquiv="refresh" content={`0; url=${target}`} />
      <a href={target} style={{ color: '#F36316', fontWeight: 800, fontSize: 18 }}>
        Open {info?.title || 'Sempai HQ'} →
      </a>
    </main>
  );
}
