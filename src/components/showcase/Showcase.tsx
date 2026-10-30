"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Product } from "@/brand";
import { useBrand } from "@/components/providers/BrandProvider";
import { productImage } from "@/lib/productImage";
import { useOnScreen } from "@/hooks/useOnScreen";
import { gsap } from "@/lib/gsap";
import { useStore } from "@/components/providers/StoreProvider";
import { ShowcaseInfo, ShowcaseIntro, type Side } from "./ShowcaseInfo";
import { ShowcaseArrow } from "./ShowcaseArrow";

/** Product images share the 640×760 frame produced by scripts/prepare-garment.mjs. */
const IMAGE_RATIO = 760 / 640;

/** The carousel opens on the brand mark (when the brand has one), followed by every product. */
type Slide = { kind: "brand" } | { kind: "product"; product: Product };

type Layout = {
  width: number;
  height: number;
  /** Vertical center of the product area, in px from the stage top. */
  centerY: number;
  /** Distance between the centers of the selected piece and its neighbors. */
  spacing: number;
  mobile: boolean;
};

const pad = (value: number) => String(value).padStart(2, "0");

export function Showcase() {
  const { products } = useStore();
  if (!products.length) return null;
  // The carousel's animation loop is built for a fixed set of pieces; rebuild it when that changes.
  return <Carousel key={products.map((product) => product.id).join()} products={products} />;
}

