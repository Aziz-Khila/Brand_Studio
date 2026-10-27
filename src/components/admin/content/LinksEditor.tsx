"use client";

import type { NavLink } from "@/brand/types";
import { Field, Section, inputClass } from "../ui";
import { SaveBar } from "./SaveBar";
import { useContentDraft } from "./useContentDraft";

const KEYS = ["socials"] as const;

/** Common destinations: picking one fills the name and the start of the address. */
const PLATFORMS = [
  { label: "Instagram", prefix: "https://instagram.com/" },
  { label: "Facebook", prefix: "https://facebook.com/" },
  { label: "TikTok", prefix: "https://tiktok.com/@" },
  { label: "X", prefix: "https://x.com/" },
  { label: "YouTube", prefix: "https://youtube.com/@" },
  { label: "Pinterest", prefix: "https://pinterest.com/" },
  { label: "LinkedIn", prefix: "https://linkedin.com/company/" },
  { label: "Threads", prefix: "https://threads.net/@" },
  { label: "Snapchat", prefix: "https://snapchat.com/add/" },
  { label: "WhatsApp", prefix: "https://wa.me/" },
  { label: "Email", prefix: "mailto:" },
  { label: "Website", prefix: "https://" },
];

const isLink = (href: string) => /^(https?:\/\/[^\s.]+\.[^\s]+|mailto:\S+@\S+|tel:\+?[\d\s()-]+)$/i.test(href.trim());

export function LinksEditor() {
  const { draft, dirty, update, save, discard, state, error } = useContentDraft(KEYS);

  if (!draft) return <p className="mx-auto max-w-[1100px] px-4 py-16 text-sm text-muted md:px-6">Loading…</p>;

  const links = draft.socials;
  const setLinks = (next: NavLink[]) => update("socials", next);
  const edit = (index: number, patch: Partial<NavLink>) => setLinks(links.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  const move = (index: number, offset: -1 | 1) => {
    const to = index + offset;
    if (to < 0 || to >= links.length) return;
    const next = [...links];
    [next[index], next[to]] = [next[to], next[index]];
    setLinks(next);
  };
  const used = new Set(links.map((link) => link.label.toLowerCase()));

  return (
    <main className="mx-auto max-w-[1100px] space-y-6 px-4 pb-32 pt-8 md:px-6">
      <div>
        <p className="eyebrow text-muted">Footer</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">Links</h1>
        <p className="mt-2 max-w-[60ch] text-sm text-muted">
          Social and contact links listed under “Follow” in the footer. They open in a new tab.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Section title="Your links" description="Name and full address for each. Use the arrows to set the order.">
          {links.length === 0 && <p className="text-sm text-muted">No links yet. Add one below.</p>}
          <ol className="space-y-3">
            {links.map((link, index) => {
              const valid = isLink(link.href);
              return (
                <li key={index} className="rounded-xl border border-ink/10 bg-white/50 p-3 md:p-4">
                  <div className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-end">
                    <Field label="Name">
                      <input value={link.label} onChange={(e) => edit(index, { label: e.target.value })} className={inputClass} />
                    </Field>
                    <Field
                      label="Address"
                      hint={
                        link.href && !valid ? (
                          <span className="text-red-800">Use a full address: https://…, mailto:… or tel:…</span>
                        ) : undefined
                      }
                    >
                      <input
                        value={link.href}
                        onChange={(e) => edit(index, { href: e.target.value })}
                        placeholder="https://instagram.com/yourbrand"
                        className={`${inputClass} font-mono text-[13px]`}
                      />
                    </Field>
                    <div className="flex items-center justify-end">
                      {valid && (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="mr-1 rounded-full px-2 py-1 text-xs text-muted hover:text-ink"
                          title="Test this link"
                        >
                          Test ↗
                        </a>
                      )}
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        className="grid h-9 w-8 place-items-center text-muted hover:text-ink disabled:opacity-25"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={index === links.length - 1}
                        onClick={() => move(index, 1)}
                        className="grid h-9 w-8 place-items-center text-muted hover:text-ink disabled:opacity-25"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${link.label || "link"}`}
                        onClick={() => setLinks(links.filter((_, i) => i !== index))}
                        className="grid h-9 w-8 place-items-center text-muted hover:text-red-800"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 border-t border-ink/10 pt-5">
            <p className="eyebrow mb-3 text-muted">Add a link</p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.filter((platform) => !used.has(platform.label.toLowerCase())).map((platform) => (
                <button
                  key={platform.label}
                  type="button"
                  disabled={links.length >= 12}
                  onClick={() => setLinks([...links, { label: platform.label, href: platform.prefix }])}
                  className="rounded-full border border-ink/15 bg-white/60 px-3.5 py-1.5 text-sm transition-colors hover:border-ink/40 hover:bg-white disabled:opacity-40"
                >
                  + {platform.label}
                </button>
              ))}
              <button
                type="button"
                disabled={links.length >= 12}
                onClick={() => setLinks([...links, { label: "", href: "https://" }])}
                className="rounded-full border border-dashed border-ink/25 px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-ink/50 hover:text-ink disabled:opacity-40"
              >
                + Custom
              </button>
            </div>
          </div>
        </Section>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-2xl bg-ink p-6 text-on-ink shadow-[0_30px_60px_-30px_rgba(23,22,20,0.6)]">
            <p className="eyebrow mb-1 text-on-ink/40">Preview</p>
            <p className="eyebrow mb-5 mt-5 text-on-ink/40">Follow</p>
            <ul className="space-y-2.5">
              {links.map((link, index) => (
                <li key={index} className={`eyebrow ${isLink(link.href) && link.label ? "" : "opacity-40"}`}>
                  {link.label || "Unnamed link"}
                </li>
              ))}
              {links.length === 0 && <li className="eyebrow text-on-ink/40">Nothing yet</li>}
            </ul>
          </div>
        </aside>
      </div>

      <SaveBar dirty={dirty} state={state} error={error} onSave={save} onDiscard={discard} />
    </main>
  );
}
