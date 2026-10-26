"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";

/**
 * Elements opt into a labelled cursor with `data-cursor="Label"`.
 * Interactive elements without a label get an enlarged dot.
 */
export function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEnabled(fine && !reduced);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current!;
    const dot = dotRef.current!;
    const bubble = bubbleRef.current!;
    const label = labelRef.current!;
    document.documentElement.classList.add("has-custom-cursor");
    gsap.set(bubble, { scale: 0.2, opacity: 0 });

    const xTo = gsap.quickTo(root, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(root, "y", { duration: 0.35, ease: "power3.out" });
    let currentKey = "|false";
    let visible = false;

    const setState = (nextLabel: string, interactive: boolean) => {
      const key = `${nextLabel}|${interactive}`;
      if (key === currentKey) return;
      currentKey = key;
      if (nextLabel) {
        label.textContent = nextLabel;
        gsap.to(bubble, { scale: 1, opacity: 1, duration: 0.45, ease: "expo.out", overwrite: "auto" });
        gsap.to(dot, { scale: 0, duration: 0.3, ease: "power3.out", overwrite: "auto" });
      } else {
        gsap.to(bubble, { scale: 0.2, opacity: 0, duration: 0.3, ease: "power3.out", overwrite: "auto" });
        gsap.to(dot, { scale: interactive ? 4.2 : 1, duration: 0.4, ease: "expo.out", overwrite: "auto" });
      }
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      if (!visible) {
        visible = true;
        gsap.set(root, { x: event.clientX, y: event.clientY });
        gsap.to(root, { opacity: 1, duration: 0.3 });
      }
      xTo(event.clientX);
      yTo(event.clientY);
    };

    const onOver = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest) return;
      const labelled = target.closest<HTMLElement>("[data-cursor]");
      const interactive = !!target.closest("a, button, [role='button'], input, label, select");
      setState(labelled?.dataset.cursor ?? "", interactive);
    };

    const onDown = () => gsap.to(root, { scale: 0.82, duration: 0.25, ease: "power3.out" });
    const onUp = () => gsap.to(root, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.5)" });
    const onLeave = () => {
      visible = false;
      gsap.to(root, { opacity: 0, duration: 0.3 });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);

    // Labels can change under a stationary pointer (e.g. the carousel moves), so re-check periodically.
    let lastX = 0;
    let lastY = 0;
    const track = (event: PointerEvent) => {
      lastX = event.clientX;
      lastY = event.clientY;
    };
    window.addEventListener("pointermove", track, { passive: true });
    const interval = window.setInterval(() => {
      if (!visible) return;
      const el = document.elementFromPoint(lastX, lastY);
      if (!el) return;
      const labelled = el.closest<HTMLElement>("[data-cursor]");
      setState(labelled?.dataset.cursor ?? "", !!el.closest("a, button, [role='button'], input, label, select"));
    }, 250);

    return () => {
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointermove", track);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.clearInterval(interval);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[200] opacity-0 mix-blend-difference"
    >
      <div
        ref={dotRef}
        className="absolute -left-[5px] -top-[5px] h-[10px] w-[10px] rounded-full bg-white"
      />
      <div
        ref={bubbleRef}
        className="absolute -left-[38px] -top-[38px] flex h-[76px] w-[76px] items-center justify-center rounded-full bg-white opacity-0"
      >
        <span ref={labelRef} className="eyebrow font-medium text-black" />
      </div>
    </div>
  );
}
