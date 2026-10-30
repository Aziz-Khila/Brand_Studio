"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/brand";
import { fontCatalog, fontFamily, type FontKey, type FontRole } from "@/brand/fontCatalog";
import type { BrandConfig, BrandContent, FooterColumn, Product } from "@/brand/types";
import { Button, Field, Section, inputClass } from "../ui";
import { ExportDialog } from "./ExportDialog";
import { SaveBar } from "../content/SaveBar";
import { BrandPreview } from "./BrandPreview";
import { ColorEditor } from "./ColorEditor";
import { LinkRows } from "./LinkRows";
import { DraftLogo, MaskImage, UploadButton, useAssetUpload } from "./assets";
import { useBrandDraft } from "./useBrandDraft";

const IMAGE_TYPES = ".png,.jpg,.jpeg,.webp,.svg";
const CURRENCIES = ["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "JPY", "SEK", "DKK", "NOK", "MAD", "TND", "DZD", "AED", "SAR", "QAR"];
const LOCALES = [
  { value: "en-GB", label: "English (UK)" },
  { value: "en-US", label: "English (US)" },
  { value: "fr-FR", label: "Français (France)" },
  { value: "fr-TN", label: "Français (Tunisie)" },
  { value: "fr-MA", label: "Français (Maroc)" },
  { value: "de-DE", label: "Deutsch" },
  { value: "it-IT", label: "Italiano" },
  { value: "es-ES", label: "Español" },
  { value: "nl-NL", label: "Nederlands" },
  { value: "ar-TN", label: "العربية (تونس)" },
  { value: "ar-AE", label: "العربية (الإمارات)" },
  { value: "ja-JP", label: "日本語" },
];
const FONT_KEYS = Object.keys(fontCatalog) as FontKey[];
const ROLES: { role: FontRole; label: string; sample: (brand: BrandConfig) => string }[] = [
  { role: "display", label: "Display", sample: (brand) => brand.name || "New drop" },
  { role: "body", label: "Body", sample: () => "Heavyweight essentials, cut in small numbered runs." },
  { role: "mono", label: "Labels", sample: (brand) => `Drop 01 — ${safePrice(160, brand)}` },
];

const clamp = (value: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, value));
const safePrice = (value: number, brand: Pick<BrandConfig, "locale" | "currency">) => {
  try {
    return formatPrice(value, brand);
  } catch {
    return "—";
  }
};

function Counter({ value, max }: { value: string; max: number }) {
  return <span className={`tabular-nums ${value.length > max ? "text-red-800" : ""}`}>{value.length} / {max}</span>;
}

