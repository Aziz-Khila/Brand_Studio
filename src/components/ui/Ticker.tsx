"use client";

import { useEffect, useRef } from "react";
import { useLenis } from "lenis/react";
import { gsap } from "@/lib/gsap";
import { useOnScreen } from "@/hooks/useOnScreen";

type Props = {
  items: string[];
  className?: string;
  /** Base speed in px per second. Scrolling speeds it up and flips its direction. */
  speed?: number;
};

const COPIES = 4;

export function Ticker({ items, className = "", speed = 42 }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(rootRef);
  const lenis = useLenis();
  const lenisRef = useRef(lenis);

  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  useEffect(() => {
    const track = trackRef.current!;
    const copy = copyRef.current!;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let x = 0;
    let direction = 1;
    // Measured on resize only: reading layout every frame would force the browser to recompute it.
    let width = copy.offsetWidth;
    const observer = new ResizeObserver(() => {
      width = copy.offsetWidth;
    });
    observer.observe(copy);

    const tick = (_time: number, deltaMs: number) => {
      if (!onScreen.current) return;
      const dt = Math.min(deltaMs / 1000, 1 / 30);
      const velocity = lenisRef.current?.velocity ?? 0;
      if (Math.abs(velocity) > 0.4) direction = velocity > 0 ? 1 : -1;
      const boost = reduced ? 0 : Math.min(Math.abs(velocity) * 16, 700);
      x -= (reduced ? speed * 0.5 : speed + boost) * direction * dt;
      if (width) x = -((((-x) % width) + width) % width);
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      observer.disconnect();
    };
  }, [speed, onScreen]);

  return (
    <div ref={rootRef} className={`flex h-[var(--ticker-h)] items-center overflow-hidden bg-ink text-on-ink ${className}`}>
      <div ref={trackRef} className="flex w-max will-change-transform">
        {Array.from({ length: COPIES }, (_, copyIndex) => (
          <div
            key={copyIndex}
            ref={copyIndex === 0 ? copyRef : undefined}
            aria-hidden={copyIndex > 0}
            className="flex shrink-0 items-center"
          >
            {items.map((item, i) => (
              <span key={i} className="eyebrow flex items-center gap-7 pr-7 text-[12px]">
                <span>{item}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" className="text-accent" aria-hidden>
                  <path d="M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z" fill="currentColor" />
                </svg>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
