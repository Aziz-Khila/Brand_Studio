"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLenis } from "lenis/react";
import { useEscape } from "@/hooks/useEscape";
import { useBrand } from "@/components/providers/BrandProvider";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { useStore } from "@/components/providers/StoreProvider";
import { ScrambleLink } from "@/components/ui/ScrambleLink";
import { Logo } from "@/components/ui/Logo";
import { useContent } from "@/components/providers/ContentProvider";

export function Header() {
  const { itemCount, setCartOpen, introDone } = useStore();
  const brand = useBrand();
  const content = useContent();
  const headerRef = useRef<HTMLElement>(null);
  const [inverted, setInverted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  /** Past the top of the page: the bar gets a background so links never sit on top of content. */
  const [solid, setSolid] = useState(false);
  /** Scrolling down through the page tucks the bar away; any scroll up brings it back. */
  const [tucked, setTucked] = useState(false);

  useLenis(({ scroll, direction }) => {
    setSolid(scroll > 24);
    if (direction === 1 && scroll > window.innerHeight * 0.9) setTucked(true);
    else if (direction === -1 || scroll < 80) setTucked(false);
  });

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
      className={`fixed inset-x-0 top-0 z-[150] flex h-[var(--header-h)] items-center justify-between px-5 transition-[color,opacity,translate] duration-500 ease-expo md:px-8 ${
        inverted ? "text-on-ink" : "text-ink"
      } ${introDone ? "opacity-100" : "opacity-0"} ${tucked && !menuOpen ? "-translate-y-full" : ""}`}
    >
      {/* The blur sits on its own layer: on the header itself it would trap the fixed mobile menu inside the bar. */}
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 -z-10 border-b backdrop-blur-xl transition-[opacity,background-color,border-color] duration-500 ${
          inverted ? "border-on-ink/10 bg-ink/80" : "border-ink/10 bg-bg/80"
        } ${solid ? "opacity-100" : "opacity-0"}`}
      />
      <a href="#collection" data-header-reveal aria-label={`${brand.name} home`} className="font-display text-[28px] leading-none">
        <Logo className="h-[22px]" />
      </a>

      <nav data-header-reveal className="absolute left-1/2 hidden -translate-x-1/2 gap-9 md:flex" aria-label="Main">
        {brand.nav.map((link) => (
          <ScrambleLink key={link.href} href={link.href} label={link.label} />
        ))}
      </nav>

      <div data-header-reveal className="flex items-center gap-5 md:gap-7">
        <span className="eyebrow hidden opacity-60 lg:block">{content.season}</span>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="eyebrow md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          Menu
        </button>
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

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  );
}

/** Full-screen navigation for small screens, where the header has no room for the links. */
function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEscape(onClose, open);
  const lenis = useLenis();
  const brand = useBrand();
  const content = useContent();

  useEffect(() => {
    if (!lenis || !open) return;
    lenis.stop();
    return () => lenis.start();
  }, [open, lenis]);

  const go = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault();
    onClose();
    // Scrolling is paused while the menu is open, so force the jump once it starts closing.
    requestAnimationFrame(() => {
      if (lenis) lenis.scrollTo(href, { force: true, duration: 1.4 });
      else document.querySelector(href)?.scrollIntoView({ behavior: "smooth" });
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          data-lenis-prevent
          className="fixed inset-0 z-[175] flex flex-col bg-ink px-5 pb-8 text-on-ink md:hidden"
          initial={{ clipPath: "inset(0% 0% 100% 0%)" }}
          animate={{ clipPath: "inset(0% 0% 0% 0%)" }}
          exit={{ clipPath: "inset(0% 0% 100% 0%)" }}
          transition={{ duration: 0.7, ease: [0.76, 0, 0.24, 1] }}
        >
          <div className="flex h-[var(--header-h)] shrink-0 items-center justify-between">
            <Logo className="h-[22px]" />
            <button type="button" autoFocus onClick={onClose} className="eyebrow">
              Close ✕
            </button>
          </div>
          <nav aria-label="Main" className="mt-[8vh] flex flex-col gap-2">
            {brand.nav.map((link, index) => (
              <motion.a
                key={link.href}
                href={link.href}
                onClick={(event) => go(event, link.href)}
                className="font-display text-[clamp(48px,15vw,96px)]"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.25 + index * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                {link.label}
              </motion.a>
            ))}
          </nav>
          <div className="mt-auto flex items-end justify-between gap-6">
            <p className="eyebrow max-w-[22ch] text-on-ink/60">{content.tagline}</p>
            <p className="eyebrow text-right text-on-ink/60">
              {content.season}
              <br />
              {content.location}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
