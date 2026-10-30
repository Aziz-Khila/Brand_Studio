"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { useEscape } from "@/hooks/useEscape";
import { Button } from "../ui";

type Result = { out: string; zip: string | null; files: number; fonts: string[] };

const glass =
  "rounded-2xl border border-white/60 bg-white/75 shadow-[0_24px_60px_-24px_rgba(23,22,20,0.45),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl backdrop-saturate-150";

/** Exports the brand as a standalone store project (scripts/export-brand.mjs) for the client. */
export function ExportDialog({ brandName, dirty, onClose }: { brandName: string; dirty: boolean; onClose: () => void }) {
  const [target, setTarget] = useState<{ out: string; exists: boolean } | null>(null);
  const [zip, setZip] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEscape(onClose, !busy);

  useEffect(() => {
    fetch("/api/admin/export")
      .then((response) => response.json())
      .then(setTarget)
      .catch(() => {});
  }, []);

  const post = async (body: object) => {
    const response = await fetch("/api/admin/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Export failed.");
    return data;
  };

  const exportNow = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await post({ zip }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-ink/25 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onPointerDown={(event) => !busy && event.target === event.currentTarget && onClose()}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
        initial={{ y: 16, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={`${glass} w-full max-w-[540px] space-y-5 p-6`}
      >
        <div>
          <h2 id="export-title" className="text-2xl font-semibold tracking-tight">
            Export client project
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            A standalone copy of {brandName}&apos;s store, ready to hand over: no studio, no image tools, no other brands, and only its three fonts.
          </p>
        </div>

        {result ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-700/20 bg-emerald-700/[0.06] p-4 text-sm">
              <p className="font-medium text-emerald-900">Exported {result.files} files.</p>
              <p className="mt-1 break-all font-mono text-[12px] text-ink/80">{result.out}</p>
              {result.zip && <p className="mt-1 break-all font-mono text-[12px] text-ink/80">{result.zip}</p>}
            </div>
            <div>
              <p className="eyebrow mb-2 text-muted">To try it</p>
              <pre className="overflow-x-auto rounded-xl bg-ink p-4 font-mono text-[12px] leading-relaxed text-on-ink">
                {`cd "${result.out}"\nnpm install\nnpm run dev`}
              </pre>
              <p className="mt-2 text-xs text-muted">Its README explains hosting on Vercel and where texts, products and colors live.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => post({ reveal: true }).catch((err) => setError(err.message))}>
                Show in folder
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-ink/10 bg-white/60 p-4 text-sm">
              <p className="eyebrow mb-1 text-muted">Destination</p>
              <p className="break-all font-mono text-[12px]">{target?.out ?? "…"}</p>
              {target?.exists && <p className="mt-2 text-xs text-muted">Already exported once: its files are replaced (a .git folder is kept).</p>}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={zip} onChange={(e) => setZip(e.target.checked)} className="accent-[var(--brand-ink)]" />
              Also create a .zip to send
            </label>
            {dirty && <p className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-900">This page has unsaved changes; save them first to include them.</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={exportNow} disabled={busy || !target}>
                {busy ? "Exporting…" : "Export"}
              </Button>
            </div>
          </>
        )}
        {error && <p className="whitespace-pre-wrap text-sm text-red-800">{error}</p>}
      </motion.div>
    </motion.div>,
    document.body,
  );
}
