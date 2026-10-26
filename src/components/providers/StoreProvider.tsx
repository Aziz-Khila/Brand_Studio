"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { brand, getColor, type Product, type ProductColor } from "@/brand";

export type CartLine = {
  productId: string;
  colorId: string;
  size: string;
  quantity: number;
};

/** What makes a cart line unique. */
export type LineId = Pick<CartLine, "productId" | "colorId" | "size">;

const sameLine = (a: LineId, b: LineId) => a.productId === b.productId && a.colorId === b.colorId && a.size === b.size;

type StoreValue = {
  products: Product[];
  getProduct: (productId: string) => Product | null;

  /** Color currently picked for a product, shared by the carousel, index and quick view. */
  colorOf: (product: Product) => ProductColor;
  selectColor: (productId: string, colorId: string) => void;

  introDone: boolean;
  setIntroDone: (done: boolean) => void;

  quickViewProduct: Product | null;
  openQuickView: (productId: string) => void;
  closeQuickView: () => void;

  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;

  lines: CartLine[];
  addToCart: (line: LineId) => void;
  setQuantity: (line: LineId, quantity: number) => void;
  removeLine: (line: LineId) => void;
  itemCount: number;
  subtotal: number;
};

const StoreContext = createContext<StoreValue | null>(null);
const storageKey = `${brand.id}:cart`;

export function StoreProvider({ products, children }: { products: Product[]; children: ReactNode }) {
  const getProduct = useCallback(
    (productId: string) => products.find((product) => product.id === productId) ?? null,
    [products],
  );
  const [introDone, setIntroDone] = useState(false);
  const [quickViewId, setQuickViewId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        // Carts saved before colors existed have no colorId; they get the product's default color.
        const restored = (JSON.parse(saved) as Partial<CartLine>[]).flatMap((line) => {
          const product = line.productId ? getProduct(line.productId) : null;
          if (!product || !line.size || !line.quantity) return [];
          return [{ productId: product.id, colorId: getColor(product, line.colorId).id, size: line.size, quantity: line.quantity }];
        });
        setLines(restored);
      }
    } catch {
      // Ignore unreadable storage.
    }
    setHydrated(true);
  }, [getProduct]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(storageKey, JSON.stringify(lines));
  }, [lines, hydrated]);

  const selectColor = useCallback((productId: string, colorId: string) => {
    setSelectedColors((current) => (current[productId] === colorId ? current : { ...current, [productId]: colorId }));
  }, []);

  const colorOf = useCallback((product: Product) => getColor(product, selectedColors[product.id]), [selectedColors]);

  const addToCart = useCallback((id: LineId) => {
    setLines((current) => {
      const existing = current.find((line) => sameLine(line, id));
      if (existing) {
        return current.map((line) => (line === existing ? { ...line, quantity: line.quantity + 1 } : line));
      }
      return [...current, { ...id, quantity: 1 }];
    });
  }, []);

  const removeLine = useCallback((id: LineId) => {
    setLines((current) => current.filter((line) => !sameLine(line, id)));
  }, []);

  const setQuantity = useCallback(
    (id: LineId, quantity: number) => {
      if (quantity <= 0) return removeLine(id);
      setLines((current) =>
        current.map((line) => (sameLine(line, id) ? { ...line, quantity: Math.min(quantity, 9) } : line)),
      );
    },
    [removeLine],
  );

  const value = useMemo<StoreValue>(() => {
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = lines.reduce((sum, line) => sum + (getProduct(line.productId)?.price ?? 0) * line.quantity, 0);
    return {
      products,
      getProduct,
      colorOf,
      selectColor,
      introDone,
      setIntroDone,
      quickViewProduct: quickViewId ? getProduct(quickViewId) : null,
      openQuickView: setQuickViewId,
      closeQuickView: () => setQuickViewId(null),
      cartOpen,
      setCartOpen,
      lines,
      addToCart,
      setQuantity,
      removeLine,
      itemCount,
      subtotal,
    };
  }, [products, getProduct, colorOf, selectColor, introDone, quickViewId, cartOpen, lines, addToCart, setQuantity, removeLine]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside <StoreProvider>");
  return context;
}
