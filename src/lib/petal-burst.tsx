import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import gsap from "gsap";

const PETAL_IMAGES = [
  "/petals/petal-01.png",
  "/petals/petal-02.png",
  "/petals/petal-03.png",
  "/petals/petal-04.png",
  "/petals/petal-05.png",
];

type PetalSpec = {
  id: number;
  img: string;
  size: number;
  ringAngleDeg: number;
  ringRadius: number;
  disperseRadius: number;
  rotStart: number;
  rotRing: number;
  rotDisperse: number;
  delay: number;
};

type Burst = {
  id: number;
  x: number;
  y: number;
  petals: PetalSpec[];
  onMidpoint?: () => void;
};

type PetalBurstContextValue = {
  /** Dispara el anillo de pétalos desde (x, y) en coordenadas de viewport.
   * `onMidpoint` se llama justo cuando el anillo termina de formarse y
   * empieza a dispersarse — el momento ideal para navegar, porque los
   * pétalos siguen flotando sobre la página nueva. */
  burst: (x: number, y: number, onMidpoint?: () => void) => void;
};

const PetalBurstContext = createContext<PetalBurstContextValue | null>(null);

export function usePetalBurst() {
  const ctx = useContext(PetalBurstContext);
  if (!ctx) throw new Error("usePetalBurst debe usarse dentro de <PetalBurstProvider>");
  return ctx;
}

let burstIdSeq = 0;
let petalIdSeq = 0;

function buildPetals(count: number): PetalSpec[] {
  const petals: PetalSpec[] = [];
  for (let i = 0; i < count; i++) {
    const base = (360 / count) * i;
    const ringAngleDeg = base + gsap.utils.random(-14, 14);
    petals.push({
      id: petalIdSeq++,
      img: PETAL_IMAGES[Math.floor(gsap.utils.random(0, PETAL_IMAGES.length - 0.01))] ?? "/petals/petal-01.png",
      size: gsap.utils.random(22, 50),
      ringAngleDeg,
      ringRadius: gsap.utils.random(70, 118),
      disperseRadius: gsap.utils.random(230, 380),
      rotStart: gsap.utils.random(-30, 30),
      rotRing: gsap.utils.random(-70, 70),
      rotDisperse: gsap.utils.random(-160, 160),
      delay: gsap.utils.random(0, 0.16),
    });
  }
  return petals;
}

function BurstView({ data, onDone }: { data: Burst; onDone: (id: number) => void }) {
  const nodeRefs = useRef<(HTMLImageElement | null)[]>([]);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => onDone(data.id),
      });

      data.petals.forEach((p, i) => {
        const el = nodeRefs.current[i];
        if (!el) return;
        const ringX = Math.cos((p.ringAngleDeg * Math.PI) / 180) * p.ringRadius;
        const ringY = Math.sin((p.ringAngleDeg * Math.PI) / 180) * p.ringRadius;
        const disperseX = Math.cos((p.ringAngleDeg * Math.PI) / 180) * p.disperseRadius;
        const disperseY = Math.sin((p.ringAngleDeg * Math.PI) / 180) * p.disperseRadius;

        gsap.set(el, { x: 0, y: 0, scale: 0, opacity: 0, rotate: p.rotStart });

        // Fase 1: los pétalos vuelan desde el punto de clic y se acomodan
        // formando un anillo/halo alrededor de él.
        tl.to(
          el,
          {
            x: ringX,
            y: ringY,
            scale: 1,
            opacity: 1,
            rotate: p.rotRing,
            duration: 0.55,
            ease: "back.out(1.6)",
            delay: p.delay,
          },
          0,
        );

        // Fase 2: mientras el anillo está formado, un pequeño flote (yoyo)
        // para que se sienta vivo, no estático.
        tl.to(
          el,
          {
            y: `+=${gsap.utils.random(-8, 8)}`,
            rotate: `+=${gsap.utils.random(-8, 8)}`,
            duration: 0.32,
            ease: "sine.inOut",
          },
          0.55 + p.delay,
        );

        // Fase 3: se dispersan hacia afuera y se desvanecen, como flotando
        // lejos — este es el momento en que ya se navegó a la página nueva.
        tl.to(
          el,
          {
            x: disperseX,
            y: disperseY,
            opacity: 0,
            scale: gsap.utils.random(0.5, 0.8),
            rotate: p.rotDisperse,
            duration: 0.75,
            ease: "power2.in",
          },
          0.92 + p.delay * 0.4,
        );
      });

      // Llama a onMidpoint justo cuando arranca la fase de dispersión.
      tl.call(() => data.onMidpoint?.(), undefined, 0.9);
    });

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="pointer-events-none fixed z-[999]"
      style={{ left: data.x, top: data.y, width: 0, height: 0 }}
      aria-hidden="true"
    >
      {data.petals.map((p, i) => (
        <img
          key={p.id}
          ref={(el) => {
            nodeRefs.current[i] = el;
          }}
          src={p.img}
          alt=""
          width={p.size}
          height={p.size}
          className="absolute top-0 left-0 will-change-transform"
          style={{ width: p.size, height: p.size, marginLeft: -p.size / 2, marginTop: -p.size / 2 }}
        />
      ))}
    </div>
  );
}

export function PetalBurstProvider({ children }: { children: ReactNode }) {
  const [bursts, setBursts] = useState<Burst[]>([]);

  // Precarga silenciosa de los pétalos (normalmente ya están en cache por
  // el intro/hero, pero por si acaso).
  useLayoutEffect(() => {
    PETAL_IMAGES.forEach((src) => {
      const im = new Image();
      im.src = src;
    });
  }, []);

  const burst = useCallback((x: number, y: number, onMidpoint?: () => void) => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      onMidpoint?.();
      return;
    }
    const count = window.innerWidth < 640 ? 18 : 30;
    const id = burstIdSeq++;
    const newBurst: Burst = {
      id,
      x,
      y,
      petals: buildPetals(count),
      ...(onMidpoint ? { onMidpoint } : {}),
    };
    setBursts((prev) => [...prev, newBurst]);
  }, []);

  const removeBurst = useCallback((id: number) => {
    setBursts((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const value = useMemo(() => ({ burst }), [burst]);

  return (
    <PetalBurstContext.Provider value={value}>
      {children}
      {bursts.map((b) => (
        <BurstView key={b.id} data={b} onDone={removeBurst} />
      ))}
    </PetalBurstContext.Provider>
  );
}
