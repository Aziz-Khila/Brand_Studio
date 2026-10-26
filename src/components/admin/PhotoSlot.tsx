"use client";

import { useRef, useState } from "react";
import { checkerStyle } from "./ui";

export function PhotoSlot({
  label,
  url,
  onFile,
  onClear,
  placeholder = "Drop a photo or click to browse",
}: {
  label: string;
  url: string | null;
  onFile: (file: File) => void;
  onClear: () => void;
  placeholder?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file && file.type.startsWith("image/")) onFile(file);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="eyebrow text-muted">{label}</span>
        {url && (
          <button type="button" onClick={onClear} className="eyebrow text-muted hover:text-ink">
            Remove
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          pick(event.dataTransfer.files);
        }}
        className={`relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-xl border border-dashed transition-colors ${
          over ? "border-ink bg-ink/5" : "border-ink/20 hover:border-ink/45"
        }`}
        style={url ? checkerStyle : undefined}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="absolute inset-0 h-full w-full object-contain" />
        ) : (
          <span className="px-6 text-center text-sm text-muted">{placeholder}</span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          pick(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
