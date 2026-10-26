"use client";

import { useState } from "react";
import { Button } from "./ui";

export function PromptCard({ title, attach, text }: { title: string; attach: string; text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex min-w-0 flex-col rounded-xl border border-ink/10 bg-white/60">
      <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-4 py-3">
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-muted">Attach: {attach}</p>
        </div>
        <Button variant={copied ? "ghost" : "solid"} onClick={copy} className="shrink-0">
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="max-h-80 overflow-auto whitespace-pre-wrap px-4 py-3 font-mono text-[11.5px] leading-relaxed text-ink/80">
        {text}
      </pre>
    </div>
  );
}
