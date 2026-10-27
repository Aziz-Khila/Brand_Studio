"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import { useLenis } from "lenis/react";
import { formatPrice, type Product } from "@/brand";
import { useContent } from "@/components/providers/ContentProvider";
import { ScrollTrigger } from "@/lib/gsap";
import { useStore } from "@/components/providers/StoreProvider";
import { ColorSwatches } from "@/components/commerce/ColorSwatches";

const pad = (value: number) => String(value).padStart(2, "0");
const pieces = (count: number) => `${count} ${count === 1 ? "piece" : "pieces"}`;
const EASE = [0.16, 1, 0.3, 1] as const;

type Category = { key: string; label: string; products: Product[] };

/** Groups the catalog by category (case-insensitive), in the order categories first appear. */
function groupByCategory(products: Product[]): Category[] {
  const groups = new Map<string, Category>();
  for (const product of products) {
    const label = product.category.trim() || "Other";
    const key = label.toLowerCase();
    const group = groups.get(key) ?? { key, label, products: [] };
    group.products.push(product);
    groups.set(key, group);
  }
  return [...groups.values()];
}

const list: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 1, ease: EASE } },
};

export function Categories() {
  const { products } = useStore();
  const { season } = useContent();
  const categories = useMemo(() => groupByCategory(products), [products]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selected = categories.find((c) => c.key === selectedKey) ?? null;
  const sectionRef = useRef<HTMLElement>(null);
  const lenis = useLenis();

  const open = (key: string | null) => {
    setSelectedKey(key);
    const section = sectionRef.current;
    if (section && section.getBoundingClientRect().top < 0) lenis?.scrollTo(section, { offset: -40, duration: 1.1 });
  };

  // The section changes height; scroll-driven effects further down (header over the footer) need new positions.
  useEffect(() => {
    const timeout = window.setTimeout(() => ScrollTrigger.refresh(), 900);
    return () => window.clearTimeout(timeout);
  }, [selectedKey]);

  return (
    <section ref={sectionRef} id="categories" className="px-5 pb-[18vh] pt-[8vh] md:px-8">
      <div className="flex flex-col gap-4 border-b border-ink pb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <div className="eyebrow mb-3 flex items-center gap-2 text-muted">
            <span>(02)</span>
            {selected ? (
              <button type="button" onClick={() => open(null)} className="link-underline pb-0.5 text-ink">
                ← All categories
              </button>
            ) : (
              <span>Shop by category</span>
            )}
          </div>
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h2
                key={selected?.key ?? "all"}
                className="font-display text-[clamp(48px,13vw,190px)] [overflow-wrap:anywhere] sm:text-[clamp(64px,11vw,190px)]"
                initial={{ y: "100%" }}
                whileInView={{ y: 0 }}
                viewport={{ once: true }}
                exit={{ y: "-100%", transition: { duration: 0.45, ease: [0.7, 0, 0.84, 0] } }}
                transition={{ duration: 1.1, ease: EASE }}
              >
                {selected ? selected.label : "Categories"}
              </motion.h2>
            </AnimatePresence>
          </div>
        </div>
        <p className="eyebrow shrink-0 text-muted sm:mb-3 sm:text-right">
          {selected ? pieces(selected.products.length) : `${categories.length} categories · ${pieces(products.length)}`}
          <br />
          {season}
        </p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {selected ? (
          <CategoryGrid key={selected.key} category={selected} />
        ) : (
          <CategoryList key="all" categories={categories} onOpen={open} />
        )}
      </AnimatePresence>
    </section>
  );
}

/* ------------------------------------------------------------ all categories */

function CategoryList({ categories, onOpen }: { categories: Category[]; onOpen: (key: string) => void }) {
  const { colorOf } = useStore();

  return (
    <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0, y: -20, transition: { duration: 0.4 } }}>
      <motion.ul variants={list} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "0px 0px -15% 0px" }}>
        {categories.map((category, i) => (
          <motion.li key={category.key} variants={rise} className="overflow-hidden border-b border-ink/15">
            <button
              type="button"
              data-cursor="Open"
              onClick={() => onOpen(category.key)}
              className="group relative grid w-full grid-cols-12 items-center gap-x-4 gap-y-2 py-5 text-left md:py-7"
            >
              <span className="absolute inset-0 origin-bottom scale-y-0 bg-ink transition-transform duration-700 ease-expo group-hover:scale-y-100" />
              <span className="eyebrow relative col-span-2 text-muted transition-colors duration-500 group-hover:text-on-ink/60 md:col-span-1 md:pl-3">
                {pad(i + 1)}
              </span>
              <span className="font-display relative col-span-10 text-[clamp(36px,5.4vw,84px)] transition-[translate,color] duration-700 ease-expo group-hover:translate-x-3 group-hover:text-on-ink md:col-span-6">
                {category.label}
              </span>
              <span className="relative col-span-6 col-start-3 flex items-center md:col-span-3 md:col-start-auto">
                {category.products.slice(0, 4).map((product, index) => (
                  <span
                    key={product.id}
                    className="-ml-3 h-14 w-12 overflow-hidden rounded-[3px] bg-surface ring-2 ring-bg transition-[translate,box-shadow] duration-500 ease-expo first:ml-0 group-hover:ring-ink md:h-[68px] md:w-14"
                    style={{ transitionDelay: `${index * 40}ms` }}
                  >
                    <img src={colorOf(product).images.front} alt="" className="h-full w-full object-contain p-1" />
                  </span>
                ))}
                {category.products.length > 4 && (
                  <span className="eyebrow ml-3 text-muted transition-colors duration-500 group-hover:text-on-ink/60">
                    +{category.products.length - 4}
                  </span>
                )}
              </span>
              <span className="eyebrow relative col-span-4 flex items-center justify-end gap-3 transition-colors duration-500 group-hover:text-on-ink md:col-span-2 md:pr-3">
                {pieces(category.products.length)}
                <span className="transition-transform duration-500 ease-expo group-hover:translate-x-1">→</span>
              </span>
            </button>
          </motion.li>
        ))}
      </motion.ul>
    </motion.div>
  );
}

