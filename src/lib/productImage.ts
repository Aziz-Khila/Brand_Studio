import { getImageProps } from "next/image";

/**
 * How wide each kind of product photo is drawn, so the browser downloads a matching size.
 * Photos are stored as 1280×1520 PNG masters; Next.js serves resized WebP copies of them.
 */
const SIZES = {
  /** Carousel piece: up to 540px wide (see the layout in Showcase.tsx). */
  showcase: "(max-width: 767px) 82vw, (max-width: 1023px) 46vw, 540px",
  /** Quick view main image: left half of the panel. */
  quickView: "(max-width: 767px) 74vw, 42vw",
  /** Category grid card. */
  card: "(max-width: 767px) 50vw, (max-width: 1279px) 33vw, 25vw",
  /** Cart lines, swatches, view toggles. */
  thumb: "96px",
} as const;

export type ProductImageSize = keyof typeof SIZES;

/** `<img>` attributes (src, srcSet, sizes, dimensions) for an optimized product photo. */
export function productImage(src: string, size: ProductImageSize, { eager = false } = {}) {
  const { props } = getImageProps({
    src,
    alt: "",
    width: 1280,
    height: 1520,
    sizes: SIZES[size],
    loading: eager ? "eager" : "lazy",
  });
  // Callers supply their own alt text and styles.
  const { src: url, srcSet, sizes, width, height, loading, decoding } = props;
  return { src: url, srcSet, sizes, width, height, loading, decoding };
}

/** Warms the browser cache with the exact file a product photo will use at this size. */
export function preloadProductImage(src: string, size: ProductImageSize) {
  const { srcSet, sizes, src: fallback } = productImage(src, size, { eager: true });
  return new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = image.onerror = () => resolve();
    if (sizes) image.sizes = sizes;
    if (srcSet) image.srcset = srcSet;
    image.src = fallback;
  });
}
