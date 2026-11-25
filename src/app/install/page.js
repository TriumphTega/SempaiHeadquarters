// www.sempaihq.com/install — how to get Sempai HQ on every device.
import SiteShell, { Aura } from '../../components/site/SiteShell';
import { Reveal } from '../../components/site/Motion';
import InstallTabs from './InstallTabs';

export const metadata = {
  title: 'Get the app — Sempai HQ',
  description: 'Install Sempai HQ on Android, iPhone, iPad, PC or Mac.',
};

export default function Install() {
  return (
    <SiteShell>
      <section className="sx-page-hero">
        <Aura grid />
        <div className="sx-wrap" style={{ position: 'relative' }}>
          <Reveal><span className="sx-eyebrow">Get the app</span></Reveal>
          <Reveal delay={80}><h1 className="sx-display">Sempai HQ, <span className="sx-grad">everywhere.</span></h1></Reveal>
          <Reveal delay={160}><p className="sx-lead" style={{ margin: '20px auto 0' }}>One account, every device. Pick yours and follow three quick steps.</p></Reveal>
          <InstallTabs />
        </div>
      </section>
    </SiteShell>
  );
}
