"use client";

import { useRef, type CSSProperties } from "react";
import { useMagnetic } from "@/hooks/useMagnetic";

type Props = {
  direction: "prev" | "next";
  onClick: () => void;
  style?: CSSProperties;
};

export function ShowcaseArrow({ direction, onClick, style }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  useMagnetic(ref, 0.4);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Previous piece" : "Next piece"}
      className="group absolute z-[120] hidden h-14 w-14 md:flex items-center justify-center rounded-full border border-ink/25 bg-bg/40 text-ink backdrop-blur-sm transition-colors duration-500 hover:border-ink hover:bg-ink hover:text-on-ink"
      style={style}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        className={`transition-transform duration-500 ease-expo ${
          direction === "prev" ? "rotate-180 group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5"
        }`}
      >
        <path d="M2 9h13M10 4l5 5-5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
      </svg>
    </button>
  );
}
