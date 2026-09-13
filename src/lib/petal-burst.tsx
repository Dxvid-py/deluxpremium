import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";

const PETAL_IMAGES = [
  "/petals/petal-01.png",
  "/petals/petal-02.png",
  "/petals/petal-03.png",
  "/petals/petal-04.png",
  "/petals/petal-05.png",
];

type Petal = {
  id: number;
  img: string;
  size: number;
  startX: number;
  startY: number;
  midX: number;
  midY: number;
  endX: number;
  endY: number;
  rotate: number;
  delay: number;
  opacity: number;
};

type Burst = { id: number; x: number; y: number; petals: Petal[]; onMidpoint?: () => void };
type Ctx = { burst: (x: number, y: number, onMidpoint?: () => void) => void };

const PetalBurstContext = createContext<Ctx | null>(null);
let sequence = 0;

export function usePetalBurst() {
  const ctx = useContext(PetalBurstContext);
  if (!ctx) throw new Error("usePetalBurst debe usarse dentro de <PetalBurstProvider>");
  return ctx;
}

function makePetals(vw: number, vh: number, x: number, y: number): Petal[] {
  const mobile = vw < 768;
  const count = mobile ? 34 : 56;
  return Array.from({ length: count }, (_, i) => {
    const fromClick = i < count * 0.55;
    const startX = fromClick ? x + (Math.random() - 0.5) * 120 : -60 - Math.random() * 120;
    const startY = fromClick ? y + (Math.random() - 0.5) * 100 : Math.random() * vh;
    const travel = vw * (0.7 + Math.random() * 0.7);
    const endX = startX + travel;
    const endY = startY - vh * (0.16 + Math.random() * 0.42);
    return {
      id: sequence++,
      img: PETAL_IMAGES[Math.floor(Math.random() * PETAL_IMAGES.length)]!,
      size: (mobile ? 26 : 34) + Math.random() * (mobile ? 44 : 70),
      startX,
      startY,
      midX: startX + travel * 0.45,
      midY: startY - vh * (0.04 + Math.random() * 0.12),
      endX,
      endY,
      rotate: (Math.random() > 0.5 ? 1 : -1) * (360 + Math.random() * 900),
      delay: Math.random() * 0.22,
      opacity: 0.55 + Math.random() * 0.35,
    };
  });
}

function BurstLayer({ data, onDone }: { data: Burst; onDone: (id: number) => void }) {
  const layerRef = useRef<HTMLDivElement | null>(null);
  const called = useRef(false);
  useLayoutEffect(() => {
    const root = layerRef.current;
    if (!root) return;
    const ctx = gsap.context(() => {
      const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-petal]"));
      const tl = gsap.timeline({ onComplete: () => onDone(data.id) });
      nodes.forEach((node, i) => {
        const petal = data.petals[i]!;
        gsap.set(node, {
          x: petal.startX,
          y: petal.startY,
          scale: 0.55,
          rotate: 0,
          opacity: 0,
        });
        tl.to(node, {
          x: petal.midX,
          y: petal.midY,
          scale: 1,
          rotate: petal.rotate * 0.22,
          opacity: petal.opacity,
          duration: 0.5,
          ease: "power2.out",
          delay: petal.delay,
        }, 0);
        tl.to(node, {
          x: petal.endX,
          y: petal.endY,
          rotate: petal.rotate,
          opacity: 0,
          duration: 1.05,
          ease: "sine.in",
        }, 0.48 + petal.delay);
      });
      tl.call(() => {
        if (!called.current) {
          called.current = true;
          data.onMidpoint?.();
        }
      }, undefined, 0.68);
      tl.play(0);
    }, root);
    return () => ctx.revert();
  }, [data, onDone]);

  return (
    <div ref={layerRef} className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden" aria-hidden="true">
      {data.petals.map((petal) => (
        <img
          key={petal.id}
          data-petal
          src={petal.img}
          alt=""
          width={petal.size}
          height={petal.size}
          className="absolute left-0 top-0 max-w-none will-change-transform"
          style={{ width: petal.size, height: petal.size, objectFit: "contain" }}
        />
      ))}
    </div>
  );
}

export function PetalBurstProvider({ children }: { children: ReactNode }) {
  const [bursts, setBursts] = useState<Burst[]>([]);
  const burst = (x: number, y: number, onMidpoint?: () => void) => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const next: Burst = { id: Date.now() + Math.random(), x, y, petals: makePetals(vw, vh, x, y), onMidpoint };
    setBursts((current) => [...current.slice(-1), next]);
  };
  const value = useMemo(() => ({ burst }), []);

  return (
    <PetalBurstContext.Provider value={value}>
      {children}
      {bursts.map((item) => (
        <BurstLayer key={item.id} data={item} onDone={(id) => setBursts((current) => current.filter((x) => x.id !== id))} />
      ))}
    </PetalBurstContext.Provider>
  );
}
