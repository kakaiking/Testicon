"use client";

import { useEffect, useRef, useState } from "react";

const TIPS = [
  "Launch locked apps in a live session booth. Report hits by severity. Cash out when they clear.",
  "Invite-only raids — if you’re here, you’re shortlisted. No public signup queue.",
  "Open the booth, accept terms, then keep Back and Report within reach the whole session.",
  "Stamp severity when you log a hit. Attach a screenshot so review can clear it faster.",
  "Sign-in often fails inside the booth. Use Open in new tab, test there, then report here.",
  "Hits pay when admins approve them — severity and evidence move payouts forward.",
  "Stay in the live session until you’re done. Closing early drops the booth context.",
  "One hit, one clear write-up. Vague reports stall review; specifics get cleared.",
  "Refresh the booth if the app stalls. Don’t leave — Report stays on the chrome.",
  "When a hit clears, the reward lands. Keep hunting the next break.",
] as const;

const INTERVAL_MS = 3000;

export function HeroTips() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [enterKey, setEnterKey] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (paused) return;

    let last = performance.now();
    let frame = 0;

    const paint = (ratio: number) => {
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${ratio})`;
      }
    };

    const step = (now: number) => {
      elapsedRef.current += now - last;
      last = now;

      if (elapsedRef.current >= INTERVAL_MS) {
        elapsedRef.current = 0;
        paint(0);
        setIndex((i) => (i + 1) % TIPS.length);
        setEnterKey((k) => k + 1);
      } else {
        paint(elapsedRef.current / INTERVAL_MS);
      }

      frame = window.requestAnimationFrame(step);
    };

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [paused]);

  const tip = TIPS[index];
  const label = String(index + 1).padStart(2, "0");

  return (
    <div
      className="hero-tips"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="hero-tips-meta" aria-hidden>
        <span className="hero-tips-label">TIP</span>
        <span className="hero-tips-index font-mono">
          {label}
          <span className="hero-tips-index-sep">/</span>
          {String(TIPS.length).padStart(2, "0")}
        </span>
      </div>

      <div className="hero-tips-stage" aria-live="polite" aria-atomic="true">
        <p
          key={enterKey}
          className={
            reducedMotion ? "hero-tips-copy" : "hero-tips-copy hero-tips-copy-enter"
          }
        >
          {tip}
        </p>
      </div>

      <div className="hero-tips-meter" aria-hidden data-paused={paused || undefined}>
        <div
          ref={barRef}
          className="hero-tips-meter-bar"
          style={{ transform: reducedMotion ? "scaleX(0)" : undefined }}
        />
      </div>
    </div>
  );
}
