"use client";

import { useState } from "react";
import { Segmented, checkerStyle } from "./ui";

type Backdrop = "store" | "checker" | "contrast" | "dark";

const BACKDROPS: { value: Backdrop; label: string }[] = [
  { value: "store", label: "Store" },
  { value: "checker", label: "Transparent" },
  { value: "contrast", label: "Red" },
  { value: "dark", label: "Dark" },
];

const backdropStyle = (backdrop: Backdrop) =>
  backdrop === "checker"
    ? checkerStyle
    : { background: { store: "var(--brand-bg)", contrast: "#c43b3b", dark: "#171614" }[backdrop] };

/** Front and back cut-outs in the same 640×760 frame the store uses. */
export function ResultPreview({
  front,
  back,
  initialBackdrop = "contrast",
}: {
  front: string;
  back: string;
  initialBackdrop?: Backdrop;
}) {
  const [backdrop, setBackdrop] = useState<Backdrop>(initialBackdrop);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">Red and dark backdrops make leftover background or halos easy to spot.</p>
        <Segmented value={backdrop} options={BACKDROPS} onChange={setBackdrop} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Front", src: front },
          { label: "Back", src: back },
        ].map((image) => (
          <figure key={image.label}>
            <div
              className="relative aspect-[640/760] overflow-hidden rounded-xl border border-ink/10"
              style={backdropStyle(backdrop)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt={image.label} className="absolute inset-0 h-full w-full object-contain" />
            </div>
            <figcaption className="eyebrow mt-2 text-muted">{image.label}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
