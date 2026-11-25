// www.sempaihq.com — the public landing page. The app itself lives at app.sempaihq.com.
import SiteShell, { Aura } from '../components/site/SiteShell';
import { Reveal, CountUp, Spotlight, Parallax, Faq } from '../components/site/Motion';
import { siteData, APP, APK } from '../components/site/data';
import {
  IconBook, IconCoins, IconGem, IconCards, IconStore, IconWallet, IconPen, IconBell, IconShield,
  IconBolt, IconArrow, IconAndroid, IconApple, IconMonitor, IconGlobe, IconUsers, IconTrophy,
} from '../components/site/Icons';

export const revalidate = 600;

export const metadata = {
  title: 'Sempai HQ — Stories that pay you back',
  description: 'Read novels and manga from independent creators, earn SMP as you read, play Kaiji, and own what you love. Free on Android, iPhone and the web.',
  alternates: { canonical: 'https://www.sempaihq.com' },
  openGraph: {
    title: 'Sempai HQ — Stories that pay you back',
    description: 'Novels, manga and games from independent creators — where readers earn as they read.',
    url: 'https://www.sempaihq.com',
    siteName: 'Sempai HQ',
    images: ['https://www.sempaihq.com/images/sempaiCard.png?v=3'],
    type: 'website',
  },
  twitter: { card: 'summary_large_image', site: '@HomeforSempai', title: 'Sempai HQ — Stories that pay you back', images: ['https://www.sempaihq.com/images/sempaiCard.png?v=3'] },
};

const linkFor = (t) => `${APP}/${t.kind}/${t.id}`;