function Carousel({ products }: { products: Product[] }) {
  const { introDone, openQuickView, quickViewProduct, cartOpen, colorOf, selectColor } = useStore();
  const brand = useBrand();

  const mark = brand.logo.mark;
  const slides: Slide[] = [
    ...(mark ? [{ kind: "brand" as const }] : []),
    ...products.map((product) => ({ kind: "product" as const, product })),
  ];
  /** Number of slides before the first product. */
  const leading = mark ? 1 : 0;
  const COUNT = slides.length;
  /** Distance at which pieces have fully faded; never past the loop point so wrapping is invisible. */
  const FADE_END = Math.min(2.2, COUNT / 2);
  const mod = (value: number) => ((value % COUNT) + COUNT) % COUNT;
  /** Signed distance from the carousel position, wrapped so it loops forever. */
  const wrapOffset = (value: number) => {
    const offset = mod(value);
    return offset >= COUNT / 2 ? offset - COUNT : offset;
  };

  const stageRef = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(stageRef);
  const measureRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const flipRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [layout, setLayout] = useState<Layout | null>(null);
  const layoutRef = useRef<Layout | null>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const [side, setSide] = useState<Side>("front");

  const sim = useRef({
    p: 0,
    lastP: 0,
    velocity: 0,
    lean: 0,
    tiltX: 0,
    tiltY: 0,
    pointerX: 0,
    pointerY: 0,
    target: 0,
    tween: null as gsap.core.Tween | null,
    dragging: false,
    reduced: false,
  }).current;

  const drag = useRef({
    pointerId: -1,
    startX: 0,
    startP: 0,
    moved: false,
    samples: [] as { t: number; x: number }[],
  }).current;

  /* ------------------------------------------------------------ layout */

  useLayoutEffect(() => {
    const stage = stageRef.current!;
    const measure = measureRef.current;
    const compute = () => {
      const vw = stage.clientWidth;
      const vh = stage.clientHeight;
      const mobile = vw < 768;
      const top = mobile ? 84 : 92;
      // Below the pieces: the dots (36px), a gap, the tallest info panel at this width, and the ticker.
      const info = measure ? Math.max(0, ...[...measure.children].map((child) => (child as HTMLElement).offsetHeight)) : 180;
      const ticker = parseFloat(getComputedStyle(stage).getPropertyValue("--ticker-h")) || 44;
      const reserved = 36 + 14 + info + 26 + ticker;
      const available = Math.max(140, vh - top - reserved);
      const share = mobile ? 0.82 : vw < 1024 ? 0.46 : 0.34;
      const width = Math.round(Math.min(available / IMAGE_RATIO, vw * share, 540));
      const next: Layout = {
        width,
        height: width * IMAGE_RATIO,
        centerY: top + available / 2,
        spacing: width * (mobile ? 0.86 : 0.98),
        mobile,
      };
      layoutRef.current = next;
      setLayout(next);
    };
    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(stage);
    if (measure) for (const child of measure.children) observer.observe(child);
    return () => observer.disconnect();
  }, []);

  /* ------------------------------------------------------------ render loop */

  useEffect(() => {
    sim.reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Last values written per piece: unchanged styles aren't re-applied each frame.
    const written: { filter?: string; opacity?: string; zIndex?: string; visibility?: string }[] = [];
    const write = (el: HTMLElement, i: number, key: "filter" | "opacity" | "zIndex" | "visibility", value: string) => {
      const last = (written[i] ??= {});
      if (last[key] === value) return;
      last[key] = value;
      el.style[key] = value;
    };

    const tick = (time: number, deltaMs: number) => {
      const L = layoutRef.current;
      if (!L) return;
      // Scrolled past the hero and not moving: nothing to animate.
      if (!onScreen.current && !sim.tween) {
        sim.lastP = sim.p;
        return;
      }
      const dt = Math.min(Math.max(deltaMs / 1000, 1 / 240), 1 / 30);

      const velocity = (sim.p - sim.lastP) / dt;
      sim.lastP = sim.p;
      sim.velocity += (velocity - sim.velocity) * 0.25;
      const ease = 1 - Math.pow(0.001, dt);
      const motionScale = sim.reduced ? 0 : 1;
      sim.lean += (gsap.utils.clamp(-14, 14, -sim.velocity * 7) * motionScale - sim.lean) * ease;
      sim.tiltX += (sim.pointerY * -7 * motionScale - sim.tiltX) * ease * 0.6;
      sim.tiltY += (sim.pointerX * 9 * motionScale - sim.tiltY) * ease * 0.6;
      const float = Math.sin(time * 1.3) * 6 * motionScale;

      for (let i = 0; i < COUNT; i++) {
        const el = itemRefs.current[i];
        if (!el) continue;
        const offset = wrapOffset(i - sim.p);
        const distance = Math.abs(offset);
        const sign = Math.sign(offset);
        const near = Math.min(distance, 1);
        const focus = 1 - near;

        const x = sign * (distance <= 1 ? distance * L.spacing : L.spacing + (distance - 1) * L.spacing * 0.72);
        const scale = distance <= 1 ? 1 - near * 0.3 : Math.max(0.45, 0.7 - (distance - 1) * 0.12);
        const blur = Math.min(distance, 2) * (L.mobile ? 2 : 3);
        const opacity =
          distance <= 1 ? 1 - near * 0.12 : Math.max(0, 0.88 * ((FADE_END - distance) / (FADE_END - 1)));
        const y = float * focus;
        const rotateY = sim.lean + sim.tiltY * focus;
        const rotateX = sim.tiltX * focus;

        el.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) perspective(1200px) rotateY(${rotateY.toFixed(2)}deg) rotateX(${rotateX.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
        write(el, i, "filter", blur > 0.15 ? `blur(${blur.toFixed(1)}px)` : "none");
        write(el, i, "opacity", Math.min(1, opacity).toFixed(3));
        write(el, i, "zIndex", String(100 - Math.round(distance * 10)));
        write(el, i, "visibility", opacity < 0.01 ? "hidden" : "visible");
      }

      const index = mod(Math.round(sim.p));
      if (index !== activeRef.current) {
        activeRef.current = index;
        setActive(index);
      }
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [sim, onScreen]);

  /* ------------------------------------------------------------ navigation */

  const goTo = useCallback(
    (target: number, options: { duration?: number; ease?: string } = {}) => {
      sim.tween?.kill();
      sim.target = target;
      const distance = Math.abs(target - sim.p);
      sim.tween = gsap.to(sim, {
        p: target,
        duration: options.duration ?? Math.min(1.4, 0.75 + distance * 0.18),
        ease: options.ease ?? "power3.inOut",
        onComplete: () => {
          sim.tween = null;
        },
      });
    },
    [sim],
  );

  const step = useCallback(
    (direction: 1 | -1) => {
      const moving = !!sim.tween?.isActive();
      const base = moving ? sim.target : Math.round(sim.p);
      goTo(base + direction, { ease: moving ? "power3.out" : "power3.inOut" });
    },
    [goTo, sim],
  );

  const goToIndex = useCallback(
    (index: number) => {
      const base = Math.round(sim.p);
      goTo(base + wrapOffset(index - base));
    },
    [goTo, sim],
  );

  /* ------------------------------------------------------------ intro */

  const introPlayed = useRef(false);
  useEffect(() => {
    if (!introDone || !layout || introPlayed.current) return;
    introPlayed.current = true;
    sim.p = sim.lastP = -2.4;
    sim.velocity = 0;
    goTo(0, { duration: 2, ease: "power3.inOut" });
  }, [introDone, layout, goTo, sim]);

  /* ------------------------------------------------------------ front / back */

  const sideRef = useRef<Side>("front");

  useEffect(() => {
    sideRef.current = "front";
    setSide("front");
    flipRefs.current.forEach((el, i) => {
      if (el && i !== active) gsap.to(el, { rotationY: 0, duration: 0.6, ease: "power2.out", overwrite: true });
    });
  }, [active]);

  const changeSide = useCallback((next: Side) => {
    if (sideRef.current === next) return;
    sideRef.current = next;
    setSide(next);
    const el = flipRefs.current[activeRef.current];
    if (el) gsap.to(el, { rotationY: next === "back" ? 180 : 0, duration: 1.1, ease: "power3.inOut", overwrite: true });
  }, []);

  /* ------------------------------------------------------------ pointer */

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !layoutRef.current) return;
    drag.pointerId = event.pointerId;
    drag.startX = event.clientX;
    drag.startP = sim.p;
    drag.moved = false;
    drag.samples = [{ t: performance.now(), x: event.clientX }];
    sim.tween?.kill();
    sim.tween = null;
    sim.dragging = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const L = layoutRef.current;
    if (!L) return;

    if (event.pointerType === "mouse") {
      const rect = event.currentTarget.getBoundingClientRect();
      sim.pointerX = gsap.utils.clamp(-1, 1, (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2));
      sim.pointerY = gsap.utils.clamp(-1, 1, (event.clientY - (rect.top + L.centerY)) / (L.height / 2));
    }

    if (sim.dragging && event.pointerId === drag.pointerId) {
      const dx = event.clientX - drag.startX;
      if (Math.abs(dx) > 6) drag.moved = true;
      sim.p = drag.startP - dx / L.spacing;
      const now = performance.now();
      drag.samples.push({ t: now, x: event.clientX });
      while (drag.samples.length > 2 && now - drag.samples[0].t > 120) drag.samples.shift();
    }
  };

  const onPointerLeave = () => {
    sim.pointerX = 0;
    sim.pointerY = 0;
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!sim.dragging || event.pointerId !== drag.pointerId) return;
    sim.dragging = false;
    const L = layoutRef.current!;

    if (!drag.moved) {
      const hit = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>("[data-showcase-index]");
      if (hit && event.type === "pointerup") {
        const index = Number(hit.dataset.showcaseIndex);
        if (index === activeRef.current) activate(index);
        else goToIndex(index);
      } else {
        goTo(Math.round(sim.p), { duration: 0.6, ease: "power3.out" });
      }
      return;
    }

    const now = performance.now();
    const samples = drag.samples.filter((sample) => now - sample.t < 140);
    let velocityX = 0;
    if (samples.length >= 2) {
      const first = samples[0];
      const last = samples[samples.length - 1];
      velocityX = ((last.x - first.x) / Math.max(1, last.t - first.t)) * 1000;
    }
    const projected = sim.p - (velocityX / L.spacing) * 0.3;
    const current = Math.round(sim.p);
    const target = gsap.utils.clamp(current - 2, current + 2, Math.round(projected));
    goTo(target, { duration: 0.9, ease: "power3.out" });
  };

  /** Clicking (or Enter on) the centered slide: the brand mark leads into the products, a product opens. */
  const activate = (index: number) => {
    const target = slides[index];
    if (target.kind === "brand") step(1);
    else openQuickView(target.product.id);
  };

  /* ------------------------------------------------------------ wheel & keyboard */

  useEffect(() => {
    const stage = stageRef.current!;
    let settle = 0;
    const onWheel = (event: WheelEvent) => {
      const L = layoutRef.current;
      if (!L || Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      sim.tween?.kill();
      sim.tween = null;
      sim.p += (event.deltaX / L.spacing) * 0.9;
      window.clearTimeout(settle);
      settle = window.setTimeout(() => goTo(Math.round(sim.p), { duration: 0.7, ease: "power3.out" }), 140);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      stage.removeEventListener("wheel", onWheel);
      window.clearTimeout(settle);
    };
  }, [goTo, sim]);

  useEffect(() => {
    if (quickViewProduct || cartOpen) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      if (window.scrollY > window.innerHeight * 0.6) return;
      if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
      else if (event.key === "Enter" && target === stageRef.current) activate(activeRef.current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ------------------------------------------------------------ render */

  const slide = slides[active];
  const fadeIn = `transition-opacity duration-700 ${introDone ? "opacity-100" : "pointer-events-none opacity-0"}`;

  return (
    <>
      <div
        ref={stageRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${brand.name} collection — use arrow keys to browse, Enter to view`}
        tabIndex={0}
        data-cursor="Drag"
        className={`absolute inset-0 touch-pan-y select-none outline-none ${fadeIn}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        {layout &&
          slides.map((item, i) => (
            <div
              key={item.kind === "brand" ? "brand" : item.product.id}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              data-showcase-index={i}
              data-cursor={i === active ? (item.kind === "brand" ? "Explore" : "View") : undefined}
              className="absolute left-1/2 will-change-transform"
              style={{
                width: layout.width,
                height: layout.height,
                marginLeft: -layout.width / 2,
                top: layout.centerY - layout.height / 2,
              }}
            >
              <div
                aria-hidden
                className="absolute bottom-[3%] left-1/2 h-[7%] w-[62%] -translate-x-1/2 rounded-[50%]"
                style={{ background: "radial-gradient(closest-side, rgba(0,0,0,0.22), rgba(0,0,0,0))" }}
              />
              <div
                ref={(el) => {
                  flipRefs.current[i] = el;
                }}
                className="absolute inset-0"
                style={{ transformStyle: "preserve-3d" }}
              >
                {item.kind === "brand" && mark && (
                  <span
                    role="img"
                    aria-label={brand.name}
                    className="absolute left-1/2 top-1/2 block h-[64%] -translate-x-1/2 -translate-y-1/2 bg-ink"
                    style={{
                      aspectRatio: mark.aspectRatio,
                      mask: `url("${mark.image}") center / contain no-repeat`,
                      WebkitMask: `url("${mark.image}") center / contain no-repeat`,
                    }}
                  />
                )}
                {/* Every color stays mounted so switching crossfades instead of loading. */}
                {item.kind === "product" &&
                  item.product.colors.map((color) => {
                    const shown = color.id === colorOf(item.product).id;
                    const fade = `backface-hidden absolute inset-0 h-full w-full object-contain transition-opacity duration-500 ${
                      shown ? "opacity-100" : "opacity-0"
                    }`;
                    return (
                      <div key={color.id} className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
                        <img
                          {...productImage(color.images.front, "showcase", { eager: true })}
                          alt={shown ? `${item.product.name} in ${color.name}, front` : ""}
                          aria-hidden={!shown}
                          draggable={false}
                          className={fade}
                        />
                        <img
                          {...productImage(color.images.back, "showcase", { eager: true })}
                          alt=""
                          aria-hidden
                          draggable={false}
                          className={fade}
                          style={{ transform: "rotateY(180deg)" }}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
      </div>

      {/* Invisible copies of every info panel: the tallest one decides how much room the pieces leave below. */}
      <div ref={measureRef} aria-hidden className="pointer-events-none invisible absolute inset-x-0 bottom-0">
        {slides.map((item) =>
          item.kind === "brand" ? (
            <ShowcaseIntro key="brand" ready={false} pieces={products.length} onExplore={() => {}} />
          ) : (
            <ShowcaseInfo
              key={item.product.id}
              measure
              product={item.product}
              color={item.product.colors[0]}
              onColorChange={() => {}}
              side="front"
              ready={false}
              onSideChange={() => {}}
              onAvailability={() => {}}
            />
          ),
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {slide.kind === "brand" ? brand.name : `${slide.product.name}, ${active + 1 - leading} of ${products.length}`}
      </p>

      {layout && (
        <>
          <div className={fadeIn}>
            <ShowcaseArrow
              direction="prev"
              onClick={() => step(-1)}
              style={{ left: "max(16px, 4vw)", top: layout.centerY, marginTop: -28 }}
            />
            <ShowcaseArrow
              direction="next"
              onClick={() => step(1)}
              style={{ right: "max(16px, 4vw)", top: layout.centerY, marginTop: -28 }}
            />
          </div>

          <div
            className={`absolute inset-x-0 z-[115] flex justify-center ${fadeIn}`}
            style={{ top: layout.centerY + layout.height / 2 + 8 }}
          >
            {slides.map((item, i) => (
              <button
                key={item.kind === "brand" ? "brand" : item.product.id}
                type="button"
                aria-label={`Go to ${item.kind === "brand" ? brand.name : item.product.name}`}
                aria-current={i === active}
                onClick={() => goToIndex(i)}
                className="group flex h-7 items-center px-1.5"
              >
                <span
                  className={`block h-[7px] rounded-full transition-all duration-500 ease-expo ${
                    i === active ? "w-6 bg-ink" : "w-[7px] bg-ink/20 group-hover:bg-ink/45"
                  }`}
                />
              </button>
            ))}
          </div>

          {slide.kind === "brand" ? (
            <ShowcaseIntro ready={introDone} pieces={products.length} onExplore={() => step(1)} />
          ) : (
            <ShowcaseInfo
              product={slide.product}
              color={colorOf(slide.product)}
              onColorChange={(colorId) => selectColor(slide.product.id, colorId)}
              side={side}
              ready={introDone}
              onSideChange={changeSide}
              onAvailability={() => openQuickView(slide.product.id)}
            />
          )}

          <div
            className={`absolute left-5 z-[110] hidden md:left-8 md:block ${fadeIn}`}
            style={{ bottom: "calc(var(--ticker-h) + 30px)" }}
          >
            <div className="flex items-end gap-2">
              <span className="relative block h-[44px] overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={active}
                    className="font-display block text-[48px] leading-[44px] tabular-nums"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "-100%" }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {pad(active + 1 - leading)}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="eyebrow mb-1 text-muted">/ {pad(products.length)}</span>
            </div>
          </div>

          <div
            className={`eyebrow absolute right-5 z-[110] hidden text-right text-muted md:right-8 md:block ${fadeIn}`}
            style={{ bottom: "calc(var(--ticker-h) + 30px)" }}
          >
            <p>Drag, swipe or use ← →</p>
            <p className="mt-1">Click the piece to shop</p>
          </div>
        </>
      )}
    </>
  );
}
