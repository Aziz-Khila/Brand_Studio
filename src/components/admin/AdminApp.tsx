"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product, ProductSize } from "@/brand/types";
import { describeColor, type GarmentAnalysis } from "@/lib/admin/analyze";
import { GARMENT_KINDS, isFootwearKind, kindFromCategory, type GarmentKind } from "@/lib/admin/prompts";
import { PhotoPipeline, type Processed, type RecolorSource } from "./PhotoPipeline";
import { ProductList } from "./ProductList";
import { ResultPreview } from "./ResultPreview";
import { Button, Field, Section, Segmented, inputClass } from "./ui";

const SIZE_PRESETS = {
  letters: ["XS", "S", "M", "L", "XL", "XXL"],
  waist: ["28", "30", "32", "34", "36"],
  eu: ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"],
  one: ["One size"],
};
type SizePreset = keyof typeof SIZE_PRESETS | "custom";

type Draft = {
  name: string;
  id: string;
  category: string;
  price: string;
  badge: string;
  description: string;
  details: string;
};

type ColorDraft = {
  key: string;
  /** Id of a saved color; it keeps its id (and image files) when renamed. */
  savedId: string | null;
  name: string;
  swatch: string;
  sizes: ProductSize[];
  images: { front: string; back: string } | null;
  /** Processed but not saved yet. */
  pending: Processed | null;
};

const emptyDraft = (): Draft => ({ name: "", id: "", category: "", price: "", badge: "New", description: "", details: "" });

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const newKey = () => Math.random().toString(36).slice(2, 10);
const colorId = (color: ColorDraft) => color.savedId ?? slugify(color.name);

const newColor = (labels: string[]): ColorDraft => ({
  key: newKey(),
  savedId: null,
  name: "",
  swatch: "#888888",
  sizes: labels.map((label) => ({ label, available: true })),
  images: null,
  pending: null,
});

