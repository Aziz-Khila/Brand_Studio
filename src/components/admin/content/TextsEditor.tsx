"use client";

import { Ticker } from "@/components/ui/Ticker";
import { Field, Section, inputClass } from "../ui";
import { SaveBar } from "./SaveBar";
import { useContentDraft } from "./useContentDraft";

const KEYS = ["tagline", "season", "location", "manifesto", "ticker", "newsletter"] as const;

function Counter({ value, max }: { value: string; max: number }) {
  return (
    <span className={`tabular-nums ${value.length > max ? "text-red-800" : ""}`}>
      {value.length}/{max}
    </span>
  );
}

export function TextsEditor() {
  const { draft, dirty, update, save, discard, state, error } = useContentDraft(KEYS);

  if (!draft) return <p className="mx-auto max-w-[1100px] px-4 py-16 text-sm text-muted md:px-6">Loading…</p>;

  const setTicker = (items: string[]) => update("ticker", items);
  const moveTicker = (index: number, offset: -1 | 1) => {
    const items = [...draft.ticker];
    const to = index + offset;
    if (to < 0 || to >= items.length) return;
    [items[index], items[to]] = [items[to], items[index]];
    setTicker(items);
  };

  return (
    <main className="mx-auto max-w-[1100px] space-y-6 px-4 pb-32 pt-8 md:px-6">
      <div>
        <p className="eyebrow text-muted">Site copy</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">Texts</h1>
        <p className="mt-2 max-w-[60ch] text-sm text-muted">
          Everything written on the store outside of the products. Changes go live on the next page load after saving.
        </p>
      </div>

      <Section title="Brand line" description="Shown under the logo in the carousel, in the preloader, the mobile menu and the footer.">
        <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
          <Field label="Tagline" hint={<Counter value={draft.tagline} max={80} />}>
            <input value={draft.tagline} onChange={(e) => update("tagline", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Season / drop" hint="Header and footer, e.g. Drop 02 — SS27.">
            <input value={draft.season} onChange={(e) => update("season", e.target.value)} className={inputClass} />
          </Field>
          <Field label="Location">
            <input value={draft.location} onChange={(e) => update("location", e.target.value)} className={inputClass} />
          </Field>
        </div>
        <div className="mt-6 rounded-xl bg-ink px-6 py-8 text-on-ink">
          <p className="font-display text-[clamp(28px,4vw,52px)]">{draft.tagline || "Your tagline"}</p>
          <p className="eyebrow mt-3 text-on-ink/50">
            {draft.season} — {draft.location}
          </p>
        </div>
      </Section>

      <Section title="Manifesto" description="The statement under the hero. Its words light up one by one as visitors scroll.">
        <div className="grid gap-4 md:grid-cols-[1fr_3fr]">
          <Field label="Label" hint="Shown as “(01) Label”.">
            <input
              value={draft.manifesto.label}
              onChange={(e) => update("manifesto", { ...draft.manifesto, label: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Text" hint={<Counter value={draft.manifesto.text} max={600} />}>
            <textarea
              value={draft.manifesto.text}
              onChange={(e) => update("manifesto", { ...draft.manifesto, text: e.target.value })}
              rows={5}
              className={`${inputClass} text-[15px] leading-relaxed`}
            />
          </Field>
        </div>
        <div className="mt-6 grid gap-4 rounded-xl border border-ink/10 bg-bg/70 p-6 md:grid-cols-[1fr_3fr]">
          <p className="eyebrow text-muted">(01) {draft.manifesto.label}</p>
          <p className="text-[clamp(20px,2.4vw,30px)] font-medium leading-[1.1] tracking-[-0.02em]">{draft.manifesto.text}</p>
        </div>
      </Section>

      <Section title="Moving bar" description="The black band that scrolls under the hero. Keep each message short.">
        <div className="overflow-hidden rounded-xl">
          <Ticker items={draft.ticker.filter((item) => item.trim()).length ? draft.ticker.filter((item) => item.trim()) : ["Your message"]} />
        </div>
        <ol className="mt-6 space-y-2">
          {draft.ticker.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <span className="eyebrow w-6 shrink-0 text-muted">{String(index + 1).padStart(2, "0")}</span>
              <input
                value={item}
                onChange={(e) => setTicker(draft.ticker.map((value, i) => (i === index ? e.target.value : value)))}
                placeholder="e.g. Free shipping over €150"
                className={inputClass}
              />
              <div className="flex shrink-0 items-center">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => moveTicker(index, -1)}
                  className="grid h-9 w-8 place-items-center text-muted hover:text-ink disabled:opacity-25"
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index === draft.ticker.length - 1}
                  onClick={() => moveTicker(index, 1)}
                  className="grid h-9 w-8 place-items-center text-muted hover:text-ink disabled:opacity-25"
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label="Remove"
                  disabled={draft.ticker.length < 2}
                  onClick={() => setTicker(draft.ticker.filter((_, i) => i !== index))}
                  className="grid h-9 w-8 place-items-center text-muted hover:text-red-800 disabled:opacity-25"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setTicker([...draft.ticker, ""])}
          disabled={draft.ticker.length >= 16}
          className="mt-3 rounded-full border border-dashed border-ink/25 px-4 py-2 text-sm text-muted transition-colors hover:border-ink/50 hover:text-ink disabled:opacity-40"
        >
          + Add message
        </button>
      </Section>

      <Section title="Newsletter" description="The sign-up block at the top of the footer.">
        <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
          <Field label="Title">
            <input
              value={draft.newsletter.title}
              onChange={(e) => update("newsletter", { ...draft.newsletter, title: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Text" hint={<Counter value={draft.newsletter.text} max={160} />}>
            <input
              value={draft.newsletter.text}
              onChange={(e) => update("newsletter", { ...draft.newsletter, text: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <SaveBar dirty={dirty} state={state} error={error} onSave={save} onDiscard={discard} />
    </main>
  );
}
