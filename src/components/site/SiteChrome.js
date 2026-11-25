'use client';
// Header + footer for the public website.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { APP, X_URL } from './links';
import { ScrollProgress } from './Motion';

const NAV = [
  { href: '/#read', label: 'Read' },
  { href: '/#earn', label: 'Earn' },
  { href: '/#play', label: 'Play' },
  { href: '/creators', label: 'Creators' },
  { href: '/install', label: 'Get the app' },
];

function ThemeToggle() {
  const [theme, setTheme] = useState('dark');
  useEffect(() => {
    setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  }, []);
  const flip = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('sempai-theme', next); } catch { /* ignore */ }
  };
  return (
    <button type="button" className="sx-icon-btn" onClick={flip} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><circle cx="12" cy="12" r="4.5" fill="currentColor" /><g stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" /></g></svg>
      ) : (
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" fill="currentColor" /></svg>
      )}
    </button>
  );
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  return (
    <>
      <ScrollProgress />
      <header className={`sx-header${scrolled ? ' sx-scrolled' : ''}`}>
        <div className="sx-header-in">
          <Link href="/" className="sx-brand" aria-label="Sempai HQ home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.jpg" alt="" width={38} height={38} />
            <span>Sempai HQ</span>
          </Link>
          <nav className="sx-nav" aria-label="Main">
            {NAV.map((n) => <Link key={n.href} href={n.href}>{n.label}</Link>)}
          </nav>
          <div className="sx-header-cta">
            <ThemeToggle />
            <a className="sx-btn sx-btn-primary sx-btn-sm" href={APP}>Open app</a>
            <button type="button" className="sx-icon-btn sx-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              <span /><span /><span />
            </button>
          </div>
        </div>
      </header>
      <div className={`sx-drawer${open ? ' sx-drawer-open' : ''}`} onClick={() => setOpen(false)}>
        <nav onClick={(e) => e.stopPropagation()} aria-label="Mobile">
          {NAV.map((n, i) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} style={{ transitionDelay: `${60 + i * 45}ms` }}>{n.label}</Link>
          ))}
          <a className="sx-btn sx-btn-primary" href={APP}>Open the app</a>
        </nav>
      </div>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="sx-footer">
      <div className="sx-footer-in">
        <div className="sx-footer-brand">
          <Link href="/" className="sx-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.jpg" alt="" width={38} height={38} />
            <span>Sempai HQ</span>
          </Link>
          <p>Novels, manga and games from independent creators — where readers earn as they read.</p>
          <a className="sx-social" href={X_URL} target="_blank" rel="noopener noreferrer" aria-label="Sempai HQ on X">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path fill="currentColor" d="M17.75 3h3.07l-6.7 7.66L22 21h-6.17l-4.83-6.32L5.47 21H2.4l7.17-8.2L2 3h6.33l4.37 5.78L17.75 3Zm-1.08 16.17h1.7L7.4 4.74H5.58l11.09 14.43Z" /></svg>
            @HomeforSempai
          </a>
        </div>
        <div className="sx-footer-cols">
          <div>
            <h4>Product</h4>
            <a href={APP}>Open the app</a>
            <Link href="/install">Install on iPhone & PC</Link>
            <Link href="/download">Android download</Link>
            <a href={`${APP}/kaiji`}>Kaiji</a>
          </div>
          <div>
            <h4>Creators</h4>
            <Link href="/creators">Why SempaiHQ</Link>
            <a href={`${APP}/apply`}>Apply as a creator</a>
            <a href={`${APP}/bazaar`}>The Bazaar</a>
            <a href={`${APP}/dao-governance`}>Open ledger</a>
          </div>
          <div>
            <h4>Company</h4>
            <Link href="/support">Support</Link>
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </div>
      <div className="sx-footer-base">© {new Date().getFullYear()} Sempai HQ. Built on Solana.</div>
    </footer>
  );
}
