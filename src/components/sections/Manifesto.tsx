"use client";

import { useRef } from "react";
import { brand } from "@/brand";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";

export function Manifesto() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  useGSAP(
    () => {
      const split = SplitText.create(textRef.current, { type: "words" });
      gsap.fromTo(
        split.words,
        { opacity: 0.12 },
        {
          opacity: 1,
          ease: "none",
          stagger: 0.1,
          scrollTrigger: { trigger: textRef.current, start: "top 82%", end: "bottom 50%", scrub: true },
        },
      );

      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const counter = { value: 0 };
        const end = Number(el.dataset.count);
        gsap.to(counter, {
          value: end,
          duration: 1.8,
          ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
          onUpdate: () => {
            el.textContent = String(Math.round(counter.value));
          },
        });
      });

      gsap.from("[data-stat]", {
        y: 40,
        opacity: 0,
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.1,
        scrollTrigger: { trigger: "[data-stat]", start: "top 88%" },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} id="manifesto" className="px-5 pb-[14vh] pt-[18vh] md:px-8">
      <div className="grid gap-8 md:grid-cols-12">
        <p className="eyebrow text-muted md:col-span-3">(01) {brand.manifesto.label}</p>
        <p
          ref={textRef}
          className="text-[clamp(28px,4vw,62px)] font-medium leading-[1.06] tracking-[-0.025em] md:col-span-9"
        >
          {brand.manifesto.text}
        </p>
      </div>

      <div className="mt-[12vh] grid border-t border-ink/15 md:grid-cols-3">
        {brand.manifesto.stats.map((stat) => (
          <div
            key={stat.label}
            data-stat
            className="flex items-end justify-between gap-6 border-b border-ink/15 py-6 md:border-b-0 md:border-r md:px-6 md:py-8 md:first:pl-0 md:last:border-r-0"
          >
            <p className="font-display text-[clamp(64px,8vw,128px)]">
              <span data-count={stat.value}>0</span>
              {stat.suffix}
            </p>
            <p className="eyebrow mb-2 max-w-[14ch] text-right text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
