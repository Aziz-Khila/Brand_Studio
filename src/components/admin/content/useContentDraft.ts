"use client";

import { useCallback, useEffect, useState } from "react";
import type { BrandContent } from "@/brand/types";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Loads content.json, keeps an editable copy of the given fields and saves only those
 * (so the Texts and Links pages never overwrite each other).
 */
export function useContentDraft<K extends keyof BrandContent>(keys: readonly K[]) {
  const [saved, setSaved] = useState<Pick<BrandContent, K> | null>(null);
  const [draft, setDraft] = useState<Pick<BrandContent, K> | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const pick = useCallback(
    (content: BrandContent) => Object.fromEntries(keys.map((key) => [key, content[key]])) as Pick<BrandContent, K>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keys.join()],
  );

  useEffect(() => {
    fetch("/api/admin/content")
      .then((response) => response.json())
      .then((data: { content: BrandContent }) => {
        setSaved(pick(data.content));
        setDraft(pick(data.content));
      });
  }, [pick]);

  const dirty = Boolean(saved && draft && JSON.stringify(saved) !== JSON.stringify(draft));

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

  const update = useCallback(<F extends K>(key: F, value: BrandContent[F]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setState("idle");
  }, []);

  const save = async () => {
    if (!draft) return;
    setState("saving");
    setError(null);
    const response = await fetch("/api/admin/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setState("error");
      setError(data.error ?? "Couldn't save.");
      return;
    }
    setSaved(pick(data.content));
    setDraft(pick(data.content));
    setState("saved");
  };

  const discard = () => {
    setDraft(saved);
    setState("idle");
    setError(null);
  };

  return { draft, dirty, update, save, discard, state, error };
}
