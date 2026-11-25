'use client';
// Small motion helpers for the public website. Everything respects "reduce motion".
import { useEffect, useRef, useState } from 'react';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Fades + lifts children in when they scroll into view. `delay` in ms, `as` element tag. */
export function Reveal({ children, delay = 0, className = '', as: Tag = 'div', style }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (reduced()) return setShown(true);
    const el = ref.current;
    if (!el) return undefined;
    let done = false;
    const show = () => {
      if (done) return;
      done = true;
      setShown(true);
      io.disconnect();
      window.removeEventListener('scroll', check);
    };
    // Also catches fast scrolls / anchor jumps that skip past without an intersection event.
    const check = () => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) show();
    };
    const io = new IntersectionObserver(([e]) => e.isIntersecting && show(), { rootMargin: '0px 0px -6% 0px', threshold: 0 });
    io.observe(el);
    window.addEventListener('scroll', check, { passive: true });
    const t = setTimeout(check, 60);
    return () => { clearTimeout(t); io.disconnect(); window.removeEventListener('scroll', check); };
  }, []);
  return (
    <Tag ref={ref} className={`${className} sx-reveal${shown ? ' sx-in' : ''}`} style={{ ...style, transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

/** Counts up to `value` when visible. */
export function CountUp({ value, suffix = '', duration = 1600 }) {
  const ref = useRef(null);
  const [n, setN] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    if (reduced()) return setN(target);
    const el = ref.current;
    if (!el) return undefined;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / duration);
        setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);
  const fmt = n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${(n / 1e3).toFixed(1)}k` : n.toLocaleString();
  return <span ref={ref}>{fmt}{suffix}</span>;
}

/** A card with a soft spotlight that follows the pointer and a gentle 3D tilt. */
export function Spotlight({ children, className = '', tilt = 6, href, target }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el || reduced()) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${x * 100}%`);
    el.style.setProperty('--my', `${y * 100}%`);
    el.style.transform = `perspective(900px) rotateX(${(0.5 - y) * tilt}deg) rotateY(${(x - 0.5) * tilt}deg) translateY(-4px)`;
  };
  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = '';
  };
  const props = { ref, className: `${className} sx-spot`, onPointerMove: onMove, onPointerLeave: onLeave };
  return href ? (
    <a {...props} href={href} target={target} rel={target ? 'noopener noreferrer' : undefined}>{children}</a>
  ) : (
    <div {...props}>{children}</div>
  );
}

/** Thin progress bar along the top of the page. */
export function ScrollProgress() {
  const ref = useRef(null);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
      if (ref.current) ref.current.style.transform = `scaleX(${p})`;
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return <div ref={ref} className="sx-progress" aria-hidden />;
}

/** Hero parallax: moves layers with the pointer / scroll. */
export function Parallax({ children, className = '', depth = 18 }) {
  const ref = useRef(null);
  useEffect(() => {
    if (reduced()) return undefined;
    const el = ref.current;
    const move = (e) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      if (el) el.style.transform = `translate3d(${x * depth}px, ${y * depth}px, 0)`;
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, [depth]);
  return <div ref={ref} className={className} style={{ transition: 'transform 0.4s cubic-bezier(.2,.7,.2,1)' }}>{children}</div>;
}

/** FAQ item with an animated open/close. */
export function Faq({ q, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`sx-faq${open ? ' sx-open' : ''}`}>
      <button type="button" className="sx-faq-q" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span>{q}</span>
        <span className="sx-faq-icon" aria-hidden>+</span>
      </button>
      <div className="sx-faq-a"><div>{children}</div></div>
    </div>
  );
}
