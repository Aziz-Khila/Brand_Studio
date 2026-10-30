"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BrandConfig } from "@/brand/types";
import type { SaveState } from "../content/useContentDraft";

/** The parts of brand.json edited as a draft (artwork uploads are saved immediately instead). */
const editable = (brand: BrandConfig) => ({
  name: brand.name,
  description: brand.description,
  locale: brand.locale,
  currency: brand.currency,
  freeShippingThreshold: brand.freeShippingThreshold ?? null,
  logo: { text: brand.logo.text },
  colors: brand.colors,
  typography: brand.typography,
  nav: brand.nav,
  footer: brand.footer,
  seo: { title: brand.seo?.title ?? "", description: brand.seo?.description ?? "", siteUrl: brand.seo?.siteUrl ?? "" },
});

export function useBrandDraft() {
  const router = useRouter();
  const [saved, setSaved] = useState<BrandConfig | null>(null);
  const [draft, setDraft] = useState<BrandConfig | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/brand")
      .then((response) => response.json())
      .then((data: { brand: BrandConfig }) => {
        setSaved(data.brand);
        setDraft(data.brand);
      });
  }, []);

  const dirty = Boolean(saved && draft && JSON.stringify(editable(saved)) !== JSON.stringify(editable(draft)));

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (state !== "saved") return;
    const timeout = window.setTimeout(() => setState("idle"), 4000);
    return () => window.clearTimeout(timeout);
  }, [state]);

  const update = useCallback((recipe: (draft: BrandConfig) => BrandConfig) => {
    setDraft((current) => (current ? recipe(current) : current));
    setState("idle");
  }, []);

  /** Takes artwork changes from the server while keeping unsaved edits. */
  const applyAssets = useCallback(
    (brand: BrandConfig) => {
      setSaved((current) => (current ? { ...current, logo: brand.logo, favicon: brand.favicon, seo: { ...current.seo, ogImage: brand.seo?.ogImage } } : brand));
      setDraft((current) =>
        current
          ? { ...current, logo: { ...brand.logo, text: current.logo.text }, favicon: brand.favicon, seo: { ...current.seo, ogImage: brand.seo?.ogImage } }
          : brand,
      );
      router.refresh();
    },
    [router],
  );

  const save = async () => {
    if (!draft) return;
    setState("saving");
    setError(null);
    const response = await fetch("/api/admin/brand", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editable(draft)),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setState("error");
      setError(data.error ?? "Couldn't save.");
      return;
    }
    setSaved(data.brand);
    setDraft(data.brand);
    setState("saved");
    // Re-renders the server layout so the admin itself picks up the new colors, fonts and logo.
    router.refresh();
  };

  const discard = () => {
    setDraft(saved);
    setState("idle");
    setError(null);
  };

  return { saved, draft, dirty, update, applyAssets, save, discard, state, error };
}
