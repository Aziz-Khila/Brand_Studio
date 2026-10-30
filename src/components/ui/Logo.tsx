"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { SplitText } from "@/lib/gsap";
import { useBrand } from "@/components/providers/BrandProvider";

/**
 * The brand logo: the image mark when the brand has one, otherwise the text wordmark.
 * The image is applied as a CSS mask filled with currentColor, so it takes the text color around it
 * (ink on light sections, off-white on the footer). Size it with a width or height class.
 * `fit` makes a text wordmark shrink to the width given by className instead of overflowing it.
 */
export function Logo({ className = "", style, fit = false }: { className?: string; style?: CSSProperties; fit?: boolean }) {
  const brand = useBrand();
  const { image, text, aspectRatio = 3 } = brand.logo;
  if (!image) return fit ? <FitText text={text} className={className} /> : <span className="whitespace-nowrap">{text}</span>;
  const mask = `url("${image}") center / contain no-repeat`;
  return (
    <span role="img" aria-label={brand.name} className={`inline-block overflow-hidden align-top ${className}`} style={{ aspectRatio, ...style }}>
      <span data-logo-mark className="block h-full w-full bg-current" style={{ mask, WebkitMask: mask }} />
    </span>
  );
}

/** One line of text that scales its font down (never up) until it fits its box. */
export function FitText({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.fontSize = "";
      const overflow = el.scrollWidth / el.clientWidth;
      if (overflow > 1) el.style.fontSize = `${Number.parseFloat(getComputedStyle(el).fontSize) / overflow}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (el.parentElement) observer.observe(el.parentElement);
    document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, [text]);

  return (
    <span ref={ref} className={`inline-block whitespace-nowrap text-center ${className}`}>
      {text}
    </span>
  );
}

/** What intro animations move: each letter of a text logo, or the image mark as one piece. */
export function logoParts(container: HTMLElement | null): Element[] {
  if (!container) return [];
  const marks = container.querySelectorAll("[data-logo-mark]");
  if (marks.length) return [...marks];
  return SplitText.create(container, { type: "words,chars", mask: "chars" }).chars;
}