export function BrandEditor() {
  const { draft, dirty, update, applyAssets, save, discard, state, error } = useBrandDraft();
  const assets = useAssetUpload(applyAssets);
  const [content, setContent] = useState<BrandContent | null>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [markFromLogo, setMarkFromLogo] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/admin/content")
      .then((response) => response.json())
      .then((data: { content: BrandContent }) => setContent(data.content))
      .catch(() => {});
    fetch("/api/admin/products")
      .then((response) => response.json())
      .then((data: { products: Product[] }) => setProduct(data.products[0] ?? null))
      .catch(() => {});
  }, []);

  if (!draft) return <p className="mx-auto max-w-[1400px] px-4 py-16 text-sm text-muted md:px-6">Loading…</p>;

  const set = <K extends keyof BrandConfig>(key: K, value: BrandConfig[K]) => update((d) => ({ ...d, [key]: value }));
  const setSeo = (patch: NonNullable<BrandConfig["seo"]>) => update((d) => ({ ...d, seo: { ...d.seo, ...patch } }));
  const setFont = (role: FontRole, key: FontKey) =>
    update((d) => {
      if (role !== "display") return { ...d, typography: { ...d.typography, [role]: key } };
      const info = fontCatalog[key];
      const weight = clamp(d.typography.displayWeight ?? 700, info.weights);
      const stretch = "width" in info ? clamp(Number.parseFloat(d.typography.displayStretch ?? "100"), info.width) : 100;
      return { ...d, typography: { ...d.typography, display: key, displayWeight: weight, displayStretch: `${stretch}%` } };
    });
  const setColumns = (columns: FooterColumn[]) => set("footer", { columns });
  const display = fontCatalog[draft.typography.display];
  const title = draft.seo?.title || `${draft.name} — ${content?.tagline ?? ""}`;
  const description = draft.seo?.description || draft.description;
  const host = (draft.seo?.siteUrl || `https://${draft.id}.com`).replace(/^https?:\/\//, "");

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-32 pt-8 md:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-muted">Identity</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">Brand</h1>
          <p className="mt-2 max-w-[62ch] text-sm text-muted">
            Name, logo, colors, fonts and store settings. The preview updates as you edit; save to apply them to the store.
          </p>
        </div>
        <Button variant="ghost" onClick={() => setExporting(true)} className="bg-white/50">
          Export client project ↗
        </Button>
      </div>
      {exporting && <ExportDialog brandName={draft.name} dirty={dirty} onClose={() => setExporting(false)} />}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          <Section title="Identity">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Brand name">
                <input value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
              </Field>
              <Field label="Text logo" hint="Shown when there's no logo image, and read aloud by screen readers.">
                <input value={draft.logo.text} onChange={(e) => update((d) => ({ ...d, logo: { ...d.logo, text: e.target.value } }))} className={inputClass} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="About the brand" hint={<Counter value={draft.description} max={300} />}>
                <textarea
                  value={draft.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  className={`${inputClass} resize-y`}
                />
              </Field>
            </div>
          </Section>

          <Section
            title="Logo and icon"
            description="Upload a PNG, JPG or SVG of the logo, dark on a light background or on transparency. It's traced into a crisp single-color SVG that takes the right color in each section. The icon opens the carousel and becomes the browser-tab icon."
          >
            <div className="grid gap-4 md:grid-cols-[1.6fr_1fr]">
              <div className="overflow-hidden rounded-xl border border-ink/10">
                <div className="grid h-28 place-items-center bg-bg px-6 text-[44px] text-ink">
                  <DraftLogo brand={draft} className="max-h-14 w-[min(100%,320px)]" />
                </div>
                <div className="grid h-20 place-items-center bg-ink px-6 text-[32px] text-on-ink">
                  <DraftLogo brand={draft} className="max-h-9 w-[min(100%,200px)]" />
                </div>
              </div>
              <div className="flex items-center justify-around gap-4 rounded-xl border border-ink/10 bg-bg p-4">
                <div className="text-center">
                  <div className="grid h-24 place-items-center text-ink">
                    {draft.logo.mark ? (
                      <MaskImage src={draft.logo.mark.image} aspectRatio={draft.logo.mark.aspectRatio} className="h-20" />
                    ) : (
                      <span className="text-xs text-muted">No icon</span>
                    )}
                  </div>
                  <p className="eyebrow mt-2 text-muted">Icon</p>
                </div>
                <div className="text-center">
                  <div className="grid h-24 place-items-center">
                    {draft.favicon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={draft.favicon} alt="" className="h-8 w-8 rounded-md bg-white p-0.5 shadow-sm" />
                    ) : (
                      <span className="text-xs text-muted">None</span>
                    )}
                  </div>
                  <p className="eyebrow mt-2 text-muted">Tab icon</p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <UploadButton
                accept={IMAGE_TYPES}
                busy={assets.busy === "logo"}
                onFile={(file) => assets.upload("logo", file, { markFromLogo: String(markFromLogo) })}
              >
                {draft.logo.image ? "Replace logo" : "Upload logo"}
              </UploadButton>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={markFromLogo} onChange={(e) => setMarkFromLogo(e.target.checked)} className="accent-[var(--brand-ink)]" />
                Make the icon from its first letter
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              <UploadButton accept={IMAGE_TYPES} busy={assets.busy === "mark"} onFile={(file) => assets.upload("mark", file)}>
                Upload a separate icon
              </UploadButton>
              {draft.logo.mark && (
                <button type="button" onClick={() => assets.remove({ logo: { mark: null } })} className="rounded-full px-3 py-2 text-muted hover:text-red-800">
                  Remove icon
                </button>
              )}
              {draft.logo.image && (
                <button type="button" onClick={() => assets.remove({ logo: { image: null } })} className="rounded-full px-3 py-2 text-muted hover:text-red-800">
                  Use the text logo instead
                </button>
              )}
            </div>
            {assets.error && <p className="mt-3 text-sm text-red-800">{assets.error}</p>}
          </Section>

          <Section title="Colors" description="Six colors drive the whole store. Pick a palette, then fine-tune.">
            <ColorEditor colors={draft.colors} onChange={(colors) => set("colors", colors)} />
          </Section>

          <Section title="Typography" description="Display is for big titles and the logo text, body for paragraphs, labels for small caps and prices.">
            <div className="space-y-3">
              {ROLES.map(({ role, label, sample }) => {
                const key = draft.typography[role];
                const suggested = FONT_KEYS.filter((k) => (fontCatalog[k].roles as readonly FontRole[]).includes(role));
                const other = FONT_KEYS.filter((k) => !suggested.includes(k));
                return (
                  <div key={role} className="rounded-xl border border-ink/10 bg-white/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="eyebrow text-muted">{label}</span>
                      <select
                        value={key}
                        onChange={(e) => setFont(role, e.target.value as FontKey)}
                        aria-label={`${label} font`}
                        className={`${inputClass} w-auto min-w-[200px]`}
                      >
                        <optgroup label="Suggested">
                          {suggested.map((k) => (
                            <option key={k} value={k}>
                              {fontCatalog[k].label}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Other">
                          {other.map((k) => (
                            <option key={k} value={k}>
                              {fontCatalog[k].label}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    <p
                      className="mt-3 truncate"
                      style={
                        role === "display"
                          ? {
                              fontFamily: fontFamily(key),
                              fontWeight: draft.typography.displayWeight ?? 700,
                              fontStretch: draft.typography.displayStretch ?? "100%",
                              textTransform: "uppercase",
                              fontSize: 44,
                              lineHeight: 1,
                            }
                          : role === "mono"
                            ? { fontFamily: fontFamily(key), fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" }
                            : { fontFamily: fontFamily(key), fontSize: 17 }
                      }
                    >
                      {sample(draft)}
                    </p>
                    {role === "display" && (
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <Field label={`Weight · ${draft.typography.displayWeight ?? 700}`}>
                          <input
                            type="range"
                            min={display.weights[0]}
                            max={display.weights[1]}
                            step={50}
                            disabled={display.weights[0] === display.weights[1]}
                            value={draft.typography.displayWeight ?? 700}
                            onChange={(e) => update((d) => ({ ...d, typography: { ...d.typography, displayWeight: Number(e.target.value) } }))}
                            className="w-full accent-[var(--brand-ink)] disabled:opacity-40"
                          />
                        </Field>
                        <Field label={"width" in display ? `Width · ${draft.typography.displayStretch ?? "100%"}` : "Width · fixed for this font"}>
                          <input
                            type="range"
                            min={"width" in display ? display.width[0] : 100}
                            max={"width" in display ? display.width[1] : 100}
                            step={1}
                            disabled={!("width" in display)}
                            value={Number.parseFloat(draft.typography.displayStretch ?? "100")}
                            onChange={(e) => update((d) => ({ ...d, typography: { ...d.typography, displayStretch: `${e.target.value}%` } }))}
                            className="w-full accent-[var(--brand-ink)] disabled:opacity-40"
                          />
                        </Field>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>

          <Section title="Store settings" description="How prices are shown, and when shipping becomes free.">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Currency" hint="ISO code, e.g. EUR or TND.">
                <input
                  list="currencies"
                  value={draft.currency}
                  onChange={(e) => set("currency", e.target.value.toUpperCase().slice(0, 3))}
                  className={`${inputClass} font-mono uppercase`}
                />
                <datalist id="currencies">
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code} />
                  ))}
                </datalist>
              </Field>
              <Field label="Number format" hint="Language and region, e.g. fr-FR.">
                <input list="locales" value={draft.locale} onChange={(e) => set("locale", e.target.value)} className={`${inputClass} font-mono`} />
                <datalist id="locales">
                  {LOCALES.map((locale) => (
                    <option key={locale.value} value={locale.value}>
                      {locale.label}
                    </option>
                  ))}
                </datalist>
              </Field>
              <Field label="Free shipping from" hint="Leave empty to hide the progress bar.">
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={draft.freeShippingThreshold ?? ""}
                  onChange={(e) => set("freeShippingThreshold", e.target.value === "" ? undefined : Number(e.target.value))}
                  className={inputClass}
                />
              </Field>
            </div>
            <p className="mt-4 text-sm text-muted">
              Prices look like <span className="font-medium text-ink">{safePrice(1290, draft)}</span> and{" "}
              <span className="font-medium text-ink">{safePrice(49.5, draft)}</span>.
            </p>
          </Section>

          <Section title="Navigation" description="Header menu and footer columns. Social links are under Links.">
            <p className="eyebrow mb-3 text-muted">Header menu</p>
            <LinkRows links={draft.nav} onChange={(nav) => set("nav", nav)} max={6} />

            <div className="mt-8 space-y-4">
              <p className="eyebrow text-muted">Footer columns</p>
              {draft.footer.columns.map((column, index) => (
                <div key={index} className="rounded-xl border border-ink/10 bg-white/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <input
                      value={column.title}
                      onChange={(e) => setColumns(draft.footer.columns.map((c, i) => (i === index ? { ...c, title: e.target.value } : c)))}
                      placeholder="Column title"
                      aria-label="Column title"
                      className={`${inputClass} max-w-[240px] font-medium`}
                    />
                    <button
                      type="button"
                      onClick={() => setColumns(draft.footer.columns.filter((_, i) => i !== index))}
                      className="ml-auto rounded-full px-3 py-1.5 text-sm text-muted hover:text-red-800"
                    >
                      Remove column
                    </button>
                  </div>
                  <LinkRows
                    links={column.links}
                    onChange={(links) => setColumns(draft.footer.columns.map((c, i) => (i === index ? { ...c, links } : c)))}
                    max={10}
                  />
                </div>
              ))}
              {draft.footer.columns.length < 3 && (
                <button
                  type="button"
                  onClick={() => setColumns([...draft.footer.columns, { title: "", links: [] }])}
                  className="rounded-full border border-dashed border-ink/25 px-4 py-2 text-sm text-muted transition-colors hover:border-ink/50 hover:text-ink"
                >
                  + Column
                </button>
              )}
            </div>
          </Section>

          <Section title="Search and sharing" description="How the store appears on Google and when its link is shared.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Page title" hint={<Counter value={draft.seo?.title ?? ""} max={70} />}>
                <input
                  value={draft.seo?.title ?? ""}
                  placeholder={`${draft.name} — ${content?.tagline ?? ""}`}
                  onChange={(e) => setSeo({ title: e.target.value })}
                  className={inputClass}
                />
              </Field>
              <Field label="Website address" hint="Once the store is live, e.g. https://yourbrand.com.">
                <input
                  value={draft.seo?.siteUrl ?? ""}
                  placeholder="https://"
                  onChange={(e) => setSeo({ siteUrl: e.target.value })}
                  className={`${inputClass} font-mono text-[13px]`}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Search description" hint={<Counter value={draft.seo?.description ?? ""} max={200} />}>
                <textarea
                  value={draft.seo?.description ?? ""}
                  placeholder={draft.description}
                  onChange={(e) => setSeo({ description: e.target.value })}
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </Field>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-ink/10 bg-white p-4 font-[arial,sans-serif]">
                <p className="text-xs text-[#4d5156]">{host}</p>
                <p className="mt-1 truncate text-lg text-[#1a0dab]">{title}</p>
                <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-[#4d5156]">{description}</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-ink/10 bg-white">
                <div className="grid aspect-[1200/630] place-items-center bg-surface text-[40px] text-ink">
                  {draft.seo?.ogImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.seo.ogImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted">No share image yet</span>
                  )}
                </div>
                <div className="border-t border-ink/10 px-3 py-2 font-[arial,sans-serif]">
                  <p className="text-[11px] uppercase text-[#65676b]">{host}</p>
                  <p className="truncate text-sm font-semibold text-[#050505]">{title}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <UploadButton accept=".png,.jpg,.jpeg,.webp" busy={assets.busy === "og"} onFile={(file) => assets.upload("og", file)}>
                {draft.seo?.ogImage ? "Replace share image" : "Upload share image"}
              </UploadButton>
              {draft.seo?.ogImage && (
                <button type="button" onClick={() => assets.remove({ seo: { ogImage: null } })} className="rounded-full px-3 py-2 text-sm text-muted hover:text-red-800">
                  Remove
                </button>
              )}
              <span className="text-xs text-muted">Cropped to 1200 × 630.</span>
            </div>
          </Section>
        </div>

        <aside className="flex flex-col lg:sticky lg:top-28 lg:max-h-[calc(100dvh-9rem)] lg:self-start">
          <p className="eyebrow mb-1 shrink-0 text-muted">Live preview</p>
          <div className="admin-list-scroll -mx-1 min-h-0 overflow-y-auto overscroll-contain px-1 py-3 lg:flex-1">
            <BrandPreview brand={draft} content={content} product={product} />
          </div>
        </aside>
      </div>

      <SaveBar dirty={dirty} state={state} error={error} onSave={save} onDiscard={discard} />
    </main>
  );
}
