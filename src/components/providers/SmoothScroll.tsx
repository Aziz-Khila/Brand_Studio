"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ReactLenis, useLenis, type LenisRef } from "lenis/react";
import { useReducedMotion } from "motion/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useStore } from "./StoreProvider";

function ScrollSync() {
  useLenis(() => ScrollTrigger.update());
  const lenis = useLenis();
  const { introDone, quickViewProduct, cartOpen } = useStore();

  useEffect(() => {
    if (!lenis) return;
    if (!introDone || quickViewProduct || cartOpen) lenis.stop();
    else lenis.start();
  }, [lenis, introDone, quickViewProduct, cartOpen]);

  useEffect(() => {
    if (!introDone) return;
    const refresh = () => ScrollTrigger.refresh();
    const timeout = window.setTimeout(refresh, 200);
    document.fonts?.ready.then(refresh);
    return () => window.clearTimeout(timeout);
  }, [introDone]);

  return null;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const update = (time: number) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    return () => gsap.ticker.remove(update);
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{
        autoRaf: false,
        lerp: reduceMotion ? 1 : 0.085,
        wheelMultiplier: 0.9,
        anchors: { offset: 0 },
      }}
    >
      <ScrollSync />
      {children}
    </ReactLenis>
  );
}
