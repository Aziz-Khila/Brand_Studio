"use client";

import { AnimatePresence, motion } from "motion/react";
import { Button } from "../ui";
import type { SaveState } from "./useContentDraft";

/** Floating glass bar that appears while there are unsaved edits (and briefly after saving). */
export function SaveBar({
  dirty,
  state,
  error,
  onSave,
  onDiscard,
}: {
  dirty: boolean;
  state: SaveState;
  error: string | null;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const visible = dirty || state === "saved" || state === "error";
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-3 bottom-4 z-30 mx-auto flex max-w-[640px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/60 bg-white/55 px-4 py-3 shadow-[0_24px_60px_-24px_rgba(23,22,20,0.5),inset_0_1px_0_rgba(255,255,255,0.8)] backdrop-blur-2xl backdrop-saturate-150 md:px-5"
          role="status"
        >
          <p className="text-sm">
            {state === "error" ? (
              <span className="text-red-800">{error}</span>
            ) : dirty ? (
              "Unsaved changes"
            ) : (
              <>
                Saved.{" "}
                <a href="/" target="_blank" rel="noreferrer" className="link-underline">
                  Reload the store
                </a>{" "}
                to see it.
              </>
            )}
          </p>
          {dirty && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onDiscard} disabled={state === "saving"}>
                Discard
              </Button>
              <Button onClick={onSave} disabled={state === "saving"}>
                {state === "saving" ? "Saving…" : "Save changes"}
              </Button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
