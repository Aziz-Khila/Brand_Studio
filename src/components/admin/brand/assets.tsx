"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { BrandConfig } from "@/brand/types";
import { FitText } from "@/components/ui/Logo";

/** A single-color SVG (logo or mark) painted in the current text color, like the store's <Logo>. */
export function MaskImage({ src, aspectRatio, className = "", style }: { src: string; aspectRatio: number; className?: string; style?: CSSProperties }) {
  const mask = `url("${src}") center / contain no-repeat`;
  return <span aria-hidden className={`inline-block bg-current ${className}`} style={{ aspectRatio, mask, WebkitMask: mask, ...style }} />;
}

/** The brand's logo from a draft: traced image when there is one, otherwise the text in the display font. */
export function DraftLogo({ brand, className = "", fit = false }: { brand: BrandConfig; className?: string; fit?: boolean }) {
  if (brand.logo.image) return <MaskImage src={brand.logo.image} aspectRatio={brand.logo.aspectRatio ?? 3} className={className} />;
  if (fit) return <FitText text={brand.logo.text} className={`font-display leading-none ${className}`} />;
  return <span className="font-display whitespace-nowrap leading-none">{brand.logo.text}</span>;
}

type Upload = (kind: "logo" | "mark" | "og", file: File, extra?: Record<string, string>) => Promise<void>;

/** Sends artwork to /api/admin/brand/assets, which processes and saves it right away. */
export function useAssetUpload(onSaved: (brand: BrandConfig) => void) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload: Upload = async (kind, file, extra = {}) => {
    setBusy(kind);
    setError(null);
    const form = new FormData();
    form.set("kind", kind);
    form.set("file", file);
    for (const [key, value] of Object.entries(extra)) form.set(key, value);
    try {
      const response = await fetch("/api/admin/brand/assets", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Upload failed.");
      onSaved(data.brand);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  /** Removes artwork (logo image, mark or share image) and saves right away. */
  const remove = async (patch: Record<string, unknown>) => {
    setError(null);
    const response = await fetch("/api/admin/brand", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) setError(data.error ?? "Couldn't remove it.");
    else onSaved(data.brand);
  };

  return { upload, remove, busy, error };
}

export function UploadButton({
  accept,
  busy,
  onFile,
  children,
}: {
  accept: string;
  busy: boolean;
  onFile: (file: File) => void;
  children: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-on-ink transition-colors hover:bg-ink/85 disabled:cursor-wait disabled:opacity-50"
      >
        {busy ? "Processing…" : children}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </>
  );
}
