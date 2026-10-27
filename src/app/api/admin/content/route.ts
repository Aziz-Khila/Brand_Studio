import type { BrandContent, NavLink } from "@/brand/types";
import { loadContent, saveContent } from "@/brand/content";
import { adminEnabled, notFound } from "@/lib/admin/catalog";

const bad = (error: string) => Response.json({ error }, { status: 400 });

const text = (value: unknown, label: string, max: number, required = true): string => {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && !result) throw new Error(`${label} can't be empty.`);
  if (result.length > max) throw new Error(`${label} is too long (max ${max} characters).`);
  return result;
};

const isLink = (href: string) => /^(https?:\/\/[^\s.]+\.[^\s]+|mailto:\S+@\S+|tel:\+?[\d\s()-]+)$/i.test(href);

/** Validates the parts present in `patch` and merges them over the saved content. */
function merge(current: BrandContent, patch: Record<string, unknown>): BrandContent {
  const next = { ...current };
  if ("tagline" in patch) next.tagline = text(patch.tagline, "The tagline", 80);
  if ("season" in patch) next.season = text(patch.season, "The season", 40);
  if ("location" in patch) next.location = text(patch.location, "The location", 40);
  if ("ticker" in patch) {
    if (!Array.isArray(patch.ticker)) throw new Error("Invalid ticker.");
    // Blank rows (an added message left empty) are simply dropped.
    next.ticker = patch.ticker
      .filter((item) => typeof item === "string" && item.trim())
      .map((item, i) => text(item, `Ticker message ${i + 1}`, 60));
    if (!next.ticker.length) throw new Error("Add at least one ticker message.");
    if (next.ticker.length > 16) throw new Error("Keep the ticker to 16 messages or fewer.");
  }
  if ("manifesto" in patch) {
    const manifesto = (patch.manifesto ?? {}) as Record<string, unknown>;
    next.manifesto = { label: text(manifesto.label, "The manifesto label", 30), text: text(manifesto.text, "The manifesto", 600) };
  }
  if ("newsletter" in patch) {
    const newsletter = (patch.newsletter ?? {}) as Record<string, unknown>;
    next.newsletter = {
      title: text(newsletter.title, "The newsletter title", 40),
      text: text(newsletter.text, "The newsletter text", 160),
    };
  }
  if ("socials" in patch) {
    if (!Array.isArray(patch.socials)) throw new Error("Invalid links.");
    next.socials = patch.socials.map((raw, i): NavLink => {
      const link = (raw ?? {}) as Record<string, unknown>;
      const label = text(link.label, `Link ${i + 1} name`, 30);
      const href = text(link.href, `${label} address`, 300);
      if (!isLink(href)) throw new Error(`${label}: enter a full address starting with https://, mailto: or tel:.`);
      return { label, href };
    });
    if (next.socials.length > 12) throw new Error("Keep it to 12 links or fewer.");
  }
  return next;
}

export async function GET() {
  if (!adminEnabled()) return notFound();
  return Response.json({ content: await loadContent() });
}

export async function PATCH(request: Request) {
  if (!adminEnabled()) return notFound();
  const patch = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!patch || typeof patch !== "object") return bad("Nothing to save.");
  try {
    const content = merge(await loadContent(), patch);
    await saveContent(content);
    return Response.json({ content });
  } catch (error) {
    return bad((error as Error).message);
  }
}
