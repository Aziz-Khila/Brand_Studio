"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { useBrand } from "@/components/providers/BrandProvider";
import { useEscape } from "@/hooks/useEscape";
import type { BrandSummary } from "@/app/api/admin/brands/route";
import { Button, Field, Segmented, inputClass } from "./ui";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const glass =
  "rounded-2xl border border-white/60 bg-white/70 shadow-[0_24px_60px_-24px_rgba(23,22,20,0.45),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl backdrop-saturate-150";

/** Studio brand picker: switch the brand being edited or start a new one. */
export function BrandSwitcher() {
  const brand = useBrand();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [brands, setBrands] = useState<BrandSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  useEscape(() => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    fetch("/api/admin/brands")
      .then((response) => response.json())
      .then((data: { brands: BrandSummary[] }) => setBrands(data.brands))
      .catch(() => setError("Couldn't list the brands."));
    const close = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const switchTo = async (id: string) => {
    if (id === brand.id) return setOpen(false);
    setError(null);
    const response = await fetch("/api/admin/brands", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: id }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return setError(data.error ?? "Couldn't switch.");
    // Fonts, colors and every cached page belong to the old brand: start fresh.
    window.location.reload();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Brand: ${brand.name}. Switch or create a brand`}
        className="flex items-center gap-2 rounded-full border border-ink/10 bg-white/50 py-1 pl-1 pr-2.5 text-[13px] font-medium transition-colors hover:bg-white/80"
      >
        <span className="h-6 w-6 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]" style={{ background: `linear-gradient(135deg, ${brand.colors.background} 50%, ${brand.colors.ink} 50%)` }} />
        <span className="hidden max-w-[120px] truncate sm:inline">{brand.name}</span>
        <span aria-hidden className="text-[10px] text-muted">▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={`${glass} absolute left-0 top-[calc(100%+10px)] z-40 w-[260px] origin-top-left p-1.5`}
          >
            <p className="eyebrow px-2.5 pb-1.5 pt-2 text-muted">Brands</p>
            {!brands && <p className="px-2.5 py-2 text-sm text-muted">Loading…</p>}
            <div className="max-h-[50vh] overflow-y-auto">
              {brands?.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  onClick={() => switchTo(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm transition-colors hover:bg-ink/[0.06] ${
                    item.id === brand.id ? "bg-ink/[0.06]" : ""
                  }`}
                >
                  <span
                    className="h-7 w-7 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]"
                    style={{ background: `linear-gradient(135deg, ${item.colors.background} 50%, ${item.colors.ink} 50%)` }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="block truncate font-mono text-[11px] text-muted">{item.id}</span>
                  </span>
                  {item.id === brand.id && <span className="text-xs text-muted">Editing</span>}
                </button>
              ))}
            </div>
            <div className="mt-1 border-t border-ink/10 pt-1">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  setCreating(true);
                }}
                className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm font-medium transition-colors hover:bg-ink/[0.06]"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full border border-dashed border-ink/30 text-muted">+</span>
                New brand
              </button>
            </div>
            {error && <p className="px-2.5 py-2 text-xs text-red-800">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Portaled: the glass header's backdrop-filter would otherwise trap this fixed overlay inside the bar. */}
      {creating && createPortal(<NewBrandDialog onClose={() => setCreating(false)} />, document.body)}
    </div>
  );
}

function NewBrandDialog({ onClose }: { onClose: () => void }) {
  const current = useBrand();
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [idTouched, setIdTouched] = useState(false);
  const [from, setFrom] = useState<"starter" | "current">("starter");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscape(onClose, true);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/admin/brands", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, id, from }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setBusy(false);
      return setError(data.error ?? "Couldn't create the brand.");
    }
    window.location.assign("/admin/brand");
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/25 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onPointerDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <motion.form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-brand-title"
        initial={{ y: 16, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 16, opacity: 0, scale: 0.98 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={`${glass} w-full max-w-[460px] space-y-5 p-6`}
      >
        <div>
          <h2 id="new-brand-title" className="text-2xl font-semibold tracking-tight">
            New brand
          </h2>
          <p className="mt-1 text-sm text-muted">It starts with an empty catalog and placeholder texts. The studio switches to it right away.</p>
        </div>
        <Field label="Brand name">
          <input
            autoFocus
            required
            maxLength={40}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!idTouched) setId(slugify(e.target.value));
            }}
            className={inputClass}
          />
        </Field>
        <Field label="Id" hint="Folder name and storage key. Lowercase letters, numbers and dashes.">
          <input
            required
            value={id}
            onChange={(e) => {
              setIdTouched(true);
              setId(slugify(e.target.value));
            }}
            className={`${inputClass} font-mono text-[13px]`}
          />
        </Field>
        <div>
          <p className="eyebrow mb-2 text-muted">Start from</p>
          <Segmented
            value={from}
            onChange={setFrom}
            options={[
              { value: "starter", label: "A neutral starter" },
              { value: "current", label: `${current.name}'s look` },
            ]}
          />
        </div>
        {error && <p className="text-sm text-red-800">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !name.trim() || !id}>
            {busy ? "Creating…" : "Create brand"}
          </Button>
        </div>
      </motion.form>
    </motion.div>
  );
}