function Cover({ t }) {
  return (
    <a className="sx-cover" href={linkFor(t)} aria-label={`${t.title}${t.by ? ` by ${t.by}` : ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={t.cover} alt="" loading="lazy" />
      <span className="sx-tag">{t.kind === 'manga' ? 'MANGA' : 'NOVEL'}</span>
      <span className="sx-cover-meta"><b>{t.title}</b>{t.by ? <small>by {t.by}</small> : null}</span>
    </a>
  );
}

export default async function Home() {
  const { titles, books, stats } = await siteData();
  const rowA = titles.filter((_, i) => i % 2 === 0);
  const rowB = titles.filter((_, i) => i % 2 === 1);
  const phone = titles.slice(0, 8);
  const [f1, f2, f3] = titles.slice(8, 11).length === 3 ? titles.slice(8, 11) : titles.slice(0, 3);

  return (
    <SiteShell>
      {/* ───────────────────────── hero ───────────────────────── */}
      <section className="sx-hero">
        <Aura grid />
        <div className="sx-wrap sx-hero-grid">
          <div>
            <span className="sx-eyebrow">Read · Earn · Own</span>
            <h1 className="sx-display">
              <span className="sx-line"><span>Stories that</span></span>
              <span className="sx-line"><span className="sx-grad">pay you back.</span></span>
            </h1>
            <p className="sx-lead">
              Novels, manga and games from independent creators. Every chapter you read earns you SMP, every coin you spend goes mostly to the people who made it.
            </p>
            <div className="sx-hero-ctas">
              <a className="sx-btn sx-btn-primary" href={APP}>Start reading free <IconArrow size={18} /></a>
              <a className="sx-btn" href="/install"><IconPhone2 /> Get the app</a>
            </div>
            <div className="sx-hero-note">
              <span>No card needed</span><span>Android, iPhone & web</span><span>Wallet built in</span>
            </div>
          </div>

          <Parallax depth={22}>
            <div className="sx-stage">
              {f1 ? <div className="sx-float-card f1">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={f1.cover} alt="" /></div> : null}
              {f2 ? <div className="sx-float-card f2">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={f2.cover} alt="" /></div> : null}
              {f3 ? <div className="sx-float-card f3">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={f3.cover} alt="" /></div> : null}
              <div className="sx-phone">
                <div className="sx-phone-screen">
                  <div className="sx-phone-notch" />
                  <div className="sx-phone-feed">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {[...phone, ...phone].map((t, i) => <img key={i} src={t.cover} alt="" />)}
                  </div>
                  <div className="sx-phone-bar"><i /><i /><i /><i /><i /></div>
                </div>
              </div>
              <div className="sx-chip-float c1"><span className="sx-coin">S</span><span>+250 <b>SMP</b> for reading</span></div>
              <div className="sx-chip-float c2"><span className="sx-coin" style={{ background: 'radial-gradient(circle at 35% 30%, #c4b5fd, #8b5cf6 55%, #4c1d95)' }}>✦</span><span>Creators keep <b>70%</b></span></div>
            </div>
          </Parallax>
        </div>
      </section>

      {/* ───────────────────────── library wall ───────────────────────── */}
      <section id="read" style={{ position: 'relative', paddingBottom: 40 }}>
        <div className="sx-wrap sx-center">
          <Reveal><span className="sx-eyebrow">The library</span></Reveal>
          <Reveal delay={80}><h2 className="sx-h2 sx-display">Fresh drops, <span className="sx-grad">every day.</span></h2></Reveal>
          <Reveal delay={160}><p className="sx-lead">Hand-written novels and hand-drawn manga from creators around the world. Tap any cover to start reading.</p></Reveal>
        </div>
        <div style={{ marginTop: 50, display: 'grid', gap: 18 }}>
          {rowA.length ? <div className="sx-marquee"><div className="sx-marquee-track">{[...rowA, ...rowA].map((t, i) => <Cover key={`a${i}`} t={t} />)}</div></div> : null}
          {rowB.length ? <div className="sx-marquee rev"><div className="sx-marquee-track">{[...rowB, ...rowB].map((t, i) => <Cover key={`b${i}`} t={t} />)}</div></div> : null}
        </div>
        <div className="sx-wrap">
          <div className="sx-stats">
            {[
              { n: stats.users, l: 'Readers & creators' },
              { n: stats.novels, l: 'Novels' },
              { n: stats.manga, l: 'Manga series' },
              { n: 70, l: 'Of every sale to the creator', s: '%' },
            ].filter((x) => x.n != null).map((x, i) => (
              <Reveal key={x.l} delay={i * 90} className="sx-stat"><strong><CountUp value={x.n} suffix={x.s || '+'} /></strong><span>{x.l}</span></Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── three pillars ───────────────────────── */}
      <section className="sx-section" id="earn">
        <div className="sx-wrap">
          <div className="sx-center">
            <Reveal><span className="sx-eyebrow">How it works</span></Reveal>
            <Reveal delay={80}><h2 className="sx-h2 sx-display">Read it. Earn it. <span className="sx-grad">Own it.</span></h2></Reveal>
          </div>
          <div className="sx-cards">
            {[
              { I: IconBook, t: 'Read', d: 'Thousands of chapters across fantasy, romance, action and more — in a reader built for phones, with offline drafts and reading history.' },
              { I: IconCoins, t: 'Earn', d: 'Reading, commenting and finishing chapters earns SMP. Climb the weekly leaderboard for bigger rewards — paid straight to your wallet.' },
              { I: IconGem, t: 'Own', d: 'Collect badges, limited-edition books and collectibles on Solana. What you buy is yours — not a licence that disappears.' },
            ].map(({ I, t, d }, i) => (
              <Reveal key={t} delay={i * 120}>
                <Spotlight className="sx-card">
                  <div className="sx-orb-icon"><I /></div>
                  <h3 className="sx-display">{t}</h3>
                  <p>{d}</p>
                </Spotlight>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── creators ───────────────────────── */}
      <section className="sx-section" style={{ paddingTop: 40 }}>
        <div className="sx-wrap sx-split">
          <Reveal>
            <span className="sx-eyebrow">For creators</span>
            <h2 className="sx-h2 sx-display">Your story. <span className="sx-grad">Your money.</span></h2>
            <p className="sx-lead">Publish novels and manga, sell e-books in the Bazaar, and get paid in seconds — not months.</p>
            <ul className="sx-list">
              <li>70% of every chapter unlock and book sale goes straight to your wallet</li>
              <li>Write anywhere — the studio keeps drafts on your phone, even offline</li>
              <li>Readers get a phone notification the moment you publish</li>
              <li>Every payment is public on the open ledger — nothing hidden</li>
            </ul>
            <div className="sx-hero-ctas" style={{ animation: 'none' }}>
              <a className="sx-btn sx-btn-primary" href="/creators">Why creators choose us <IconArrow size={18} /></a>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="sx-visual">
              <div className="sx-ring" />
              {[
                ['Chapter 41 unlocked', 'The Chronos Ledger', '+$0.02'],
                ['E-book sold', 'Bazaar · limited edition', '+$0.70'],
                ['Tip from a reader', 'Sweethearts · Season 1', '+5 SKR'],
                ['Chapter 12 unlocked', 'Rising Water', '+$0.02'],
              ].map(([a, b, c]) => (
                <div key={a + b} className="sx-earn-row">
                  <span className="sx-orb-icon" style={{ width: 42, height: 42 }}><IconCoins size={18} /></span>
                  <div><div style={{ fontWeight: 800 }}>{a}</div><small>{b}</small></div>
                  <b>{c}</b>
                </div>
              ))}
              <p style={{ color: 'var(--ink3)', fontSize: 14, marginTop: 14 }}>Example of what a creator sees as readers unlock, buy and tip.</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────── kaiji ───────────────────────── */}
      <section className="sx-section" id="play">
        <div className="sx-wrap sx-split flip">
          <Reveal>
            <span className="sx-eyebrow">Play</span>
            <h2 className="sx-h2 sx-display">Kaiji. <span className="sx-grad">Mind games for real stakes.</span></h2>
            <p className="sx-lead">A 1-v-1 card duel of nerve and reads. Wager SKR, challenge a friend, or enter a 24-player knockout tournament — the top three split the prize pool.</p>
            <ul className="sx-list">
              <li>Quick matches, open challenges and tournaments</li>
              <li>Escrowed stakes, paid out automatically on-chain</li>
              <li>Practice free against the computer first</li>
            </ul>
            <div className="sx-hero-ctas" style={{ animation: 'none' }}>
              <a className="sx-btn sx-btn-primary" href={`${APP}/kaiji`}><IconCards size={18} /> Play Kaiji</a>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="sx-visual"><div className="sx-kaiji"><div className="sx-kcard">ROCK</div><div className="sx-kcard">PAPER</div><div className="sx-kcard">SCISSORS</div></div></div>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────── everything else ───────────────────────── */}
      <section className="sx-section" style={{ paddingTop: 40 }}>
        <div className="sx-wrap">
          <div className="sx-center">
            <Reveal><span className="sx-eyebrow">All in one app</span></Reveal>
            <Reveal delay={80}><h2 className="sx-h2 sx-display">Everything a fan needs.</h2></Reveal>
          </div>
          <div className="sx-cards">
            {[
              { I: IconStore, t: 'The Bazaar', d: 'Indie e-books to buy or borrow — limited editions with numbered copies.' },
              { I: IconWallet, t: 'Built-in wallet', d: 'A Solana wallet locked with your password. Swap, buy with a card, cash out USDC.' },
              { I: IconUsers, t: 'Crazy Corner', d: 'Post, reply and follow — the community feed for readers and creators.' },
              { I: IconBell, t: 'Never miss a drop', d: 'Push notifications for new chapters, replies, sales and Kaiji games.' },
              { I: IconTrophy, t: 'Leaderboards', d: 'Weekly reading rankings with SMP prizes for the top readers.' },
              { I: IconShield, t: 'Open by default', d: 'Every payment, payout and swap is shown on the public ledger.' },
            ].map(({ I, t, d }, i) => (
              <Reveal key={t} delay={(i % 3) * 110}>
                <Spotlight className="sx-card">
                  <div className="sx-orb-icon"><I /></div>
                  <h3 className="sx-display" style={{ fontSize: 24 }}>{t}</h3>
                  <p>{d}</p>
                </Spotlight>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── bazaar strip ───────────────────────── */}
      {books.length ? (
        <section style={{ paddingBottom: 60 }}>
          <div className="sx-wrap sx-center">
            <Reveal><h2 className="sx-h2 sx-display" style={{ fontSize: 'clamp(30px,4vw,46px)' }}>New in the <span className="sx-grad">Bazaar</span></h2></Reveal>
          </div>
          <div className="sx-marquee" style={{ marginTop: 34 }}>
            <div className="sx-marquee-track">
              {[...books, ...books, ...books].map((b, i) => (
                <a key={i} className="sx-cover" href={`${APP}/bazaar/${b.id}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.cover} alt="" loading="lazy" />
                  <span className="sx-tag">E-BOOK</span>
                  <span className="sx-cover-meta"><b>{b.title}</b>{b.by ? <small>by {b.by}</small> : null}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ───────────────────────── get the app ───────────────────────── */}
      <section className="sx-section" id="get">
        <div className="sx-wrap">
          <div className="sx-center">
            <Reveal><span className="sx-eyebrow">Get Sempai HQ</span></Reveal>
            <Reveal delay={80}><h2 className="sx-h2 sx-display">On every screen you own.</h2></Reveal>
          </div>
          <div className="sx-steps" style={{ counterReset: 'none' }}>
            {[
              { I: IconAndroid, t: 'Android', d: 'Download the app and install it — updates arrive automatically.', href: APK, cta: 'Download APK' },
              { I: IconApple, t: 'iPhone & iPad', d: 'Open app.sempaihq.com in Safari, tap Share, then “Add to Home Screen”.', href: '/install#iphone', cta: 'How to install' },
              { I: IconMonitor, t: 'PC & Mac', d: 'Open the web app in Chrome or Edge and click “Install” in the address bar.', href: APP, cta: 'Open web app' },
            ].map(({ I, t, d, href, cta }, i) => (
              <Reveal key={t} delay={i * 120}>
                <Spotlight className="sx-card" href={href}>
                  <div className="sx-orb-icon"><I /></div>
                  <h3 className="sx-display">{t}</h3>
                  <p>{d}</p>
                  <p style={{ color: 'var(--accent)', fontWeight: 800, marginTop: 18, display: 'flex', alignItems: 'center', gap: 8 }}>{cta} <IconArrow size={16} /></p>
                </Spotlight>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────────────── FAQ ───────────────────────── */}
      <section className="sx-section" style={{ paddingTop: 20 }}>
        <div className="sx-wrap">
          <div className="sx-center">
            <Reveal><span className="sx-eyebrow">Questions</span></Reveal>
            <Reveal delay={80}><h2 className="sx-h2 sx-display">Good to know.</h2></Reveal>
          </div>
          <Reveal delay={120}>
            <div className="sx-faqs">
              <Faq q="Is Sempai HQ free?">Yes. Most chapters are free to read, and you earn SMP while you read. Some chapters are early-access — you can unlock them for a couple of cents and 70% goes to the creator.</Faq>
              <Faq q="What is SMP?">SMP is Sempai HQ’s reward token on Solana. You earn it by reading and taking part, and you can use it to unlock chapters, borrow books and more.</Faq>
              <Faq q="Do I need crypto to start?">No. Sign in with Google and the app creates a wallet for you, locked with your own password. Buy USDC or SOL with a card any time from Ramp.</Faq>
              <Faq q="How do creators get paid?">Instantly. Chapter unlocks, e-book sales and tips land in the creator’s wallet in the same transaction, and every payment is visible on the open ledger.</Faq>
              <Faq q="Is there an iPhone app?">The full app runs at app.sempaihq.com — add it to your Home Screen from Safari and it opens full screen like any other app.</Faq>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────────────────── CTA ───────────────────────── */}
      <section style={{ padding: '20px 0 40px' }}>
        <div className="sx-wrap">
          <Reveal>
            <div className="sx-cta-band">
              <div className="sx-aura" aria-hidden><div className="sx-orb o2" /><div className="sx-orb o3" /></div>
              <div style={{ position: 'relative' }}>
                <h2 className="sx-display">Your next favourite story is waiting.</h2>
                <p>Join the readers and creators building the home for independent stories.</p>
                <div className="sx-hero-ctas" style={{ justifyContent: 'center', animation: 'none' }}>
                  <a className="sx-btn" href={APP}><IconBolt size={18} /> Open Sempai HQ</a>
                  <a className="sx-btn sx-ghost" href="/creators"><IconPen size={18} /> I&apos;m a creator</a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}

function IconPhone2() {
  return <IconGlobe size={18} />;
}
