"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import type { BrandConfig, BrandContent, Product } from "@/brand/types";
import { useBrand } from "@/components/providers/BrandProvider";

type Progress = { logo: boolean; products: number; socials: number; exported: boolean };

type Step = {
  title: string;
  time: string;
  where: { label: string; href: string; external?: boolean } | null;
  points: ReactNode[];
  done?: (progress: Progress) => boolean;
};

const STEPS: Step[] = [
  {
    title: "Pick the brand",
    time: "1 min",
    where: null,
    points: [
      <>Use the brand picker next to the logo, top left. Everything you edit applies to the brand shown there.</>,
      <>
        For a new client choose <b>New brand</b>: type a name, start from a neutral look or the current one. It starts with no products and
        placeholder texts.
      </>,
    ],
  },
  {
    title: "Set up the identity",
    time: "10 min",
    where: { label: "Open Brand", href: "/admin/brand" },
    points: [
      <>
        <b>Logo:</b> upload a PNG, JPG or SVG, dark on a light background or on transparency. Keep “Make the icon from its first letter”
        ticked unless you have a separate icon.
      </>,
      <>
        <b>Colors:</b> click a palette, then adjust. Keep the readability badges green (AA or AAA).
      </>,
      <>
        <b>Fonts, currency, menu, footer, search &amp; sharing:</b> fill what you need. The preview on the right updates as you go.
      </>,
      <>
        Click <b>Save changes</b> at the bottom of the screen.
      </>,
    ],
    done: (p) => p.logo,
  },
  {
    title: "Add the products",
    time: "5 min each",
    where: { label: "Open Products", href: "/admin" },
    points: [
      <>
        Click <b>+ New</b>, choose the garment type, then upload a <b>front and back</b> photo.
      </>,
      <>
        Messy background? Copy the ready-made <b>prompts</b> into ChatGPT or Gemini with your photo, then upload what it returns.
      </>,
      <>
        Click <b>Process photos</b>, check the cut-out, fill name, price, category and sizes (add a size guide in cm if you have one).
      </>,
      <>
        Same piece in other colors? Use <b>Add color</b>. Then <b>Add to store</b>.
      </>,
    ],
    done: (p) => p.products > 0,
  },
  {
    title: "Write the texts",
    time: "5 min",
    where: { label: "Open Texts", href: "/admin/texts" },
    points: [<>Tagline, season, city, the moving bar messages, the manifesto and the newsletter block. Save.</>],
  },
  {
    title: "Add social links",
    time: "2 min",
    where: { label: "Open Links", href: "/admin/links" },
    points: [<>Click a platform (Instagram, TikTok…), finish the address, use “Test ↗” to check it, then save.</>],
    done: (p) => p.socials > 0,
  },
  {
    title: "Check the store",
    time: "2 min",
    where: { label: "View store", href: "/", external: true },
    points: [
      <>Reload the store after each save. Scroll everything, open a product, add it to the cart.</>,
      <>Check it on a phone size too (in the browser: right click → Inspect → phone icon).</>,
    ],
  },
  {
    title: "Export for the client",
    time: "1 min",
    where: { label: "Open Brand", href: "/admin/brand" },
    points: [
      <>
        On the Brand page, click <b>Export client project</b>, keep “.zip” ticked and click <b>Export</b>.
      </>,
      <>
        The folder lands in <b>Desktop › Brand Studio Exports</b>. Send the .zip; it includes a README for running it and putting it online
        with Vercel.
      </>,
      <>Changed something later? Export again: the folder is refreshed.</>,
    ],
    done: (p) => p.exported,
  },
];

const TIPS: { q: string; a: ReactNode }[] = [
  {
    q: "What makes a good product photo?",
    a: (
      <>
        The whole piece in frame, flat or on a hanger, on a plain white or light grey background, with front and back shot from the same
        angle. For shoes: the outer side and the inner side of one shoe.
      </>
    ),
  },
  {
    q: "I saved but the store didn't change.",
    a: (
      <>
        Reload the store page. Still old? In the terminal press <b>Ctrl + C</b>, delete the <code>.next</code> folder, then run{" "}
        <code>npm run dev</code> again.
      </>
    ),
  },
  {
    q: "Can I undo a change?",
    a: (
      <>
        Before saving, yes: <b>Discard</b> in the bar at the bottom. After saving, set it back by hand. Logo and image uploads are saved
        immediately.
      </>
    ),
  },
  {
    q: "Why isn't the admin on the live website?",
    a: <>On purpose: it edits files on your computer, so it only runs with npm run dev. Exported client projects don't include it at all.</>,
  },
  {
    q: "Where are the files?",
    a: (
      <>
        Each brand has a folder in <code>src/brands</code> (brand, texts and products) and one in <code>public/brands</code> (logo and
        photos).
      </>
    ),
  },
];

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
    return response.ok ? ((await response.json()) as T) : null;
  } catch {
    return null;
  }
}