const presetOf = (labels: string[]): SizePreset =>
  (Object.keys(SIZE_PRESETS) as (keyof typeof SIZE_PRESETS)[]).find((key) => SIZE_PRESETS[key].join(",") === labels.join(",")) ??
  "custom";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status})`);
  return data as T;
}

export function AdminApp({ locale, currency }: { locale: string; currency: string }) {
  const formatPrice = useMemo(
    () => (value: number) =>
      new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: value % 1 === 0 ? 0 : 2 }).format(value),
    [locale, currency],
  );

  const [products, setProducts] = useState<Product[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = products.find((p) => p.id === editingId) ?? null;

  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [touched, setTouched] = useState({ id: false, category: false });
  const [kind, setKind] = useState<GarmentKind>("hoodie");
  const [sizeLabels, setSizeLabels] = useState(SIZE_PRESETS.letters);
  const [sizePreset, setSizePreset] = useState<SizePreset>("letters");

  const [colors, setColors] = useState<ColorDraft[]>(() => [newColor(SIZE_PRESETS.letters)]);
  const [activeKey, setActiveKey] = useState<string>(() => "");
  /** Bumped to remount the photo steps with empty uploads. */
  const [pipelineRun, setPipelineRun] = useState(0);
  const [replacing, setReplacing] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const active = colors.find((c) => c.key === activeKey) ?? colors[0];

  useEffect(() => {
    api<{ products: Product[] }>("/api/admin/products").then((data) => setProducts(data.products));
  }, []);

  const resetMessages = () => {
    setSaveError(null);
    setNotice(null);
  };

  const focusColor = (key: string) => {
    setActiveKey(key);
    setReplacing(false);
    setPipelineRun((n) => n + 1);
  };

  const load = (product: Product, focusId?: string) => {
    setEditingId(product.id);
    setDraft({
      name: product.name,
      id: product.id,
      category: product.category,
      price: String(product.price),
      badge: product.badge ?? "",
      description: product.description,
      details: product.details.join("\n"),
    });
    setTouched({ id: true, category: true });
    const guess = kindFromCategory(product.category);
    setKind(product.kind === "footwear" && !isFootwearKind(guess) ? "sneakers" : guess);
    const labels = product.colors[0]?.sizes.map((s) => s.label) ?? SIZE_PRESETS.letters;
    setSizeLabels(labels);
    setSizePreset(presetOf(labels));
    const drafts = product.colors.map((color) => ({
      key: newKey(),
      savedId: color.id,
      name: color.name,
      swatch: color.swatch,
      sizes: color.sizes,
      images: color.images,
      pending: null,
    }));
    setColors(drafts);
    focusColor((drafts.find((d) => d.savedId === focusId) ?? drafts[0]).key);
    resetMessages();
  };

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setTouched({ id: false, category: false });
    setKind("hoodie");
    setSizeLabels(SIZE_PRESETS.letters);
    setSizePreset("letters");
    const first = newColor(SIZE_PRESETS.letters);
    setColors([first]);
    focusColor(first.key);
    resetMessages();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const select = (product: Product) => {
    load(product);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* ------------------------------------------------------------ colors */

  const updateColor = (key: string, patch: Partial<ColorDraft>) =>
    setColors((list) => list.map((c) => (c.key === key ? { ...c, ...patch } : c)));

  const addColor = () => {
    const color = newColor(sizeLabels);
    setColors((list) => [...list, color]);
    focusColor(color.key);
  };

  const removeColor = (color: ColorDraft) => {
    if (colors.length < 2) return;
    if (!window.confirm(`Remove “${color.name || "this color"}”? It disappears from the store when you save.`)) return;
    const rest = colors.filter((c) => c.key !== color.key);
    setColors(rest);
    if (color.key === active.key) focusColor(rest[0].key);
  };

  const moveColor = (key: string, offset: -1 | 1) =>
    setColors((list) => {
      const from = list.findIndex((c) => c.key === key);
      const to = from + offset;
      if (to < 0 || to >= list.length) return list;
      const next = [...list];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });

  const applySizes = (preset: SizePreset, labels: string[]) => {
    setSizePreset(preset);
    setSizeLabels(labels);
    setColors((list) =>
      list.map((c) => ({
        ...c,
        sizes: labels.map((label) => ({ label, available: c.sizes.find((s) => s.label === label)?.available ?? true })),
      })),
    );
  };

  /** Switching between clothing and footwear on a new piece also swaps the default size run. */
  const changeKind = (next: GarmentKind) => {
    setKind(next);
    if (editingId || isFootwearKind(next) === isFootwearKind(kind)) return;
    if (isFootwearKind(next) && sizePreset === "letters") applySizes("eu", SIZE_PRESETS.eu);
    else if (!isFootwearKind(next) && sizePreset === "eu") applySizes("letters", SIZE_PRESETS.letters);
  };

  const onAnalysis = (analysis: GarmentAnalysis) => {
    if (active.name.trim()) return;
    updateColor(active.key, { name: capitalize(analysis.colorName), swatch: analysis.hex });
  };

  const onProcessed = (result: Processed) => updateColor(active.key, { pending: result });

  const sources: RecolorSource[] = colors
    .filter((c) => c.key !== active.key && (c.pending || c.images))
    .map((c) => ({ key: c.key, name: c.name, swatch: c.swatch, front: (c.pending ?? c.images)!.front, back: (c.pending ?? c.images)!.back }));

  /* ------------------------------------------------------------ save */

  const id = touched.id ? draft.id : slugify(draft.name);
  const category = touched.category ? draft.category : GARMENT_KINDS[kind].category;
  const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const unnamed = colors.find((c) => !c.name.trim());
  const withoutImages = colors.find((c) => !c.pending && !c.images);
  const ids = colors.map(colorId);
  const problem = !draft.name.trim()
    ? "Name the product."
    : !id
      ? "Set an id."
      : draft.price === ""
        ? "Set a price."
        : unnamed
          ? "Every color needs a name."
          : withoutImages
            ? `${withoutImages.name}: process its photos first.`
            : new Set(ids).size !== ids.length
              ? "Two colors have the same name."
              : null;

  const save = async () => {
    setSaving(true);
    resetMessages();
    try {
      const data = await api<{ product: Product; products: Product[] }>("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalId: editingId,
          product: {
            ...draft,
            id,
            category,
            price: Number(draft.price),
            details: draft.details.split("\n"),
            ...(isFootwearKind(kind) ? { kind: "footwear" } : {}),
            colors: colors.map((c) => ({
              id: colorId(c),
              name: c.name,
              swatch: c.swatch,
              sizes: c.sizes,
              ...(c.pending ? { token: c.pending.token } : { images: c.images }),
            })),
          },
        }),
      });
      setProducts(data.products);
      load(data.product, colorId(active));
      setNotice(editingId ? "Saved. Reload the store to see it." : "Added to the store. Reload the store to see it.");
    } catch (error) {
      setSaveError((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const move = async (productId: string, offset: -1 | 1) => {
    const order = products.map((p) => p.id);
    const from = order.indexOf(productId);
    const to = from + offset;
    if (to < 0 || to >= order.length) return;
    [order[from], order[to]] = [order[to], order[from]];
    const data = await api<{ products: Product[] }>("/api/admin/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: order }),
    });
    setProducts(data.products);
  };

  const remove = async () => {
    if (!editing || !window.confirm(`Delete “${editing.name}”, all its colors and images? This can't be undone.`)) return;
    const data = await api<{ products: Product[] }>(`/api/admin/products?id=${encodeURIComponent(editing.id)}`, { method: "DELETE" });
    setProducts(data.products);
    startNew();
  };

  /* ------------------------------------------------------------ render */

  const activeImages = active.pending ?? active.images;
  const showPipeline = replacing || !activeImages;

  return (
    <div>
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-8 md:px-6 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <ProductList
            products={products}
            selectedId={editingId}
            formatPrice={formatPrice}
            onSelect={select}
            onNew={startNew}
            onMove={move}
          />
        </aside>

        <main className="min-w-0 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-muted">{editing ? "Editing" : "New product"}</p>
              <h1 className="mt-1 text-4xl font-semibold tracking-tight">{draft.name.trim() || "Untitled piece"}</h1>
            </div>
            {editing && (
              <Button variant="danger" onClick={remove}>
                Delete product
              </Button>
            )}
          </div>

          <Section
            title="Colors"
            description="Each color has its own photos and stock. The first one is shown by default on the store."
          >
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
              {colors.map((color, index) => {
                const images = color.pending ?? color.images;
                const selected = color.key === active.key;
                return (
                  <div
                    key={color.key}
                    className={`group relative rounded-xl border p-2 transition-colors ${
                      selected ? "border-ink bg-white/60" : "border-ink/10 hover:border-ink/35"
                    }`}
                  >
                    <button type="button" onClick={() => focusColor(color.key)} className="block w-full text-left">
                      <span className="relative block aspect-[640/760] overflow-hidden rounded-lg bg-surface/50">
                        {images ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={images.front} alt="" className="absolute inset-0 h-full w-full object-contain" />
                        ) : (
                          <span className="absolute inset-0 grid place-items-center px-3 text-center text-xs text-muted">No photos yet</span>
                        )}
                      </span>
                      <span className="mt-2 flex items-center gap-2 px-1">
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]"
                          style={{ background: color.swatch }}
                        />
                        <span className="truncate text-sm font-semibold">{color.name || "Unnamed color"}</span>
                      </span>
                      <span className="mt-0.5 block px-1 text-xs text-muted">
                        {index === 0 ? "Default · " : ""}
                        {color.pending ? "New photos, unsaved" : color.images ? `${color.sizes.filter((s) => s.available).length}/${color.sizes.length} sizes in stock` : "Needs photos"}
                      </span>
                    </button>
                    <span className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {index > 0 && (
                        <button
                          type="button"
                          aria-label="Move left"
                          onClick={() => moveColor(color.key, -1)}
                          className="grid h-7 w-7 place-items-center rounded-full bg-bg/90 text-xs shadow"
                        >
                          ←
                        </button>
                      )}
                      {index < colors.length - 1 && (
                        <button
                          type="button"
                          aria-label="Move right"
                          onClick={() => moveColor(color.key, 1)}
                          className="grid h-7 w-7 place-items-center rounded-full bg-bg/90 text-xs shadow"
                        >
                          →
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={addColor}
                className="flex min-h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-ink/25 text-sm text-muted transition-colors hover:border-ink/50 hover:text-ink"
              >
                <span className="text-2xl leading-none">+</span>
                Add color
              </button>
            </div>
          </Section>

          <Section
            title={`Color · ${active.name.trim() || "New color"}`}
            description="Name and swatch shown to shoppers, and which sizes are in stock in this color."
            aside={
              colors.length > 1 ? (
                <Button variant="danger" onClick={() => removeColor(active)}>
                  Remove color
                </Button>
              ) : undefined
            }
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.4fr]">
              <Field label="Color name">
                <input
                  value={active.name}
                  onChange={(e) => updateColor(active.key, { name: e.target.value })}
                  placeholder="e.g. Forest green"
                  className={inputClass}
                />
              </Field>
              <Field label="Swatch">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/i.test(active.swatch) ? active.swatch : "#888888"}
                    onChange={(e) => updateColor(active.key, { swatch: e.target.value })}
                    className="h-9 w-12 cursor-pointer rounded border border-ink/15 bg-transparent"
                  />
                  <input
                    value={active.swatch}
                    onChange={(e) => updateColor(active.key, { swatch: e.target.value })}
                    className={`${inputClass} font-mono`}
                  />
                  <button
                    type="button"
                    onClick={() => updateColor(active.key, { name: capitalize(describeColor(active.swatch)) })}
                    className="eyebrow shrink-0 text-muted hover:text-ink"
                    title="Name it after the swatch"
                  >
                    Auto name
                  </button>
                </div>
              </Field>
              <div>
                <span className="eyebrow text-muted">In stock</span>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {active.sizes.map((size) => (
                    <button
                      key={size.label}
                      type="button"
                      onClick={() =>
                        updateColor(active.key, {
                          sizes: active.sizes.map((s) => (s.label === size.label ? { ...s, available: !s.available } : s)),
                        })
                      }
                      className={`min-w-12 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        size.available ? "border-ink bg-ink text-on-ink" : "border-ink/20 text-muted line-through"
                      }`}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted">Click a size to mark it sold out in this color.</p>
              </div>
            </div>

            {activeImages && (
              <div className="mt-8 border-t border-ink/10 pt-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold">{active.pending ? "New photos — saved with the product" : "Current photos"}</p>
                  {replacing ? (
                    <Button variant="ghost" onClick={() => setReplacing(false)}>
                      Keep these photos
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setReplacing(true);
                        setPipelineRun((n) => n + 1);
                      }}
                    >
                      Replace photos
                    </Button>
                  )}
                </div>
                {!replacing && <ResultPreview front={activeImages.front} back={activeImages.back} initialBackdrop="store" />}
              </div>
            )}
          </Section>

          {showPipeline && (
            <PhotoPipeline
              key={`${active.key}-${pipelineRun}`}
              kind={kind}
              onKindChange={changeKind}
              colorName={active.name}
              swatch={active.swatch}
              sources={sources}
              onAnalysis={onAnalysis}
              onProcessed={onProcessed}
            />
          )}

          <Section title="Product details" description="Shared by every color. Saving updates the store.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Name">
                <input value={draft.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Parade Jacket" className={inputClass} />
              </Field>
              <Field label="Id" hint="Used in image file names.">
                <input
                  value={id}
                  onChange={(e) => {
                    setTouched((t) => ({ ...t, id: true }));
                    update("id", slugify(e.target.value) + (e.target.value.endsWith("-") ? "-" : ""));
                  }}
                  className={`${inputClass} font-mono`}
                />
              </Field>
              <Field label="Price">
                <input
                  type="number"
                  min={0}
                  step="1"
                  value={draft.price}
                  onChange={(e) => update("price", e.target.value)}
                  placeholder="160"
                  className={inputClass}
                />
              </Field>
              <Field label="Category">
                <input
                  value={category}
                  onChange={(e) => {
                    setTouched((t) => ({ ...t, category: true }));
                    update("category", e.target.value);
                  }}
                  className={inputClass}
                />
              </Field>
              <Field label="Badge" hint="Leave empty for none.">
                <input value={draft.badge} onChange={(e) => update("badge", e.target.value)} placeholder="New, Last pieces…" className={inputClass} />
              </Field>
              <div>
                <span className="eyebrow text-muted">Size run</span>
                <div className="mt-1.5 space-y-2">
                  <Segmented
                    value={sizePreset}
                    options={[
                      { value: "letters", label: "XS–XXL" },
                      { value: "waist", label: "28–36" },
                      { value: "eu", label: "EU 36–46" },
                      { value: "one", label: "One size" },
                      { value: "custom", label: "Custom" },
                    ]}
                    onChange={(preset) => (preset === "custom" ? setSizePreset("custom") : applySizes(preset, SIZE_PRESETS[preset]))}
                  />
                  {sizePreset === "custom" && (
                    <input
                      key={sizeLabels.join(",")}
                      defaultValue={sizeLabels.join(", ")}
                      onBlur={(e) =>
                        applySizes(
                          "custom",
                          e.target.value
                            .split(",")
                            .map((label) => label.trim())
                            .filter(Boolean),
                        )
                      }
                      placeholder="S, M, L"
                      className={inputClass}
                    />
                  )}
                </div>
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <Field label="Description">
                  <textarea value={draft.description} onChange={(e) => update("description", e.target.value)} rows={3} className={inputClass} />
                </Field>
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <Field label="Details" hint="One per line.">
                  <textarea
                    value={draft.details}
                    onChange={(e) => update("details", e.target.value)}
                    rows={4}
                    placeholder={"Heavyweight cotton fleece\nRibbed cuffs and hem"}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-ink/10 pt-6">
              <Button onClick={save} disabled={Boolean(problem) || saving} className="px-6 py-3">
                {saving ? "Saving…" : editing ? "Save changes" : "Add to store"}
              </Button>
              {problem && <p className="text-sm text-muted">{problem}</p>}
              {saveError && <p className="text-sm text-red-800">{saveError}</p>}
              {notice && (
                <p className="text-sm">
                  {notice}{" "}
                  <a href="/" target="_blank" rel="noreferrer" className="link-underline">
                    View store ↗
                  </a>
                </p>
              )}
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
