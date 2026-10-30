"use client";

import { useState } from "react";
import type { BrandColors } from "@/brand/types";
import { contrast } from "@/lib/color";
import { inputClass } from "../ui";

const PRESETS: { name: string; colors: BrandColors }[] = [
  { name: "Atelier", colors: { background: "#ECE8E1", surface: "#DDD6CA", ink: "#171614", muted: "#6F6A62", accent: "#8A6A52", onInk: "#ECE8E1" } },
  { name: "Chalk", colors: { background: "#F7F7F5", surface: "#E9E9E6", ink: "#111111", muted: "#6B6B6B", accent: "#2F4BFF", onInk: "#F7F7F5" } },
  { name: "Noir", colors: { background: "#0F0F0F", surface: "#1E1E1D", ink: "#F2F0EB", muted: "#8C8A85", accent: "#C8B68E", onInk: "#0F0F0F" } },
  { name: "Sage", colors: { background: "#E6E9E1", surface: "#D3D9CC", ink: "#1E2A22", muted: "#5F6B61", accent: "#6E8B5E", onInk: "#E6E9E1" } },
  { name: "Clay", colors: { background: "#F1E6DA", surface: "#E4D2BF", ink: "#2A1A12", muted: "#7C6556", accent: "#B5562F", onInk: "#F1E6DA" } },
  { name: "Harbor", colors: { background: "#E8EDF1", surface: "#D2DCE4", ink: "#0E1C2B", muted: "#5C6B7A", accent: "#2D6A9F", onInk: "#E8EDF1" } },
  { name: "Blush", colors: { background: "#F4E9E7", surface: "#E8D4D0", ink: "#2B1B1E", muted: "#7D6266", accent: "#C0606F", onInk: "#F4E9E7" } },
];

const FIELDS: { key: keyof BrandColors; label: string; hint: string }[] = [
  { key: "background", label: "Background", hint: "Page color" },
  { key: "surface", label: "Surface", hint: "Panels, image wells, big logo" },
  { key: "ink", label: "Ink", hint: "Text, lines, footer" },
  { key: "muted", label: "Muted", hint: "Secondary text" },
  { key: "accent", label: "Accent", hint: "Hovers and highlights" },
  { key: "onInk", label: "On ink", hint: "Text on the footer and ticker" },
];

/** Pairs that carry text, with the WCAG minimum for body copy. */
const CHECKS: { label: string; text: keyof BrandColors; on: keyof BrandColors }[] = [
  { label: "Text on background", text: "ink", on: "background" },
  { label: "Muted on background", text: "muted", on: "background" },
  { label: "Footer text", text: "onInk", on: "ink" },
  { label: "Text on surface", text: "ink", on: "surface" },
];

const isHex = (value: string) => /^#[0-9a-f]{6}$/i.test(value);
const same = (a: BrandColors, b: BrandColors) => FIELDS.every(({ key }) => a[key].toUpperCase() === b[key].toUpperCase());

export function ColorEditor({ colors, onChange }: { colors: BrandColors; onChange: (colors: BrandColors) => void }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-3 text-muted">Start from a palette</p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const active = same(preset.colors, colors);
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => onChange(preset.colors)}
                className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition-colors ${
                  active ? "border-ink bg-white/80" : "border-ink/15 bg-white/50 hover:border-ink/40"
                }`}
              >
                <span className="flex overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]">
                  {(["background", "surface", "ink", "accent"] as const).map((key) => (
                    <span key={key} className="h-6 w-3" style={{ background: preset.colors[key] }} />
                  ))}
                </span>
                {preset.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {FIELDS.map((field) => (
          <ColorField
            key={field.key}
            label={field.label}
            hint={field.hint}
            value={colors[field.key]}
            onChange={(value) => onChange({ ...colors, [field.key]: value })}
          />
        ))}
      </div>

      <div>
        <p className="eyebrow mb-3 text-muted">Readability</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {CHECKS.map((check) => {
            const ratio = contrast(colors[check.text], colors[check.on]);
            const level = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "Large text only" : "Too low";
            const ok = ratio >= 4.5;
            return (
              <li key={check.label} className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white/50 p-2.5">
                <span
                  className="grid h-9 w-12 shrink-0 place-items-center rounded-lg text-sm font-semibold shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
                  style={{ background: colors[check.on], color: colors[check.text] }}
                >
                  Aa
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  {check.label}
                  <span className="block text-xs text-muted tabular-nums">{ratio.toFixed(1)} : 1</span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    ok ? "bg-emerald-700/10 text-emerald-800" : "bg-red-700/10 text-red-800"
                  }`}
                >
                  {level}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function ColorField({ label, hint, value, onChange }: { label: string; hint: string; value: string; onChange: (value: string) => void }) {
  // The hex box can hold half-typed values; only complete colors reach the draft.
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(value);
  if (value !== shown) {
    setShown(value);
    setText(value);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white/50 p-2.5">
      <label className="relative h-14 w-14 shrink-0 cursor-pointer overflow-hidden rounded-lg shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]" style={{ background: value }}>
        <span className="sr-only">{label} color</span>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={hint}>
          {label}
        </p>
        <input
          value={text}
          onChange={(e) => {
            const next = e.target.value.trim();
            setText(next);
            const hex = next.startsWith("#") ? next : `#${next}`;
            if (isHex(hex)) onChange(hex.toUpperCase());
          }}
          onBlur={() => setText(value)}
          spellCheck={false}
          maxLength={7}
          aria-label={`${label} hex value`}
          className={`${inputClass} mt-1 !py-1 font-mono text-[13px] uppercase`}
        />
      </div>
    </div>
  );
}
