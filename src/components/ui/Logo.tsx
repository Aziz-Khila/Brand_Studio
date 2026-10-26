import type { CSSProperties } from "react";
import { brand } from "@/brand";
import { SplitText } from "@/lib/gsap";

/**
 * The brand logo: the image mark when the brand has one, otherwise the text wordmark.
 * The image is applied as a CSS mask filled with currentColor, so it takes the text color around it
 * (ink on light sections, off-white on the footer). Size it with a width or height class.
 */
export function Logo({ className = "", style }: { className?: string; style?: CSSProperties }) {
  const { image, text, aspectRatio = 3 } = brand.logo;
  if (!image) return <>{text}</>;
  const mask = `url("${image}") center / contain no-repeat`;
  return (
    <span role="img" aria-label={brand.name} className={`inline-block overflow-hidden align-top ${className}`} style={{ aspectRatio, ...style }}>
      <span data-logo-mark className="block h-full w-full bg-current" style={{ mask, WebkitMask: mask }} />
    </span>
  );
}

/** What intro animations move: each letter of a text logo, or the image mark as one piece. */
export function logoParts(container: HTMLElement | null): Element[] {
  if (!container) return [];
  if (brand.logo.image) return [...container.querySelectorAll("[data-logo-mark]")];
  return SplitText.create(container, { type: "chars", mask: "chars" }).chars;
}
