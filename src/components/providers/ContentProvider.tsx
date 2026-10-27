"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { BrandContent } from "@/brand/types";

const ContentContext = createContext<BrandContent | null>(null);

/** Makes the brand's editable copy (content.json, loaded on the server) available to the store. */
export function ContentProvider({ content, children }: { content: BrandContent; children: ReactNode }) {
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const content = useContext(ContentContext);
  if (!content) throw new Error("useContent must be used inside <ContentProvider>");
  return content;
}
