// Wraps every public-website page: fonts, styles, ambient background, header and footer.
import localFont from 'next/font/local';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './site.css';
import { SiteHeader, SiteFooter } from './SiteChrome';

const display = localFont({ src: '../../../public/fonts/Yoruka-1j9rL.ttf', variable: '--font-display', display: 'swap' });
const body = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-body', display: 'swap' });

export default function SiteShell({ children }) {
  return (
    <div className={`sx-root ${display.variable} ${body.variable}`}>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Soft drifting glow behind a section. */
export function Aura({ grid = false }) {
  return (
    <div className="sx-aura" aria-hidden>
      <div className="sx-orb o1" />
      <div className="sx-orb o2" />
      <div className="sx-orb o3" />
      {grid ? <div className="sx-grid-bg" /> : null}
      <div className="sx-noise" />
    </div>
  );
}
