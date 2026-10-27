"use client";

import { useEffect, useRef, useState } from "react";
import { analyzeGarment, type GarmentAnalysis } from "@/lib/admin/analyze";
import {
  GARMENT_KINDS,
  backPrompt,
  frontPrompt,
  isFootwearKind,
  isLightColor,
  recolorPrompt,
  type GarmentKind,
  type RecolorInput,
} from "@/lib/admin/prompts";
import { PhotoSlot } from "./PhotoSlot";
import { PromptCard } from "./PromptCard";
import { ResultPreview } from "./ResultPreview";
import { Button, Field, Section, Segmented, inputClass } from "./ui";

type Side = "front" | "back";
type Photo = { file: File; url: string };
type Pair = Record<Side, Photo | null>;
export type Processed = { token: string; front: string; back: string; log: string[] };

/** Another color of the same product whose cut-outs can be recolored into this one. */
export type RecolorSource = { key: string; name: string; swatch: string; front: string; back: string };

const BACKGROUND_NOTES: Record<GarmentAnalysis["background"], string> = {
  checkerboard:
    "Fake checkerboard “transparency” detected. The prompts below replace it with a plain background, which cuts out far more cleanly.",
  plain: "Plain background detected. If the garment is already straight-on and uncropped, you can skip the AI edit.",
  transparent: "Real transparency detected. You can skip the AI edit and process these directly.",
};

async function processPhotos(front: File, back: File, ai: string, hood: boolean, footwear: boolean): Promise<Processed> {
  const form = new FormData();
  form.append("front", front);
  form.append("back", back);
  form.append("ai", ai);
  form.append("hood", String(hood));
  form.append("footwear", String(footwear));
  const response = await fetch("/api/admin/process", { method: "POST", body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error ?? "Processing failed."), { log: data.log ?? [] });
  return data as Processed;
}

/**
 * Steps 1–3 for one color: original photos → prompts for an AI editor → edited photos → cut-out.
 * Mount it with a `key` per color so its uploads never leak into another color.
 */
