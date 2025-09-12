"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./ZenCarousel.module.css";

/**
 * ZenCarousel
 * A handcrafted carousel with mature Japanese aesthetics:
 * - 3D depth on active slide
 * - Ink-paper noise overlay
 * - Torii-inspired indicators
 * - Swipe on touch devices; arrows on desktop
 *
 * Usage:
 * <ZenCarousel interval={3000}>
 *   {slides}
 * </ZenCarousel>
 */
export default function ZenCarousel({ children, interval = 3500, className = "" }) {
  const slides = useMemo(() => React.Children.toArray(children).filter(Boolean), [children]);
  const [index, setIndex] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const [slidesPerView, setSlidesPerView] = useState(3);
  const touchStart = useRef(null);
  const touchDeltaX = useRef(0);
  const rootRef = useRef(null);
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const slideRefs = useRef([]);
  const timerRef = useRef(null);

  const count = slides.length;

  const goTo = (i) => setIndex(((i % count) + count) % count);
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // Measure and center the active slide
  const recalc = () => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const active = slideRefs.current[index];
    if (!viewport || !track || !active) return;

    const viewportWidth = viewport.clientWidth;
    const trackWidth = track.scrollWidth;
    const activeCenter = active.offsetLeft + active.offsetWidth / 2;
    let target = Math.max(0, activeCenter - viewportWidth / 2);
    const maxTranslate = Math.max(0, trackWidth - viewportWidth);
    target = Math.min(target, maxTranslate);
    setTranslateX(target);
  };

  useEffect(() => {
    recalc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, count, children]);

  useEffect(() => {
    const computeVisible = () => {
      const w = typeof window !== 'undefined' ? window.innerWidth : 1400;
      if (w < 768) return 1;
      if (w < 1024) return 2;
      return 3;
    };
    const onResize = () => {
      setSlidesPerView(computeVisible());
      recalc();
    };
    setSlidesPerView(computeVisible());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (count <= 1) return; // no autoplay with one or zero
    clearInterval(timerRef.current);
    timerRef.current = setInterval(next, Math.max(1500, interval));
    return () => clearInterval(timerRef.current);
  }, [index, interval, count]);

  const onTouchStart = (e) => {
    const t = e.touches?.[0];
    if (!t) return;
    touchStart.current = { x: t.clientX, y: t.clientY };
    touchDeltaX.current = 0;
    clearInterval(timerRef.current);
  };

  const onTouchMove = (e) => {
    if (!touchStart.current) return;
    const t = e.touches?.[0];
    if (!t) return;
    touchDeltaX.current = t.clientX - touchStart.current.x;
  };

  const onTouchEnd = () => {
    if (!touchStart.current) return;
    const dx = touchDeltaX.current;
    touchStart.current = null;
    if (Math.abs(dx) > 40) {
      if (dx < 0) next(); else prev();
    }
  };

  // Keyboard accessibility
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    const el = rootRef.current;
    el?.addEventListener("keydown", onKey);
    return () => el?.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`${styles.carouselRoot} ${className}`} ref={rootRef} tabIndex={0}>
      <div
        className={styles.viewport}
        ref={viewportRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className={styles.track}
          ref={trackRef}
          style={{ transform: `translate3d(${-translateX}px, 0, 0)` }}
        >
          {slides.map((node, i) => (
            <div
              key={i}
              className={`${styles.slide} ${i === index ? styles.slideActive : ""}`}
              ref={(el) => (slideRefs.current[i] = el)}
              style={{ flex: `0 0 ${100 / Math.min(slidesPerView, slides.length)}%` }}
            >
              <div className={styles.slideContent}>
                <div className={styles.paperInk} />
                {node}
              </div>
            </div>
          ))}
        </div>
        {count > 1 && (
          <div className={styles.controls}>
            <button aria-label="Previous" className={styles.arrow} onClick={prev}>❮</button>
            <button aria-label="Next" className={styles.arrow} onClick={next}>❯</button>
          </div>
        )}
      </div>
      {count > 1 && (
        <div className={styles.indicators}>
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              className={`${styles.dot} ${i === index ? styles.dotActive : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
