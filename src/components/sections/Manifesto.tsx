"use client";

import { useRef } from "react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { useContent } from "@/components/providers/ContentProvider";

export function Manifesto() {
  const { manifesto } = useContent();
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
    },
    { scope: sectionRef, dependencies: [manifesto.text], revertOnUpdate: true },
  );

  return (
    <section ref={sectionRef} id="manifesto" className="px-5 pb-[14vh] pt-[18vh] md:px-8">
      <div className="grid gap-8 md:grid-cols-12">
        <p className="eyebrow text-muted md:col-span-3">(01) {manifesto.label}</p>
        <p
          ref={textRef}
          className="text-[clamp(28px,4vw,62px)] font-medium leading-[1.06] tracking-[-0.025em] md:col-span-9"
        >
          {manifesto.text}
        </p>
      </div>
    </section>
  );
}
