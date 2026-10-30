"use client";

import { useEffect, useRef, type RefObject } from "react";

/**
 * Tracks whether an element is in (or near) the viewport without re-rendering:
 * per-frame animation loops read `.current` and skip their work while it's off-screen.
 */
export function useOnScreen(target: RefObject<Element | null>, margin = "100px") {
  const onScreen = useRef(true);

  useEffect(() => {
    const element = target.current;
    if (!element) return;
    // Several changes can arrive in one batch (fast scrolling): the last entry is the current state.
    const observer = new IntersectionObserver((entries) => {
      onScreen.current = entries[entries.length - 1].isIntersecting;
    }, { rootMargin: margin });
    observer.observe(element);
    return () => observer.disconnect();
  }, [target, margin]);

  return onScreen;
}
