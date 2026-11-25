// www.sempaihq.com/download — the Android app.
import SiteShell, { Aura } from '../../components/site/SiteShell';
import { Reveal, Spotlight } from '../../components/site/Motion';
import { APK, APP } from '../../components/site/links';
import { IconAndroid, IconApple, IconMonitor, IconArrow, IconShield, IconBolt } from '../../components/site/Icons';

export const metadata = {
  title: 'Download for Android — Sempai HQ',
  description: 'Download the Sempai HQ Android app. Read novels and manga, earn SMP, play Kaiji.',
};

export default function Download() {
  return (
    <SiteShell>
      <section className="sx-page-hero">
        <Aura grid />
        <div className="sx-wrap" style={{ position: 'relative' }}>
          <Reveal><span className="sx-eyebrow">Android · version 1.1</span></Reveal>
          <Reveal delay={80}><h1 className="sx-display">Download <span className="sx-grad">Sempai HQ</span></h1></Reveal>
          <Reveal delay={160}><p className="sx-lead" style={{ margin: '20px auto 0' }}>Install once — every new feature after that arrives automatically, no reinstall needed.</p></Reveal>
          <Reveal delay={240}>
            <div className="sx-hero-ctas" style={{ justifyContent: 'center', animation: 'none' }}>
              <a className="sx-btn sx-btn-primary" href={APK} download><IconAndroid size={20} /> Download APK</a>
              <a className="sx-btn" href="/install#android">How to install</a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="sx-section" style={{ paddingTop: 10 }}>
        <div className="sx-wrap">
          <div className="sx-cards">
            {[
              { I: IconBolt, t: 'Auto-updates', d: 'New features and fixes are delivered over the air the next time you open the app.' },
              { I: IconShield, t: 'Locked to you', d: 'Your built-in wallet is locked with your own password, with biometrics if you like.' },
              { I: IconAndroid, t: 'Android 7 and up', d: 'Works on most Android phones and tablets. Allow installs from your browser when asked.' },
            ].map(({ I, t, d }, i) => (
              <Reveal key={t} delay={i * 110}><Spotlight className="sx-card"><div className="sx-orb-icon"><I /></div><h3 className="sx-display" style={{ fontSize: 24 }}>{t}</h3><p>{d}</p></Spotlight></Reveal>
            ))}
          </div>
          <div className="sx-center" style={{ marginTop: 60 }}>
            <Reveal><h2 className="sx-h2 sx-display" style={{ fontSize: 'clamp(28px,3.6vw,40px)' }}>Not on Android?</h2></Reveal>
          </div>
          <div className="sx-cards" style={{ gridTemplateColumns: 'repeat(2, 1fr)', maxWidth: 820, margin: '30px auto 0' }}>
            <Reveal><Spotlight className="sx-card" href="/install#iphone"><div className="sx-orb-icon"><IconApple /></div><h3 className="sx-display" style={{ fontSize: 24 }}>iPhone & iPad</h3><p>Add the web app to your Home Screen from Safari.</p><p style={{ color: 'var(--accent)', fontWeight: 800, marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>See how <IconArrow size={16} /></p></Spotlight></Reveal>
            <Reveal delay={110}><Spotlight className="sx-card" href={APP}><div className="sx-orb-icon"><IconMonitor /></div><h3 className="sx-display" style={{ fontSize: 24 }}>PC & Mac</h3><p>Use it in your browser, or install it as a desktop app.</p><p style={{ color: 'var(--accent)', fontWeight: 800, marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>Open web app <IconArrow size={16} /></p></Spotlight></Reveal>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
