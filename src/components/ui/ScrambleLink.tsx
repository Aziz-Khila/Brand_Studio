"use client";

import { useRef } from "react";
import { gsap } from "@/lib/gsap";

type Props = {
  href: string;
  label: string;
  className?: string;
};

export function ScrambleLink({ href, label, className = "" }: Props) {
  const textRef = useRef<HTMLSpanElement>(null);

  const scramble = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.to(textRef.current, {
      duration: 0.7,
      overwrite: true,
      scrambleText: { text: label, chars: "upperCase", speed: 0.6, revealDelay: 0.1 },
    });
  };

  const external = /^https?:\/\//i.test(href);

  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      onPointerEnter={scramble}
      onFocus={scramble}
      className={`eyebrow ${className}`}
    >
      <span ref={textRef}>{label}</span>
    </a>
  );
}