export function Guide() {
  const brand = useBrand();
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    Promise.all([
      getJson<{ brand: BrandConfig }>("/api/admin/brand"),
      getJson<{ products: Product[] }>("/api/admin/products"),
      getJson<{ content: BrandContent }>("/api/admin/content"),
      getJson<{ exists: boolean }>("/api/admin/export"),
    ]).then(([brandData, productData, contentData, exportData]) =>
      setProgress({
        logo: Boolean(brandData?.brand.logo.image),
        products: productData?.products.length ?? 0,
        socials: contentData?.content.socials.length ?? 0,
        exported: Boolean(exportData?.exists),
      }),
    );
  }, []);

  const tracked = STEPS.filter((step) => step.done);
  const doneCount = progress ? tracked.filter((step) => step.done!(progress)).length : 0;

  return (
    <main className="mx-auto max-w-[900px] space-y-8 px-4 pb-32 pt-8 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-muted">Guide</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">From brand to client, in 7 steps</h1>
          <p className="mt-2 max-w-[60ch] text-sm text-muted">About 30 minutes for a full store. Ticks appear as {brand.name} gets done.</p>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-white/60 bg-white/50 py-1.5 pl-1.5 pr-4 backdrop-blur-xl">
          <span className="relative grid h-9 w-9 place-items-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" className="stroke-ink/10" strokeWidth="3" />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                className="stroke-ink transition-[stroke-dasharray] duration-700"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(doneCount / tracked.length) * 94.2} 94.2`}
              />
            </svg>
            <span className="text-[11px] font-semibold tabular-nums">{doneCount}</span>
          </span>
          <span className="text-sm">
            {doneCount} of {tracked.length} done
          </span>
        </div>
      </div>

      <ol className="relative space-y-4">
        <span aria-hidden className="absolute bottom-6 left-[15px] top-6 w-px bg-ink/10" />
        {STEPS.map((step, index) => {
          const done = progress && step.done ? step.done(progress) : false;
          return (
            <li key={step.title} className="relative flex gap-4 md:gap-5">
              <span
                className={`relative z-10 mt-5 grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums ring-[6px] ring-bg/60 transition-colors ${
                  done ? "bg-emerald-700 text-white" : "bg-ink text-on-ink"
                }`}
                aria-label={done ? "Done" : undefined}
              >
                {done ? "✓" : index + 1}
              </span>
              <div className="min-w-0 flex-1 rounded-2xl border border-white/60 bg-white/45 p-5 shadow-[0_20px_60px_-40px_rgba(23,22,20,0.35)] backdrop-blur-xl md:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-baseline gap-3">
                    <h2 className="text-lg font-semibold tracking-tight">{step.title}</h2>
                    <span className="eyebrow text-muted">{step.time}</span>
                  </div>
                  {step.where &&
                    (step.where.external ? (
                      <a
                        href={step.where.href}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full bg-ink px-3.5 py-1.5 text-[13px] font-medium text-on-ink transition-colors hover:bg-ink/85"
                      >
                        {step.where.label} ↗
                      </a>
                    ) : (
                      <Link
                        href={step.where.href}
                        className="rounded-full bg-ink px-3.5 py-1.5 text-[13px] font-medium text-on-ink transition-colors hover:bg-ink/85"
                      >
                        {step.where.label} →
                      </Link>
                    ))}
                </div>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink/80">
                  {step.points.map((point, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span aria-hidden className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-ink/40" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>

      <section>
        <h2 className="mb-3 text-2xl font-semibold tracking-tight">Good to know</h2>
        <div className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-white/60 bg-white/45 backdrop-blur-xl">
          {TIPS.map((tip) => (
            <details key={tip.q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium transition-colors hover:bg-white/40 md:px-6 [&::-webkit-details-marker]:hidden">
                {tip.q}
                <span aria-hidden className="text-lg leading-none text-muted transition-transform duration-300 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="px-5 pb-5 text-sm leading-relaxed text-ink/75 md:px-6 [&_code]:rounded [&_code]:bg-ink/[0.06] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[12px]">
                {tip.a}
              </p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
