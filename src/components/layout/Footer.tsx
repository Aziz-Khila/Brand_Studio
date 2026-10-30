"use client";

import { useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useLenis } from "lenis/react";
import { useBrand } from "@/components/providers/BrandProvider";
import { gsap, useGSAP } from "@/lib/gsap";
import { ScrambleLink } from "@/components/ui/ScrambleLink";
import { Logo, logoParts } from "@/components/ui/Logo";
import { useContent } from "@/components/providers/ContentProvider";

export function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const wordmarkRef = useRef<HTMLParagraphElement>(null);
  const [subscribed, setSubscribed] = useState(false);
  const lenis = useLenis();
  const brand = useBrand();
  const content = useContent();

  useGSAP(
    () => {
      gsap.from(logoParts(wordmarkRef.current), {
        yPercent: 100,
        duration: 1.4,
        ease: "expo.out",
        stagger: 0.05,
        scrollTrigger: { trigger: wordmarkRef.current, start: "top 95%" },
      });
      gsap.from("[data-footer-tagline]", {
        y: 24,
        opacity: 0,
        duration: 1.2,
        ease: "expo.out",
        delay: 0.15,
        scrollTrigger: { trigger: wordmarkRef.current, start: "top 95%" },
      });
    },
    { scope: footerRef },
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubscribed(true);
  };

  return (
    <footer ref={footerRef} id="footer" className="relative overflow-hidden bg-ink px-5 pt-[12vh] text-on-ink md:px-8">
      <div className="grid gap-14 md:grid-cols-12">
        <div className="md:col-span-6">
          <p className="font-display text-[clamp(44px,6vw,96px)]">{content.newsletter.title}</p>
          <p className="mt-4 max-w-[38ch] text-on-ink/60">{content.newsletter.text}</p>
          <AnimatePresence mode="wait" initial={false}>
            {subscribed ? (
              <motion.p
                key="done"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="eyebrow mt-10 border-b border-on-ink/30 pb-4"
              >
                You&apos;re on the list. See you at the next drop.
              </motion.p>
            ) : (
              <motion.form
                key="form"
                exit={{ opacity: 0, y: -12 }}
                onSubmit={onSubmit}
                className="mt-10 flex max-w-[520px] items-center gap-4 border-b border-on-ink/30 pb-3 focus-within:border-on-ink"
              >
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  required
                  placeholder="Email address"
                  className="min-w-0 flex-1 bg-transparent py-2 text-[17px] placeholder:text-on-ink/40 focus:outline-none"
                />
                <button type="submit" className="eyebrow link-underline shrink-0 pb-0.5">
                  Subscribe
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="grid grid-cols-2 gap-10 md:col-span-6 md:grid-cols-3">
          {brand.footer.columns.map((column) => (
            <div key={column.title}>
              <p className="eyebrow mb-5 text-on-ink/40">{column.title}</p>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <ScrambleLink href={link.href} label={link.label} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {content.socials.length > 0 && (
            <div>
              <p className="eyebrow mb-5 text-on-ink/40">Follow</p>
              <ul className="space-y-2.5">
                {content.socials.map((link) => (
                  <li key={link.label}>
                    <ScrambleLink href={link.href} label={link.label} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Signature: wordmark and tagline on one baseline, then the fine print. */}
      <div className="mt-[12vh] flex flex-col gap-8 border-t border-on-ink/15 pt-10 md:flex-row md:items-end md:justify-between md:pt-14">
        <p
          ref={wordmarkRef}
          aria-hidden
          className="font-display select-none overflow-hidden whitespace-nowrap text-[clamp(56px,9vw,140px)] leading-none"
        >
          <Logo fit className="w-[min(78vw,520px)]" />
        </p>
        <div data-footer-tagline className="md:pb-1 md:text-right">
          <p className="font-display max-w-[16ch] text-[clamp(28px,3.2vw,48px)] leading-[0.95] md:ml-auto">{content.tagline}</p>
          <p className="eyebrow mt-3 text-on-ink/50">
            {content.season} — {content.location}
          </p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-on-ink/15 py-6 md:mt-14">
        <p className="eyebrow text-on-ink/50">
          © {new Date().getFullYear()} {brand.name}. All rights reserved.
        </p>
        <button
          type="button"
          onClick={() => lenis?.scrollTo(0, { duration: 2.2 })}
          className="eyebrow link-underline pb-0.5"
        >
          Back to top ↑
        </button>
      </div>
    </footer>
  );
}
