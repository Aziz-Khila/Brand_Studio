"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Logo } from "@/components/ui/Logo";

const SECTIONS = [
  { href: "/admin", label: "Products" },
  { href: "/admin/texts", label: "Texts" },
  { href: "/admin/links", label: "Links" },
];

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
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/40 px-3 py-2 shadow-[0_18px_50px_-24px_rgba(23,22,20,0.45),inset_0_1px_0_rgba(255,255,255,0.75)] backdrop-blur-2xl backdrop-saturate-150 md:px-5 md:py-2.5">
          <Link href="/admin" className="flex shrink-0 items-center gap-3" aria-label="Studio home">
            <Logo className="h-[18px] md:h-5" />
            <span className="eyebrow hidden text-muted sm:inline">Studio</span>
          </Link>

          <nav aria-label="Admin" className="flex rounded-full border border-ink/10 bg-ink/[0.04] p-1">
            {SECTIONS.map((section) => {
              const active = section.href === "/admin" ? pathname === "/admin" : pathname.startsWith(section.href);
              return (
                <Link
                  key={section.href}
                  href={section.href}
                  aria-current={active ? "page" : undefined}
                  className="relative isolate rounded-full px-3.5 py-1.5 text-[13px] font-medium md:px-5"
                >
                  {active && (
                    <motion.span
                      layoutId="admin-nav-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-ink shadow-[0_6px_16px_-6px_rgba(23,22,20,0.6)]"
                      transition={{ type: "spring", stiffness: 420, damping: 36 }}
                    />
                  )}
                  <span className={`transition-colors duration-300 ${active ? "text-on-ink" : "text-ink/70 hover:text-ink"}`}>
                    {section.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-2 rounded-full border border-ink/10 bg-white/50 px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-white/80 md:px-4"
          >
            <span className="hidden sm:inline">View store</span>
            <span aria-hidden>↗</span>
          </a>
        </div>
      </header>

      <div className="relative">{children}</div>
    </div>
  );
}
