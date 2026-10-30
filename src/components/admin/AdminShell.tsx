"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Logo } from "@/components/ui/Logo";
import { BrandSwitcher } from "./BrandSwitcher";

const SECTIONS = [
  { href: "/admin", label: "Products" },
  { href: "/admin/brand", label: "Brand" },
  { href: "/admin/texts", label: "Texts" },
  { href: "/admin/links", label: "Links" },
];

const sectionOf = (pathname: string) =>
  SECTIONS.find((section) => (section.href === "/admin" ? pathname === "/admin" : pathname.startsWith(section.href)))?.href ?? null;

/**
 * Section switcher with one pill that slides under the labels. It moves on click instead of
 * waiting for the next page to load, and it's measured inside the nav so page scroll can't skew it.
 */
function SectionTabs({ pathname }: { pathname: string }) {
  const [selected, setSelected] = useState(() => sectionOf(pathname));
  const [seenPath, setSeenPath] = useState(pathname);
  if (pathname !== seenPath) {
    setSeenPath(pathname);
    setSelected(sectionOf(pathname));
  }

  const tabs = useRef(new Map<string, HTMLAnchorElement>());
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ x: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const tab = selected ? tabs.current.get(selected) : null;
      if (tab) setPill({ x: tab.offsetLeft, width: tab.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (navRef.current) observer.observe(navRef.current);
    return () => observer.disconnect();
  }, [selected]);

  return (
    // Phones: the tabs get their own full-width row under the logo and actions.
    <nav
      ref={navRef}
      aria-label="Admin"
      className="relative order-last flex w-full justify-between rounded-full border border-ink/10 bg-ink/[0.04] p-1 md:order-none md:w-auto md:justify-start"
    >
      {pill && (
        <motion.span
          aria-hidden
          className="absolute bottom-1 left-0 top-1 rounded-full bg-ink shadow-[0_6px_16px_-6px_rgba(23,22,20,0.6)]"
          initial={false}
          animate={{ x: pill.x, width: pill.width, opacity: selected ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 40, opacity: { duration: 0.2 } }}
        />
      )}
      {SECTIONS.map((section) => {
        const active = section.href === selected;
        return (
          <Link
            key={section.href}
            ref={(node) => {
              if (node) tabs.current.set(section.href, node);
              else tabs.current.delete(section.href);
            }}
            href={section.href}
            onClick={() => setSelected(section.href)}
            aria-current={sectionOf(pathname) === section.href ? "page" : undefined}
            className={`relative flex-1 rounded-full px-2 py-1.5 text-center text-[13px] font-medium transition-colors duration-200 md:flex-none md:px-5 ${
              active ? "text-on-ink" : "text-ink/70 hover:text-ink"
            }`}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Admin chrome: soft color field behind a floating glass header with the section switcher. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative min-h-svh bg-bg text-ink">
      {/* Color field the glass blurs over. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[20%] h-[60vh] w-[60vw] rounded-full bg-accent/25 blur-[120px]" />
        <div className="absolute -right-[15%] top-[10%] h-[55vh] w-[50vw] rounded-full bg-surface blur-[110px]" />
        <div className="absolute bottom-[-25%] left-[30%] h-[60vh] w-[55vw] rounded-full bg-accent/15 blur-[140px]" />
      </div>

      <header className="sticky top-0 z-30 px-3 pt-3 md:px-6 md:pt-4">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl border border-white/60 bg-white/40 px-3 py-2 shadow-[0_18px_50px_-24px_rgba(23,22,20,0.45),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-2xl backdrop-saturate-150 md:px-5 md:py-2.5">
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/admin" className="flex items-center gap-3" aria-label="Studio home">
              <span className="font-display text-[22px]">
                <Logo className="h-[18px] md:h-5" />
              </span>
              <span className="eyebrow hidden text-muted lg:inline">Studio</span>
            </Link>
            <BrandSwitcher />
          </div>

          <SectionTabs pathname={pathname} />

          <div className="flex shrink-0 items-center gap-1.5">
            <Link
              href="/admin/guide"
              aria-label="Guide"
              aria-current={pathname.startsWith("/admin/guide") ? "page" : undefined}
              className={`flex h-[30px] min-w-[30px] items-center justify-center gap-1.5 rounded-full border px-2 text-[13px] font-medium transition-colors md:px-3 ${
                pathname.startsWith("/admin/guide") ? "border-ink bg-ink text-on-ink" : "border-ink/10 bg-white/50 hover:bg-white/80"
              }`}
            >
              <span aria-hidden>?</span>
              <span className="hidden lg:inline">Guide</span>
            </Link>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-full border border-ink/10 bg-white/50 px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-white/80 md:px-4"
            >
              <span className="hidden sm:inline">View store</span>
              <span aria-hidden>↗</span>
            </a>
          </div>
        </div>
      </header>

      <div className="relative">{children}</div>
    </div>
  );
}
