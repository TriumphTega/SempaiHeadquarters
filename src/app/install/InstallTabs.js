'use client';
// Device picker + step-by-step install guide. Picks the visitor's device automatically.
import { useEffect, useState } from 'react';
import { APP, APK } from '../../components/site/links';

const GUIDES = {
  iphone: {
    label: 'iPhone & iPad',
    steps: [
      ['Open in Safari', 'Go to app.sempaihq.com in Safari (other browsers on iPhone can’t install apps).'],
      ['Tap Share', 'Tap the Share button — the square with an arrow — at the bottom of the screen.'],
      ['Add to Home Screen', 'Scroll down, tap “Add to Home Screen”, then “Add”. Sempai HQ now opens full screen from your Home Screen.'],
    ],
    cta: { href: APP, label: 'Open app.sempaihq.com' },
  },
  android: {
    label: 'Android',
    steps: [
      ['Download', 'Tap the button below to download the Sempai HQ app (APK).'],
      ['Allow the install', 'Open the download. If asked, allow your browser to install apps — it’s a one-time setting.'],
      ['Open & sign in', 'Open Sempai HQ and sign in with Google. Future updates install by themselves.'],
    ],
    cta: { href: APK, label: 'Download for Android', download: true },
  },
  pc: {
    label: 'PC & Mac',
    steps: [
      ['Open the web app', 'Go to app.sempaihq.com in Chrome, Edge or Brave.'],
      ['Click Install', 'Click the install icon at the right of the address bar (or Menu → “Install Sempai HQ”).'],
      ['Launch it', 'Sempai HQ opens in its own window and appears in your Start menu, Dock or launcher.'],
    ],
    cta: { href: APP, label: 'Open the web app' },
  },
};

export default function InstallTabs() {
  const [tab, setTab] = useState('iphone');
  useEffect(() => {
    const h = window.location.hash.replace('#', '');
    if (GUIDES[h]) return setTab(h);
    const ua = navigator.userAgent || '';
    if (/android/i.test(ua)) setTab('android');
    else if (/iphone|ipad|ipod|macintosh.*mobile/i.test(ua)) setTab('iphone');
    else setTab('pc');
  }, []);
  const g = GUIDES[tab];
  return (
    <div className="sx-center">
      <div className="sx-tabs" role="tablist" aria-label="Your device">
        {Object.entries(GUIDES).map(([k, v]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{v.label}</button>
        ))}
      </div>
      <div className="sx-install" key={tab}>
        {g.steps.map(([t, d], i) => (
          <div key={t} className="sx-step sx-reveal sx-in" style={{ animation: `sx-fade .6s ${i * 0.12}s both` }}>
            <h3 className="sx-display">{t}</h3>
            <p>{d}</p>
          </div>
        ))}
      </div>
      <div className="sx-hero-ctas" style={{ justifyContent: 'center', animation: 'none' }}>
        <a className="sx-btn sx-btn-primary" href={g.cta.href} {...(g.cta.download ? { download: true } : {})}>{g.cta.label}</a>
      </div>
    </div>
  );
}
