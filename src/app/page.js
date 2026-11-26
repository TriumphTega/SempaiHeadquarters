// www.sempaihq.com — the public landing page. The app itself lives at app.sempaihq.com.
import SiteShell from '../components/site/SiteShell';
import '../components/site/landing.css';
import { Reveal, Faq } from '../components/site/Motion';
import { siteData, APP, APK } from '../components/site/data';
import { IconStore, IconWallet, IconUsers, IconBell, IconTrophy, IconShield, IconArrow, IconAndroid, IconApple, IconMonitor, IconCards, IconPen } from '../components/site/Icons';

export const revalidate = 600;

export const metadata = {
  title: 'Sempai HQ — Stories that pay you back',
  description: 'Read novels and manga from independent creators, earn SMP as you read, play Kaiji, and own what you love. On Android, iPhone and the web.',
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

export default async function Home() {
  const { titles, stats } = await siteData();
  const ring = titles.slice(0, 14);
  const step = ring.length ? 360 / ring.length : 30;
  const phone = titles.slice(2, 12);
  const wall = [...titles, ...titles].slice(0, 24);

  return (
    <SiteShell>
      {/* ───────────── hero: headline + 3D carousel of real covers ───────────── */}
      <section className="lx-hero">
        <div className="lx-glow" aria-hidden />
        <div className="sx-wrap">
          <span className="sx-eyebrow">Novels · Manga · Games</span>
          <h1 className="sx-display">
            <span className="sx-line"><span>Stories that</span></span>
            <span className="sx-line"><span className="sx-grad">pay you back.</span></span>
          </h1>
          <p className="lx-sub">Read independent novels and manga, earn SMP for every chapter, and back the creators you love — 70% of what you spend goes straight to them.</p>
          <div className="lx-ctas">
            <a className="sx-btn sx-btn-primary" href={APP}>Start reading <IconArrow size={18} /></a>
            <a className="sx-btn" href="/install">Get the app</a>
          </div>
          <div className="lx-trust">
            <span>First 3 chapters free</span>
            <span>Android, iPhone &amp; web</span>
            {stats.users ? <span>{stats.users.toLocaleString()}+ readers</span> : null}
          </div>
        </div>
        {ring.length ? (
          <div className="lx-ring-stage" aria-label="Titles on Sempai HQ">
            <div className="lx-ring" style={{ '--step': `${step}deg` }}>
              {ring.map((t, i) => (
                <a key={t.id} href={linkFor(t)} style={{ '--i': i }} aria-label={t.title}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={t.cover} alt="" loading={i < 6 ? 'eager' : 'lazy'} />
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <div className="lx-ticker" aria-hidden>
        <div className="lx-ticker-track">
          {[0, 1].map((k) => (
            <div key={k} style={{ display: 'flex' }}>
              {['Fantasy', 'Romance', 'Action', 'Slice of life', 'Sci-fi', 'Mystery', 'Comedy', 'Horror', 'Webcomics', 'Light novels'].map((g) => <span key={g + k}>{g}</span>)}
            </div>
          ))}
        </div>
      </div>

      {/* ───────────── how it works: numbered rows + 3D phone ───────────── */}
      <section className="lx-section" id="read">
        <div className="sx-wrap lx-how">
          <div>
            <Reveal><span className="lx-kicker">How it works</span></Reveal>
            <Reveal delay={80}><h2 className="lx-title sx-display">Read it. Earn it.<br /><span className="sx-grad">Own it.</span></h2></Reveal>
            <div className="lx-rows">
              {[
                ['01', 'Read', 'Fantasy, romance, action and more — in a reader built for your phone, that remembers where you stopped.'],
                ['02', 'Earn', 'Reading and joining in earns SMP. Top the weekly leaderboard and the rewards get bigger.'],
                ['03', 'Own', 'Badges, limited-edition books and collectibles on Solana — yours to keep, not rent.'],
              ].map(([n, t, d], i) => (
                <Reveal key={n} delay={120 + i * 90} className="lx-row"><b>{n}</b><div><h3 className="sx-display">{t}</h3><p>{d}</p></div></Reveal>
              ))}
            </div>
          </div>
          <Reveal delay={150} className="lx-phone-wrap">
            <div className="lx-phone">
              <span className="lx-phone-side" />
              <div className="lx-phone-screen">
                <div className="sx-phone-notch" />
                <div className="sx-phone-feed">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {[...phone, ...phone].map((t, i) => <img key={i} src={t.cover} alt="" loading="lazy" />)}
                </div>
                <div className="sx-phone-bar"><i /><i /><i /><i /><i /></div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────── creators: one statement ───────────── */}
      <section className="lx-section" style={{ paddingTop: 0 }}>
        <div className="sx-wrap lx-statement">
          <div>
            <Reveal><span className="lx-kicker">For writers &amp; artists</span></Reveal>
            <Reveal delay={80}><div className="lx-big" aria-label="70 percent">70<small>%</small></div></Reveal>
            <Reveal delay={140}><h2 className="lx-title sx-display" style={{ marginTop: 8 }}>goes to the creator.<br />Instantly.</h2></Reveal>
            <Reveal delay={200}><p className="lx-text">Every chapter unlock, book sale and tip is split in the same transaction — your share lands in your wallet in seconds, and every payment is on a public ledger.</p></Reveal>
            <Reveal delay={260}><div className="lx-ctas" style={{ justifyContent: 'flex-start', animation: 'none' }}><a className="sx-btn sx-btn-primary" href="/creators"><IconPen size={18} /> Publish on Sempai HQ</a></div></Reveal>
          </div>
          <Reveal delay={150}>
            <div className="lx-ledger" aria-label="Example of a creator's earnings">
              <div className="lx-ledger-head"><span>Creator wallet</span><i>Paid instantly</i></div>
              {[
                ['Chapter unlocked', '+$0.02', 'A reader unlocked an early chapter'],
                ['E-book sold', '+$0.70', 'Limited edition · copy 12 of 100'],
                ['Tip received', '+5 SKR', '“Loved this arc!”'],
              ].map(([a, b, c]) => (
                <div key={a} className="lx-tx"><b>{a}</b><em>{b}</em><small>{c}</small></div>
              ))}
              <div className="lx-ledger-foot">Example — creators see this as readers unlock, buy and tip.</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────── Kaiji ───────────── */}
      <section className="lx-section" id="play" style={{ paddingTop: 0 }}>
        <div className="sx-wrap">
          <Reveal>
            <div className="lx-band">
              <div>
                <span className="lx-kicker">Play</span>
                <h2 className="lx-title sx-display">Kaiji — mind games for real stakes.</h2>
                <p className="lx-text">A one-on-one card duel of nerve and reads. Wager SKR, challenge a friend, or enter a 24-player tournament where the top three split the pot.</p>
                <div className="lx-ctas" style={{ justifyContent: 'flex-start', animation: 'none' }}>
                  <a className="sx-btn sx-btn-primary" href={`${APP}/kaiji`}><IconCards size={18} /> Play Kaiji</a>
                </div>
              </div>
              <div className="lx-cards3d" aria-hidden>
                <div className="lx-c3 k1">ROCK</div>
                <div className="lx-c3 k2">PAPER</div>
                <div className="lx-c3 k3">SCISSORS</div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────── everything else: a list, not cards ───────────── */}
      <section className="lx-section" id="earn" style={{ paddingTop: 0 }}>
        <div className="sx-wrap">
          <Reveal><span className="lx-kicker">All in one app</span></Reveal>
          <Reveal delay={80}><h2 className="lx-title sx-display">Built for fans, end to end.</h2></Reveal>
          <div className="lx-features">
            {[
              { I: IconStore, t: 'The Bazaar', d: 'Indie e-books to buy or borrow, including numbered limited editions.' },
              { I: IconWallet, t: 'A wallet built in', d: 'Locked with your password. Swap, buy with a card, cash out USDC.' },
              { I: IconUsers, t: 'Crazy Corner', d: 'Post, reply and follow — the feed for readers and creators.' },
              { I: IconBell, t: 'Never miss a drop', d: 'Notifications for new chapters, replies, sales and games.' },
              { I: IconTrophy, t: 'Weekly leaderboards', d: 'The most dedicated readers win SMP every week.' },
              { I: IconShield, t: 'Open by default', d: 'Payments, payouts and swaps are visible on the public ledger.' },
            ].map(({ I, t, d }, i) => (
              <Reveal key={t} delay={(i % 2) * 80} className="lx-feature">
                <span className="ic"><I /></span>
                <div><h3>{t}</h3><p>{d}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── get the app ───────────── */}
      <section className="lx-section" id="get" style={{ paddingTop: 0, textAlign: 'center' }}>
        <div className="sx-wrap">
          <Reveal><span className="lx-kicker">Get Sempai HQ</span></Reveal>
          <Reveal delay={80}><h2 className="lx-title sx-display">On every screen you own.</h2></Reveal>
          <Reveal delay={140}>
            <div className="lx-platforms">
              <a className="lx-plat" href={APK} download><span className="ic"><IconAndroid size={22} /></span><span><small>Download for</small><b>Android</b></span></a>
              <a className="lx-plat" href="/install#iphone"><span className="ic"><IconApple size={22} /></span><span><small>Add to Home Screen</small><b>iPhone &amp; iPad</b></span></a>
              <a className="lx-plat" href={APP}><span className="ic"><IconMonitor size={22} /></span><span><small>Open in your browser</small><b>PC &amp; Mac</b></span></a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────── FAQ ───────────── */}
      <section className="lx-section" style={{ paddingTop: 0 }}>
        <div className="sx-wrap" style={{ maxWidth: 860 }}>
          <Reveal><span className="lx-kicker">Questions</span></Reveal>
          <Reveal delay={80}><h2 className="lx-title sx-display">Good to know.</h2></Reveal>
          <Reveal delay={120}>
            <div className="sx-faqs lx-faqs">
              <Faq q="Is Sempai HQ free?">The first 3 chapters of every novel are free. After that, reading costs just $0.0025 per page, and 70% of it goes straight to the creator. Premium early-access chapters are priced separately. You earn SMP while you read, too.</Faq>
              <Faq q="What is SMP?">Sempai HQ’s reward token on Solana. You earn it by reading and taking part, and spend it on chapters, borrowed books and more.</Faq>
              <Faq q="Do I need crypto to start?">No. Sign in with Google and the app sets up a wallet for you, locked with your own password. You can buy USDC or SOL with a card whenever you like.</Faq>
              <Faq q="How do creators get paid?">Instantly. Unlocks, sales and tips are split in the same transaction, and every payment is visible on the open ledger.</Faq>
              <Faq q="Is there an iPhone app?">The full app runs at app.sempaihq.com. Add it to your Home Screen from Safari and it opens full screen, like any other app.</Faq>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ───────────── close ───────────── */}
      <section className="lx-close">
        <div className="lx-close-wall" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {wall.map((t, i) => <img key={i} src={t.cover} alt="" loading="lazy" />)}
        </div>
        <div className="sx-wrap">
          <Reveal><h2 className="sx-display">Your next favourite story is <span className="sx-grad">waiting.</span></h2></Reveal>
          <Reveal delay={120}>
            <div className="lx-ctas" style={{ animation: 'none' }}>
              <a className="sx-btn sx-btn-primary" href={APP}>Open Sempai HQ <IconArrow size={18} /></a>
              <a className="sx-btn" href="/creators">I&apos;m a creator</a>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