export function PhotoPipeline({
  kind,
  onKindChange,
  colorName,
  swatch,
  sources,
  onAnalysis,
  onProcessed,
}: {
  kind: GarmentKind;
  onKindChange: (kind: GarmentKind) => void;
  /** Name of the color being made; used in the prompts. */
  colorName: string;
  swatch: string;
  sources: RecolorSource[];
  onAnalysis: (analysis: GarmentAnalysis) => void;
  onProcessed: (result: Processed) => void;
}) {
  const [originals, setOriginals] = useState<Pair>({ front: null, back: null });
  const [edited, setEdited] = useState<Pair>({ front: null, back: null });
  const [analysis, setAnalysis] = useState<GarmentAnalysis | null>(null);
  const [light, setLight] = useState(isLightColor(swatch));
  const [removeLabels, setRemoveLabels] = useState(true);
  const [sourceKey, setSourceKey] = useState(sources[0]?.key ?? "");
  const [prints, setPrints] = useState<RecolorInput["prints"]>("keep");
  const [printColor, setPrintColor] = useState("");
  const [aiMode, setAiMode] = useState<"auto" | "force" | "off">("auto");
  const [hood, setHood] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Processed | null>(null);
  const [error, setError] = useState<{ message: string; log: string[] } | null>(null);

  const urls = useRef(new Set<string>());
  useEffect(() => {
    const created = urls.current;
    return () => created.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const setPhoto = (which: "originals" | "edited", side: Side, file: File | null) => {
    const update = which === "originals" ? setOriginals : setEdited;
    update((pair) => {
      if (pair[side]) URL.revokeObjectURL(pair[side].url);
      if (!file) return { ...pair, [side]: null };
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      return { ...pair, [side]: { file, url } };
    });
    setResult(null);
    setError(null);
    if (file && side === "front" && (which === "originals" || !originals.front)) {
      analyzeGarment(file)
        .then((found) => {
          setAnalysis(found);
          setLight(found.light);
          onAnalysis(found);
        })
        .catch(() => setAnalysis(null));
    }
  };

  const footwear = isFootwearKind(kind);
  /** Footwear is shot as the outer and inner side of one shoe instead of a front and a back. */
  const views = footwear
    ? { front: "outer side", back: "inner side", Front: "Outer side", Back: "Inner side" }
    : { front: "front", back: "back", Front: "Front", Back: "Back" };
  const promptColor = colorName.trim().toLowerCase() || analysis?.colorName || "";
  const input = { kind, colorName: promptColor, light, removeLabels };
  const source = sources.find((s) => s.key === sourceKey) ?? sources[0];

  const front = edited.front ?? originals.front;
  const back = edited.back ?? originals.back;

  const run = async () => {
    if (!front || !back) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const processed = await processPhotos(front.file, back.file, aiMode, hood && !footwear, footwear);
      setResult(processed);
      onProcessed(processed);
    } catch (failure) {
      setError({ message: (failure as Error).message, log: (failure as { log?: string[] }).log ?? [] });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section
        step="1"
        title="Original photos"
        description="Upload the front and back exactly as you have them: screenshots, supplier shots, phone photos. Skip this step if you recolor an existing color in step 2."
      >
        <div className="grid gap-6 md:grid-cols-[1fr_1fr_1.1fr]">
          <PhotoSlot
            label={views.Front}
            url={originals.front?.url ?? null}
            onFile={(file) => setPhoto("originals", "front", file)}
            onClear={() => setPhoto("originals", "front", null)}
          />
          <PhotoSlot
            label={views.Back}
            url={originals.back?.url ?? null}
            onFile={(file) => setPhoto("originals", "back", file)}
            onClear={() => setPhoto("originals", "back", null)}
          />
          <div className="space-y-4 text-sm">
            <p className="eyebrow text-muted">Detected</p>
            {analysis ? (
              <>
                <div className="flex items-center gap-3">
                  <span className="h-10 w-10 rounded-full border border-ink/15" style={{ background: analysis.hex }} />
                  <div>
                    <p className="font-semibold capitalize">{analysis.colorName}</p>
                    <p className="font-mono text-xs text-muted">
                      {analysis.hex.toUpperCase()} · {analysis.light ? "light garment" : "dark / colored garment"}
                    </p>
                  </div>
                </div>
                <p className="leading-relaxed text-muted">
                  {analysis.light && analysis.background !== "transparent"
                    ? "Light garment: don't skip the AI edit, a light background is too close to the garment to cut out cleanly."
                    : BACKGROUND_NOTES[analysis.background]}
                </p>
              </>
            ) : (
              <p className="text-muted">Add the front photo to detect the garment color and background.</p>
            )}
          </div>
        </div>
      </Section>

      <Section
        step="2"
        title="Prompts for your AI editor"
        description="Tuned to this garment. Run them in ChatGPT, Gemini or any image editor, then upload the results in step 3."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Garment type">
            <select value={kind} onChange={(e) => onKindChange(e.target.value as GarmentKind)} className={inputClass}>
              {(Object.keys(GARMENT_KINDS) as GarmentKind[]).map((key) => (
                <option key={key} value={key}>
                  {GARMENT_KINDS[key].label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Background" hint={light ? "Light garments need gray to separate cleanly." : undefined}>
            <Segmented
              value={light ? "gray" : "white"}
              options={[
                { value: "white", label: "White" },
                { value: "gray", label: "Gray (light garment)" },
              ]}
              onChange={(value) => setLight(value === "gray")}
            />
          </Field>
          <Field label="Labels">
            <label className="flex items-center gap-2 py-2 text-sm">
              <input type="checkbox" checked={removeLabels} onChange={(e) => setRemoveLabels(e.target.checked)} />
              Remove brand / size labels
            </label>
          </Field>
        </div>

        <p className="mt-6 text-sm font-semibold">From new photos</p>
        <p className="mt-1 text-sm text-muted">
          {footwear
            ? "One shoe, side profile. Outer side prompt + a photo of the outer side. Then inner side prompt + a photo of the inner side + the outer result, so both match."
            : "Front prompt + original front. Then back prompt + original back + the front result, so both sides match."}
        </p>
        <div className="mt-3 grid gap-4 xl:grid-cols-2">
          <PromptCard title={views.Front} attach={`original ${views.front} photo`} text={frontPrompt(input)} />
          <PromptCard
            title={views.Back}
            attach={`original ${views.back} photo, then the edited ${views.front}`}
            text={backPrompt(input)}
          />
        </div>

        <div className="mt-8 rounded-xl border border-ink/10 p-4">
          <p className="text-sm font-semibold">Or recolor an existing color</p>
          {source ? (
            <>
              <p className="mt-1 text-sm text-muted">
                Download the cut-outs of another color, run this prompt on each (front, then back), and upload the results in step 3. It
                uses this color&apos;s name and swatch.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <Field label="Start from">
                  <select value={source.key} onChange={(e) => setSourceKey(e.target.value)} className={inputClass}>
                    {sources.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.name || "Unnamed color"}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Prints and logos">
                  <select value={prints} onChange={(e) => setPrints(e.target.value as RecolorInput["prints"])} className={inputClass}>
                    <option value="keep">Keep as they are</option>
                    <option value="tonal">Tonal (match the fabric)</option>
                    <option value="custom">Another color…</option>
                  </select>
                </Field>
                {prints === "custom" && (
                  <Field label="Print color">
                    <input value={printColor} onChange={(e) => setPrintColor(e.target.value)} placeholder="e.g. off-white" className={inputClass} />
                  </Field>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {(["front", "back"] as const).map((side) => (
                  <a
                    key={side}
                    href={source[side]}
                    download={`${(source.name || "color").toLowerCase().replace(/\s+/g, "-")}-${side}.png`}
                    className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-4 py-2 text-sm font-medium hover:border-ink/40"
                  >
                    ↓ {source.name || "Source"} {side}
                  </a>
                ))}
              </div>
              <div className="mt-4">
                <PromptCard
                  title={`Recolor to ${colorName.trim() || "this color"}`}
                  attach={`the ${source.name || "source"} ${views.front}, then the ${views.back} (one at a time)`}
                  text={recolorPrompt(
                    { ...input, colorName: source.name.toLowerCase(), light: isLightColor(source.swatch) },
                    { name: colorName.trim().toLowerCase(), hex: swatch, prints, printColor },
                  )}
                />
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">Once another color of this product has images, you can recolor it into this one from here.</p>
          )}
        </div>
      </Section>

      <Section
        step="3"
        title="Edited photos & cut-out"
        description="Upload what the AI gave you. Empty slots fall back to the originals from step 1. Processing removes the background and frames both sides identically."
      >
        <div className="grid gap-6 md:grid-cols-[1fr_1fr_1.1fr]">
          <PhotoSlot
            label={`Edited ${views.front}`}
            url={edited.front?.url ?? null}
            onFile={(file) => setPhoto("edited", "front", file)}
            onClear={() => setPhoto("edited", "front", null)}
            placeholder={originals.front ? `Optional — the original ${views.front} is used if empty` : undefined}
          />
          <PhotoSlot
            label={`Edited ${views.back}`}
            url={edited.back?.url ?? null}
            onFile={(file) => setPhoto("edited", "back", file)}
            onClear={() => setPhoto("edited", "back", null)}
            placeholder={originals.back ? `Optional — the original ${views.back} is used if empty` : undefined}
          />
          <div className="space-y-4">
            <Field label="Background removal">
              <Segmented
                value={aiMode}
                options={[
                  { value: "auto", label: "Auto" },
                  { value: "force", label: "AI only" },
                  { value: "off", label: "No AI" },
                ]}
                onChange={setAiMode}
              />
            </Field>
            <p className="text-xs leading-relaxed text-muted">
              Auto detects transparent, checkerboard and plain backgrounds and double-checks with a local AI model. Use “AI only” if
              something is left behind.
            </p>
            {footwear ? (
              <p className="text-xs leading-relaxed text-muted">
                Footwear framing: the shoe is centered and stands on a ground line just above the floor shadow.
              </p>
            ) : (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={hood} onChange={(e) => setHood(e.target.checked)} />
                Force hood framing
              </label>
            )}
            <Button onClick={run} disabled={!front || !back || processing} className="w-full py-3">
              {processing ? "Processing… (up to a minute)" : "Process photos"}
            </Button>
            {result && (
              <ul className="space-y-1 font-mono text-[11px] text-muted">
                {result.log.map((line, index) => (
                  <li key={index}>{line}</li>
                ))}
              </ul>
            )}
            {error && (
              <div className="rounded-lg border border-red-700/30 bg-red-50 p-3 text-xs text-red-800">
                <p className="font-semibold">{error.message}</p>
                {error.log.map((line, index) => (
                  <p key={index} className="mt-1 font-mono">
                    {line}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {result && (
          <div className="mt-8 border-t border-ink/10 pt-6">
            <p className="mb-3 text-sm font-semibold">Result — kept for this color, saved with the product</p>
            <ResultPreview front={result.front} back={result.back} />
          </div>
        )}
      </Section>
    </div>
  );
}