/* ------------------------------------------------------------ one category */

function CategoryGrid({ category }: { category: Category }) {
  return (
    <motion.ul
      variants={list}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: 20, transition: { duration: 0.35 } }}
      className="grid grid-cols-2 gap-x-4 gap-y-10 pt-8 md:grid-cols-3 md:gap-x-6 md:gap-y-14 md:pt-10 xl:grid-cols-4"
    >
      {category.products.map((product) => (
        <motion.li key={product.id} variants={rise}>
          <ProductCard product={product} />
        </motion.li>
      ))}
    </motion.ul>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { openQuickView, colorOf, selectColor } = useStore();
  const color = colorOf(product);

  return (
    <div className="group">
      <button
        type="button"
        data-cursor="View"
        onClick={() => openQuickView(product.id)}
        aria-label={`${product.name} in ${color.name}`}
        className="relative block aspect-[640/760] w-full overflow-hidden bg-surface/70"
      >
        {product.badge && (
          <span className="eyebrow absolute left-3 top-3 z-10 flex items-center gap-1.5 text-accent md:left-4 md:top-4">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            {product.badge}
          </span>
        )}
        {product.colors.map((option) => (
          <span
            key={option.id}
            className={`absolute inset-0 transition-opacity duration-500 ${option.id === color.id ? "opacity-100" : "opacity-0"}`}
          >
            <img
              src={option.images.front}
              alt=""
              className="absolute inset-[6%] h-[88%] w-[88%] object-contain transition-[opacity,scale] duration-700 ease-expo group-hover:scale-[1.03] group-hover:opacity-0"
            />
            <img
              src={option.images.back}
              alt=""
              className="absolute inset-[6%] h-[88%] w-[88%] scale-[0.97] object-contain opacity-0 transition-[opacity,scale] duration-700 ease-expo group-hover:scale-100 group-hover:opacity-100"
            />
          </span>
        ))}
        <span className="eyebrow absolute inset-x-3 bottom-3 translate-y-2 text-center opacity-0 transition-[opacity,translate] duration-500 ease-expo group-hover:translate-y-0 group-hover:opacity-100">
          Quick view
        </span>
      </button>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display line-clamp-3 text-[clamp(20px,1.8vw,28px)] sm:line-clamp-2">{product.name}</p>
          <p className="eyebrow mt-1.5 text-muted">
            {product.colors.length > 1 ? `${color.name} · ${product.colors.length} colors` : color.name}
          </p>
        </div>
        <p className="eyebrow shrink-0 pt-1 tabular-nums">{formatPrice(product.price)}</p>
      </div>
      <ColorSwatches
        colors={product.colors}
        selectedId={color.id}
        onSelect={(colorId) => selectColor(product.id, colorId)}
        size={14}
        className="-ml-1 mt-2"
      />
    </div>
  );
}
