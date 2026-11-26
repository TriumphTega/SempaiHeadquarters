// www.sempaihq.com/creators — why writers and artists publish on Sempai HQ.
import SiteShell, { Aura } from '../../components/site/SiteShell';
import { Reveal, Spotlight, Faq } from '../../components/site/Motion';
import { APP } from '../../components/site/links';
import { IconPen, IconCoins, IconBell, IconStore, IconShield, IconBolt, IconArrow, IconUsers, IconBook } from '../../components/site/Icons';

export const metadata = {
  title: 'For creators — Sempai HQ',
  description: 'Publish novels and manga, sell e-books, and keep 70% of every sale — paid instantly to your wallet.',
  openGraph: { title: 'Publish on Sempai HQ — keep 70%, paid instantly', images: ['https://www.sempaihq.com/images/sempaiCard.png?v=3'] },
};

export default function Creators() {
  return (
    <SiteShell>
      <section className="sx-page-hero">
        <Aura grid />
        <div className="sx-wrap" style={{ position: 'relative' }}>
          <Reveal><span className="sx-eyebrow">For writers & artists</span></Reveal>
          <Reveal delay={80}><h1 className="sx-display">Get paid <span className="sx-grad">the moment</span><br />they read.</h1></Reveal>
          <Reveal delay={160}><p className="sx-lead" style={{ margin: '20px auto 0' }}>Sempai HQ is built for independent creators: you keep most of the money, you get it instantly, and your readers hear about every new chapter.</p></Reveal>
          <Reveal delay={240}>
            <div className="sx-hero-ctas" style={{ justifyContent: 'center', animation: 'none' }}>
              <a className="sx-btn sx-btn-primary" href={`${APP}/apply`}>Apply as a creator <IconArrow size={18} /></a>
              <a className="sx-btn" href={`${APP}/dao-governance`}>See the open ledger</a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="sx-section" style={{ paddingTop: 30 }}>
        <div className="sx-wrap">
          <div className="sx-stats" style={{ marginTop: 0 }}>
            {[['70%', 'of every unlock & sale'], ['Instant', 'paid in the same transaction'], ['$0', 'to publish'], ['100%', 'of tips are yours']].map(([a, b], i) => (
              <Reveal key={b} delay={i * 90} className="sx-stat"><strong>{a}</strong><span>{b}</span></Reveal>
            ))}
          </div>
          <div className="sx-cards">
            {[
              { I: IconPen, t: 'A studio in your pocket', d: 'Write chapters on your phone with a full editor. Drafts save on the device, so you can keep writing offline.' },
              { I: IconBook, t: 'Novels & manga', d: 'Publish prose chapters or upload manga pages. Your first 3 chapters are free to hook readers; after that every page read pays you, and premium early-access chapters earn more.' },
              { I: IconStore, t: 'Sell e-books', d: 'List EPUB or PDF books in the Bazaar — sell them, lend them, or release numbered limited editions.' },
              { I: IconBell, t: 'Your readers, notified', d: 'Everyone reading your work gets a phone notification when you publish. No algorithm in the way.' },
              { I: IconCoins, t: 'Tips & badges', d: 'Fans can tip you in SKR or buy your badge — and the money lands in your wallet straight away.' },
              { I: IconShield, t: 'Nothing hidden', d: 'Every unlock, sale and payout is listed on the public ledger, so you can check every cent.' },
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

      <section className="sx-section" style={{ paddingTop: 20 }}>
        <div className="sx-wrap">
          <div className="sx-center">
            <Reveal><span className="sx-eyebrow">Start in minutes</span></Reveal>
            <Reveal delay={80}><h2 className="sx-h2 sx-display">Three steps to your first reader.</h2></Reveal>
          </div>
          <div className="sx-steps">
            {[
              ['Apply', 'Tell us whether you write or draw, and share a link to your work. The team reviews every application.'],
              ['Publish', 'Open the studio, create your title and post your chapters — the first 3 are free to hook readers, the rest earn from every page read.'],
              ['Get paid', 'Every unlock pays you instantly. Watch it happen in your wallet and on the open ledger.'],
            ].map(([t, d], i) => (
              <Reveal key={t} delay={i * 120} className="sx-step"><h3 className="sx-display">{t}</h3><p>{d}</p></Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="sx-section" style={{ paddingTop: 20 }}>
        <div className="sx-wrap">
          <div className="sx-center"><Reveal><h2 className="sx-h2 sx-display">Creator questions</h2></Reveal></div>
          <Reveal delay={100}>
            <div className="sx-faqs">
              <Faq q="What does it cost to publish?">Nothing. Publishing is free. When a reader pays to unlock a chapter or buys your book, 70% goes to you and 30% keeps the platform running.</Faq>
              <Faq q="When do I get paid?">Immediately — the reader’s payment is split in the same transaction, so your share arrives in your wallet within seconds.</Faq>
              <Faq q="Do I keep the rights to my work?">Yes. You own your work. You confirm you hold the rights when you publish, and you can remove a title whenever you like.</Faq>
              <Faq q="Can I cash out to my bank?">Yes — earnings in USDC can be cashed out through Jupiter from the app’s Ramp page, with every fee shown up front.</Faq>
            </div>
          </Reveal>
        </div>
      </section>

      <section style={{ padding: '20px 0 40px' }}>
        <div className="sx-wrap">
          <Reveal>
            <div className="sx-cta-band">
              <div className="sx-aura" aria-hidden><div className="sx-orb o2" /><div className="sx-orb o3" /></div>
              <div style={{ position: 'relative' }}>
                <h2 className="sx-display">Your readers are already here.</h2>
                <p>Apply today and publish your first chapter this week.</p>
                <div className="sx-hero-ctas" style={{ justifyContent: 'center', animation: 'none' }}>
                  <a className="sx-btn" href={`${APP}/apply`}><IconBolt size={18} /> Apply now</a>
                  <a className="sx-btn sx-ghost" href={APP}><IconUsers size={18} /> Explore the app</a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </SiteShell>
  );
}
