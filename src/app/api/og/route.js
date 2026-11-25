// Share card image (1200×630) for a novel / manga or one of its chapters.
//   /api/og?kind=novel&id=<uuid>&ch=<index>      /api/og?kind=manga&id=<uuid>&ch=<chapter uuid>
import { ImageResponse } from '@vercel/og';
import { shareInfo } from '../../share/data';

export const runtime = 'edge';

const ORANGE = '#F36316';
const LOGO = 'https://www.sempaihq.com/images/logo.jpg';

// Download the cover once and hand the bytes to the renderer — but only if it's an image the
// renderer can draw (some old uploads are not images at all).
async function usableCover(url) {
  if (!url) return null;
  try {
    const r = await fetch(url);
    if (!r.ok || !/^image\/(png|jpe?g|gif)/i.test(r.headers.get('content-type') || '')) return null;
    return await r.arrayBuffer();
  } catch {
    return null;
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind') === 'manga' ? 'manga' : 'novel';
  const info = await shareInfo(kind, searchParams.get('id'), searchParams.get('ch'));
  if (info) info.cover = await usableCover(info.cover);
  const title = info?.title || 'Stories that pay you back';
  const eyebrow = info ? `${kind === 'manga' ? 'MANGA' : 'NOVEL'}${info.chapterLabel ? ` · ${info.chapterLabel.toUpperCase()}` : ''}` : 'SEMPAI HQ';
  const sub = info?.chapterTitle || (info ? (info.author ? `by ${info.author}` : '') : 'Read novels & manga from independent creators — and earn.');

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: '#0B0B14', fontFamily: 'sans-serif' }}>
        {/* Smooth glows only (no full-bleed photo behind the card): keeps the PNG small so X loads it fast. */}
        <div style={{ position: 'absolute', top: -180, right: -140, width: 620, height: 620, borderRadius: 620, display: 'flex', background: 'radial-gradient(circle, rgba(243,99,22,0.42), rgba(243,99,22,0) 70%)' }} />
        <div style={{ position: 'absolute', bottom: -260, left: -160, width: 640, height: 640, borderRadius: 640, display: 'flex', background: 'radial-gradient(circle, rgba(139,92,246,0.28), rgba(139,92,246,0) 70%)' }} />

        <div style={{ display: 'flex', width: '100%', height: '100%', padding: '64px 70px', alignItems: 'center', gap: 56 }}>
          {info?.cover ? (
            <div style={{ display: 'flex', width: 320, height: 470, borderRadius: 34, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.18)', boxShadow: '0 30px 80px rgba(0,0,0,0.6)', flexShrink: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={info.cover} alt="" width={320} height={470} style={{ width: 320, height: 470, objectFit: 'cover' }} />
            </div>
          ) : null}

          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
            <div style={{ display: 'flex', alignSelf: 'flex-start', padding: '10px 22px', borderRadius: 999, background: ORANGE, color: '#fff', fontSize: 24, fontWeight: 800, letterSpacing: 3 }}>
              {eyebrow}
            </div>
            <div style={{ display: 'flex', marginTop: 26, color: '#fff', fontSize: title.length > 40 ? 58 : 70, fontWeight: 800, lineHeight: 1.08 }}>{title}</div>
            {sub ? <div style={{ display: 'flex', marginTop: 20, color: 'rgba(255,255,255,0.78)', fontSize: 32, lineHeight: 1.3 }}>{sub}</div> : null}
            {info?.chapterTitle && info?.author ? <div style={{ display: 'flex', marginTop: 12, color: 'rgba(255,255,255,0.55)', fontSize: 26 }}>by {info.author}</div> : null}

            <div style={{ display: 'flex', alignItems: 'center', marginTop: 46, gap: 16 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO} alt="" width={64} height={64} style={{ width: 64, height: 64, borderRadius: 64, border: `3px solid ${ORANGE}` }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', color: '#fff', fontSize: 30, fontWeight: 800 }}>Read it on Sempai HQ</div>
                <div style={{ display: 'flex', color: ORANGE, fontSize: 24, fontWeight: 700 }}>app.sempaihq.com</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800' } },
  );
}
