"use client";

import type { NavLink } from "@/brand/types";
import { inputClass } from "../ui";

export const isHref = (href: string) => /^(#[\w-]*|\/[^\s]*|https?:\/\/[^\s.]+\.[^\s]+|mailto:\S+@\S+|tel:\+?[\d\s()-]+)$/i.test(href.trim());

/** Store sections a menu link can jump to. */
export const SECTIONS = [
  { label: "Collection", href: "#collection" },
  { label: "Manifesto", href: "#manifesto" },
  { label: "Categories", href: "#categories" },
  { label: "Newsletter", href: "#footer" },
];

/** Editable list of name + address rows with reorder and remove. */
export function LinkRows({
  links,
  onChange,
  max,
  addLabel = "+ Link",
}: {
  links: NavLink[];
  onChange: (links: NavLink[]) => void;
  max: number;
  addLabel?: string;
}) {
  const edit = (index: number, patch: Partial<NavLink>) => onChange(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  const move = (index: number, offset: -1 | 1) => {
    const to = index + offset;
    if (to < 0 || to >= links.length) return;
    const next = [...links];
    [next[index], next[to]] = [next[to], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {links.map((link, index) => {
        const invalid = link.href.trim() !== "" && !isHref(link.href);
        return (
          <div key={index} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[150px_1fr_auto]">
            <input
              value={link.label}
              onChange={(e) => edit(index, { label: e.target.value })}
              placeholder="Name"
              aria-label="Link name"
              className={`${inputClass} col-span-2 sm:col-span-1`}
            />
            <input
              value={link.href}
              onChange={(e) => edit(index, { href: e.target.value })}
              placeholder="#section, /page or https://…"
              aria-label="Link address"
              aria-invalid={invalid}
              className={`${inputClass} font-mono text-[13px] ${invalid ? "border-red-700/50" : ""}`}
            />
            <div className="flex items-center">
              <button
                type="button"
                aria-label="Move up"
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="grid h-9 w-7 place-items-center text-muted hover:text-ink disabled:opacity-25"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Move down"
                disabled={index === links.length - 1}
                onClick={() => move(index, 1)}
                className="grid h-9 w-7 place-items-center text-muted hover:text-ink disabled:opacity-25"
              >
                ↓
              </button>
              <button
                type="button"
                aria-label={`Remove ${link.label || "link"}`}
                onClick={() => onChange(links.filter((_, i) => i !== index))}
                className="grid h-9 w-7 place-items-center text-muted hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2 pt-1">
        {SECTIONS.filter((section) => !links.some((link) => link.href === section.href)).map((section) => (
          <button
            key={section.href}
            type="button"
            disabled={links.length >= max}
            onClick={() => onChange([...links, section])}
            className="rounded-full border border-ink/15 bg-white/60 px-3 py-1 text-xs transition-colors hover:border-ink/40 disabled:opacity-40"
          >
            + {section.label}
          </button>
        ))}
        <button
          type="button"
          disabled={links.length >= max}
          onClick={() => onChange([...links, { label: "", href: "" }])}
          className="rounded-full border border-dashed border-ink/25 px-3 py-1 text-xs text-muted transition-colors hover:border-ink/50 hover:text-ink disabled:opacity-40"
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}
