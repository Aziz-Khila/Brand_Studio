"use client";

import { useRef, useState } from "react";
import { brand } from "@/brand";
import { gsap, useGSAP } from "@/lib/gsap";
import { useStore } from "@/components/providers/StoreProvider";
import { Logo, logoParts } from "@/components/ui/Logo";

function preloadImages(sources: string[]) {
  return Promise.all(
    sources.map(
      (src) =>
        new Promise<void>((resolve) => {
          const image = new Image();
          image.onload = image.onerror = () => resolve();
          image.src = src;
        }),
    ),
  );
}

export function Preloader() {
  const { setIntroDone, products } = useStore();
  const [done, setDone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLParagraphElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setIntroDone(true);
        setDone(true);
        return;
      }

      window.scrollTo(0, 0);
      const parts = logoParts(nameRef.current);
      const progress = { value: 0 };
      const render = () => {
        if (!counterRef.current || !barRef.current) return;
        counterRef.current.textContent = String(Math.round(progress.value)).padStart(3, "0");
        gsap.set(barRef.current, { scaleX: progress.value / 100 });
      };

      const loading = preloadImages(products.flatMap(({ colors: [color] }) => [color.images.front, color.images.back]));
      const minimum = new Promise((resolve) => gsap.delayedCall(1.6, resolve));

      const tl = gsap.timeline();
      tl.from(parts, { yPercent: 110, duration: 1.1, ease: "expo.out", stagger: 0.06 })
        .from("[data-preloader-fade]", { opacity: 0, y: 12, duration: 0.8, ease: "power3.out", stagger: 0.08 }, 0.2)
        .to(progress, { value: 86, duration: 1.6, ease: "power2.inOut", onUpdate: render }, 0);

      let cancelled = false;
      Promise.all([loading, minimum]).then(() => {
        if (cancelled) return;
        gsap
          .timeline({ onComplete: () => setDone(true) })
          .to(progress, { value: 100, duration: 0.45, ease: "power2.out", onUpdate: render })
          .to(parts, { yPercent: -110, duration: 0.8, ease: "expo.in", stagger: 0.035 }, "+=0.1")
          .to("[data-preloader-fade]", { opacity: 0, duration: 0.4 }, "<")
          .to(rootRef.current, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.1, ease: "expo.inOut" }, "-=0.25")
          .call(() => setIntroDone(true), [], "-=0.75");
      });

      return () => {
        cancelled = true;
      };
    },
    { scope: rootRef },
  );

  if (done) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[180] flex flex-col justify-between bg-ink p-5 text-on-ink md:p-8"
      style={{ clipPath: "inset(0% 0% 0% 0%)" }}
      aria-hidden
    >
      <div className="flex justify-between">
        <span data-preloader-fade className="eyebrow opacity-60">
          {brand.season}
        </span>
        <span data-preloader-fade className="eyebrow opacity-60">
          {brand.location}
        </span>
      </div>

      <p ref={nameRef} className="font-display text-center text-[clamp(72px,17vw,300px)] leading-none">
        <Logo className="w-[min(78vw,1100px)]" />
      </p>

      <div className="flex items-end justify-between gap-6">
        <span data-preloader-fade className="eyebrow max-w-[24ch] opacity-60">
          {brand.tagline}
        </span>
        <div data-preloader-fade className="flex w-[min(40vw,320px)] flex-col items-end gap-3">
          <span ref={counterRef} className="font-display text-[44px] leading-none tabular-nums">
            000
          </span>
          <span className="relative block h-px w-full bg-on-ink/20">
            <span ref={barRef} className="absolute inset-0 origin-left bg-on-ink" style={{ transform: "scaleX(0)" }} />
          </span>
        </div>
      </div>
    </div>
  );
}
