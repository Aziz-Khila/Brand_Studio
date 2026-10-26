"use client";

import { useRef } from "react";
import { brand } from "@/brand";
import { gsap, useGSAP } from "@/lib/gsap";
import { useStore } from "@/components/providers/StoreProvider";
import { Showcase } from "@/components/showcase/Showcase";
import { Ticker } from "@/components/ui/Ticker";
import { Logo, logoParts } from "@/components/ui/Logo";

export function Hero() {
  const { introDone } = useStore();
  const sectionRef = useRef<HTMLElement>(null);
  const wordmarkRef = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      if (!introDone || !wordmarkRef.current) return;
      gsap.from(logoParts(wordmarkRef.current), {
        yPercent: 105,
        duration: 1.6,
        ease: "expo.out",
        stagger: 0.06,
        delay: 0.2,
      });
      gsap.to(wordmarkRef.current, {
        yPercent: 35,
        ease: "none",
        scrollTrigger: { trigger: sectionRef.current, start: "top top", end: "bottom top", scrub: true },
      });
    },
    { scope: sectionRef, dependencies: [introDone] },
  );

  return (
    <section ref={sectionRef} id="collection" className="relative h-[100svh] min-h-[620px] w-full overflow-hidden">
      <p
        ref={wordmarkRef}
        aria-hidden
        className={`font-display pointer-events-none absolute inset-x-0 top-[34%] select-none whitespace-nowrap text-center text-[clamp(120px,27vw,520px)] leading-none text-surface ${
          introDone ? "visible" : "invisible"
        }`}
      >
        <Logo className="w-[min(86vw,1500px)]" />
      </p>

      <h1 className="sr-only">
        {brand.name} — {brand.tagline}
      </h1>

      <Showcase />

      <Ticker items={brand.ticker} className="absolute inset-x-0 bottom-0 z-[120]" />
    </section>
  );
}
