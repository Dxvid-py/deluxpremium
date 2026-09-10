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

// Pétalos fotográficos reales (rosa, peonía marfil y rosa intenso).
const PETAL_IMAGES = [
  "/petals/real-01.png",
  "/petals/real-02.png",
  "/petals/real-03.png",
];

type PetalSpec = {
  id: number;
  img: string;
  size: number;
  /** Destino final dentro del viewport, en coordenadas relativas al clic. */
  tx: number;
  ty: number;
  rotStart: number;
  rotMid: number;
  rotEnd: number;
  delay: number;
  driftY: number;
};

type Burst = {
  id: number;
  x: number;
  y: number;
  petals: PetalSpec[];
  onMidpoint?: () => void;
};

type PetalBurstContextValue = {
  /** Dispara la transición de pétalos a pantalla completa desde (x, y) en
   * coordenadas de viewport. `onMidpoint` se llama cuando los pétalos ya
   * cubren toda la pantalla — el momento ideal para navegar. */
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

function buildPetals(count: number, cx: number, cy: number): PetalSpec[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const petals: PetalSpec[] = [];
  for (let i = 0; i < count; i++) {
    // Distribución en cuadrícula con jitter para cubrir todo el viewport
    // de forma uniforme, sin huecos visibles.
    const cols = Math.ceil(Math.sqrt(count * (vw / Math.max(vh, 1))));
    const rows = Math.ceil(count / cols);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cellW = vw / cols;
    const cellH = vh / rows;
    const targetX = col * cellW + cellW * gsap.utils.random(0.15, 0.85);
    const targetY = row * cellH + cellH * gsap.utils.random(0.15, 0.85);
    petals.push({
      id: petalIdSeq++,
      img: PETAL_IMAGES[Math.floor(gsap.utils.random(0, PETAL_IMAGES.length - 0.01))] ?? "/petals/real-01.png",
      size: gsap.utils.random(90, 220),
      tx: targetX - cx,
      ty: targetY - cy,
      rotStart: gsap.utils.random(-180, 180),
      rotMid: gsap.utils.random(-90, 90),
      rotEnd: gsap.utils.random(-200, 200),
      delay: gsap.utils.random(0, 0.35),
      driftY: gsap.utils.random(vh * 0.4, vh * 0.9),
    });
  }
  return petals;
}

function BurstView({ data, onDone }: { data: Burst; onDone: (id: number) => void }) {
  const nodeRefs = useRef<(HTMLImageElement | null)[]>([]);
  const veilRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => onDone(data.id),
      });

      // Velo marfil bajo los pétalos: garantiza cobertura total aunque
      // queden pequeños huecos entre pétalos.
      if (veilRef.current) {
        gsap.set(veilRef.current, { opacity: 0 });
        tl.to(veilRef.current, { opacity: 1, duration: 0.7, ease: "power2.inOut" }, 0.25);
      }

      data.petals.forEach((p, i) => {
        const el = nodeRefs.current[i];
        if (!el) return;

        gsap.set(el, {
          x: 0,
          y: 0,
          scale: 0,
          opacity: 0,
          rotate: p.rotStart,
        });

        // Fase 1: los pétalos brotan del punto de clic y vuelan hacia su
        // posición, creciendo hasta cubrir la pantalla completa.
        tl.to(
          el,
          {
            x: p.tx,
            y: p.ty,
            scale: 1,
            opacity: 1,
            rotate: p.rotMid,
            duration: 0.85,
            ease: "power3.out",
            delay: p.delay,
          },
          0,
        );

        // Fase 2: flotación breve mientras la pantalla está cubierta.
        tl.to(
          el,
          {
            y: `+=${gsap.utils.random(-14, 14)}`,
            rotate: `+=${gsap.utils.random(-12, 12)}`,
            scale: "+=0.12",
            duration: 0.4,
            ease: "sine.inOut",
          },
          0.85 + p.delay,
        );

        // Fase 3: caen con gravedad y se desvanecen, revelando la página
        // nueva que ya cargó debajo.
        tl.to(
          el,
          {
            y: `+=${p.driftY}`,
            x: `+=${gsap.utils.random(-120, 120)}`,
            opacity: 0,
            rotate: p.rotEnd,
            duration: 1.1,
            ease: "power2.in",
          },
          1.35 + p.delay * 0.5,
        );
      });

      // El velo se va junto con la caída de los pétalos.
      if (veilRef.current) {
        tl.to(veilRef.current, { opacity: 0, duration: 0.9, ease: "power2.inOut" }, 1.55);
      }

      // Navegar cuando la cobertura es total.
      tl.call(() => data.onMidpoint?.(), undefined, 1.1);
    });

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[999]" aria-hidden="true">
      <div
        ref={veilRef}
        className="absolute inset-0 bg-background opacity-0"
      />
      <div className="absolute" style={{ left: data.x, top: data.y, width: 0, height: 0 }}>
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
    </div>
  );
}

export function PetalBurstProvider({ children }: { children: ReactNode }) {
  const [bursts, setBursts] = useState<Burst[]>([]);

  // Precarga silenciosa de los pétalos reales.
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
    const count = window.innerWidth < 640 ? 46 : 78;
    const id = burstIdSeq++;
    const newBurst: Burst = {
      id,
      x,
      y,
      petals: buildPetals(count, x, y),
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
