import { useEffect, useRef } from "react";

const RED_PETAL_SOURCES = [
  "/petals/petal-01.png",
  "/petals/petal-02.png",
  "/petals/petal-03.png",
  "/petals/petal-04.png",
  "/petals/petal-05.png",
];

const WHITE_PETAL_SOURCES = ["/petals/petal-white.png"];

type Petal = {
  x: number;
  y: number;
  z: number;
  size: number;
  vy: number;
  vx: number;
  rot: number;
  vrot: number;
  sway: number;
  swaySpeed: number;
  img: number;
  alpha: number;
  source: "red" | "white";
};

export type PetalCanvasProps = {
  density?: number;
  speed?: number;
  className?: string;
  burst?: boolean;
  petalType?: "red" | "white" | "mixed";
};

export default function PetalCanvas({
  density = 26,
  speed = 1,
  className,
  burst = false,
  petalType = "red",
}: PetalCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const sourceList =
      petalType === "white"
        ? WHITE_PETAL_SOURCES
        : petalType === "mixed"
          ? [...RED_PETAL_SOURCES, ...WHITE_PETAL_SOURCES]
          : RED_PETAL_SOURCES;

    const images = sourceList.map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });

    const SPRITE_W = 256;
    const spriteCache: ({ far: HTMLCanvasElement; near: HTMLCanvasElement } | null)[] =
      sourceList.map(() => null);

    const spriteFor = (i: number) => {
      const cached = spriteCache[i];
      if (cached) return cached;
      const img = images[i];
      if (!img || !img.complete || img.naturalWidth === 0) return null;
      const ratio = img.naturalHeight / img.naturalWidth || 1;
      const make = (filter: string) => {
        const c = document.createElement("canvas");
        c.width = SPRITE_W;
        c.height = Math.max(1, Math.round(SPRITE_W * ratio));
        const sctx = c.getContext("2d");
        if (sctx) {
          sctx.filter = filter;
          const pad = 12;
          sctx.drawImage(img, pad, pad, SPRITE_W - pad * 2, c.height - pad * 2);
        }
        return c;
      };
      const sprites = {
        far: make("blur(3px) saturate(0.55) brightness(1.15)"),
        near: make("blur(0.6px) saturate(0.6) brightness(1.1)"),
      };
      spriteCache[i] = sprites;
      return sprites;
    };

    let width = 0;
    let height = 0;
    let dpr = 1;
    let raf = 0;
    let running = true;
    let inView = true;
    let petals: Petal[] = [];

    const count = () =>
      Math.max(6, Math.round(density * (window.innerWidth < 768 ? 0.35 : 1)));

    const makePetal = (initial: boolean): Petal => {
      const z = 0.35 + Math.random() * 0.85;
      let img = Math.floor(Math.random() * sourceList.length);
      let source: "red" | "white" = "red";

      if (petalType === "white") {
        img = 0;
        source = "white";
      } else if (petalType === "mixed") {
        source = Math.random() < 0.5 ? "red" : "white";
        if (source === "white") {
          img = RED_PETAL_SOURCES.length;
        } else {
          img = Math.floor(Math.random() * RED_PETAL_SOURCES.length);
        }
      }

      return {
        x: Math.random() * width,
        y: initial && !burst ? Math.random() * height : -Math.random() * height * 0.6 - 60,
        z,
        size: (34 + Math.random() * 58) * z,
        vy: (0.25 + Math.random() * 0.55) * z * speed,
        vx: (Math.random() - 0.5) * 0.25,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.012,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.006 + Math.random() * 0.012,
        img,
        source,
        alpha: 0.1 + z * 0.16,
      };
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      petals = Array.from({ length: count() }, () => makePetal(true));
    };

    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      for (const p of petals) {
        p.sway += p.swaySpeed;
        p.y += p.vy;
        p.x += p.vx + Math.sin(p.sway) * 0.5 * p.z;
        p.rot += p.vrot;

        if (p.y - p.size > height) {
          Object.assign(p, makePetal(false));
          p.y = -p.size;
        }
        if (p.x < -p.size) p.x = width + p.size;
        if (p.x > width + p.size) p.x = -p.size;

        const sprites = spriteFor(p.img);
        if (!sprites) continue;
        const sprite = p.z < 0.6 ? sprites.far : sprites.near;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        const ratio = sprite.height / sprite.width || 1;
        ctx.drawImage(sprite, -p.size / 2, (-p.size * ratio) / 2, p.size, p.size * ratio);
        ctx.restore();
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    raf = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    const io = new IntersectionObserver((entries) => {
      inView = entries.some((e) => e.isIntersecting);
      if (inView && !running && !document.hidden) {
        running = true;
        raf = requestAnimationFrame(draw);
      } else if (!inView && running) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(canvas);

    const onVisibility = () => {
      if (document.hidden && running) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!document.hidden && inView && !running) {
        running = true;
        raf = requestAnimationFrame(draw);
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
    };
  }, [density, speed, burst, petalType]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className ?? "pointer-events-none absolute inset-0 h-full w-full"}
    />
  );
}
