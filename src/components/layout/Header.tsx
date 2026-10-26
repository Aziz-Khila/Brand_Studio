"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { brand } from "@/brand";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useStore } from "@/components/providers/StoreProvider";
import { ScrambleLink } from "@/components/ui/ScrambleLink";
import { Logo } from "@/components/ui/Logo";

export function Header() {
  const { itemCount, setCartOpen, introDone } = useStore();
  const headerRef = useRef<HTMLElement>(null);
  const [inverted, setInverted] = useState(false);

  useGSAP(
    () => {
      if (!introDone) return;
      gsap.from("[data-header-reveal]", {
        yPercent: -140,
        opacity: 0,
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.07,
        delay: 0.5,
      });
      const footer = document.getElementById("footer");
      if (!footer) return;
      ScrollTrigger.create({
        trigger: footer,
        start: "top top+=40",
        end: "bottom top",
        onToggle: (self) => setInverted(self.isActive),
      });
    },
    { scope: headerRef, dependencies: [introDone] },
  );

  return (
    <header
      ref={headerRef}
      className={`fixed inset-x-0 top-0 z-[150] flex h-[var(--header-h)] items-center justify-between px-5 transition-[color,opacity] duration-500 md:px-8 ${
        inverted ? "text-on-ink" : "text-ink"
      } ${introDone ? "opacity-100" : "opacity-0"}`}
    >
      <a href="#collection" data-header-reveal aria-label={`${brand.name} home`} className="font-display text-[28px] leading-none">
        <Logo className="h-[22px]" />
      </a>

      <nav data-header-reveal className="absolute left-1/2 hidden -translate-x-1/2 gap-9 md:flex" aria-label="Main">
        {brand.nav.map((link) => (
          <ScrambleLink key={link.href} href={link.href} label={link.label} />
        ))}
      </nav>

      <div data-header-reveal className="flex items-center gap-7">
        <span className="eyebrow hidden opacity-60 lg:block">{brand.season}</span>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="eyebrow flex items-center gap-1"
          aria-label={`Open cart, ${itemCount} items`}
        >
          Cart
          <span className="relative inline-flex h-[1.4em] min-w-[2.2em] items-center justify-center overflow-hidden">
            (
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={itemCount}
                initial={{ y: "110%" }}
                animate={{ y: 0 }}
                exit={{ y: "-110%" }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="inline-block tabular-nums"
              >
                {itemCount}
              </motion.span>
            </AnimatePresence>
            )
          </span>
        </button>
      </div>
    </header>
  );
}
