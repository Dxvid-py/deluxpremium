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
const PETAL_IMAGES = ["/petals/real-01.png", "/petals/real-02.png", "/petals/real-03.png"];

type PetalSpec = {
  id: number;
  img: string;
  size: number;
  /** Posición final relativa al centro del anillo (antes de que el grupo gire). */
  tx: number;
  ty: number;
  rotStart: number;
  rotMid: number;
  rotEnd: number;
  delay: number;
  driftY: number;
  driftX: number;
};

type RingSpec = {
  id: number;
  petals: PetalSpec[];
  /** Grados que gira el anillo completo durante la fase de entrada. */
  spinIn: number;
  /** Grados que sigue girando mientras la pantalla está cubierta. */
  spinFloat: number;
  spinDir: 1 | -1;
};

type Burst = {
  id: number;
  x: number;
  y: number;
  rings: RingSpec[];
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
let ringIdSeq = 0;

/**
 * Construye los pétalos en anillos concéntricos alrededor del punto de
 * clic, como los aros de un loader circular — pero con pétalos reales en
 * vez de puntos, y bastante más elegante. Cada anillo gira como grupo
 * (ver `spinIn`/`spinFloat` aplicados al contenedor en <RingView>), así
 * que aunque cada pétalo sólo viaja en línea recta desde el centro hacia
 * su posición en el anillo, el giro del grupo hace que todo el conjunto
 * se sienta como una espiral en movimiento.
 */
function buildRings(count: number, vw: number, vh: number): RingSpec[] {
  const ringCount = count > 60 ? 4 : 3;
  const perRing = Math.ceil(count / ringCount);
  const unit = Math.min(vw, vh);
  const rings: RingSpec[] = [];

  for (let r = 0; r < ringCount; r++) {
    const radius = unit * (0.1 + r * 0.09 + gsap.utils.random(-0.01, 0.01));
    const ringOffset = gsap.utils.random(0, Math.PI * 2);
    const petals: PetalSpec[] = [];

    for (let i = 0; i < perRing; i++) {
      const angle = (i / perRing) * Math.PI * 2 + ringOffset;
      const jitterR = radius * gsap.utils.random(0.88, 1.12);
      const tx = Math.cos(angle) * jitterR;
      const ty = Math.sin(angle) * jitterR;
      petals.push({
        id: petalIdSeq++,
        img:
          PETAL_IMAGES[Math.floor(gsap.utils.random(0, PETAL_IMAGES.length - 0.01))] ??
          "/petals/real-01.png",
        // Anillos interiores con pétalos algo más pequeños que los exteriores,
        // como una flor abriéndose desde el centro.
        size: gsap.utils.random(56, 108) + r * 20,
        tx,
        ty,
        rotStart: gsap.utils.random(-40, 40),
        rotMid: gsap.utils.random(-70, 70),
        rotEnd: gsap.utils.random(-220, 220),
        delay: r * 0.08 + gsap.utils.random(0, 0.12),
        driftY: gsap.utils.random(vh * 0.45, vh * 0.95),
        driftX: gsap.utils.random(-140, 140),
      });
    }

    rings.push({
      id: ringIdSeq++,
      petals,
      spinIn: gsap.utils.random(70, 130),
      spinFloat: gsap.utils.random(30, 60),
      spinDir: r % 2 === 0 ? 1 : -1,
    });
  }

  return rings;
}

function RingView({ ring, tick }: { ring: RingSpec; tick: gsap.core.Timeline }) {
  const groupRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<(HTMLImageElement | null)[]>([]);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    // El anillo entero gira como un loader circular mientras los pétalos
    // brotan del centro hacia su lugar, y sigue girando (más despacio)
    // mientras la pantalla queda cubierta.
    gsap.set(group, { rotate: 0 });
    tick.to(group, { rotate: ring.spinIn * ring.spinDir, duration: 1.0, ease: "power2.out" }, 0);
    tick.to(
      group,
      { rotate: `+=${ring.spinFloat * ring.spinDir}`, duration: 1.5, ease: "sine.inOut" },
      1.0,
    );

    ring.petals.forEach((p, i) => {
      const el = nodeRefs.current[i];
      if (!el) return;

      gsap.set(el, { x: 0, y: 0, scale: 0, opacity: 0, rotate: p.rotStart });

      // Fase 1: el pétalo brota del centro y viaja a su posición en el anillo.
      tick.to(
        el,
        {
          x: p.tx,
          y: p.ty,
          scale: 1,
          opacity: 1,
          rotate: p.rotMid,
          duration: 0.8,
          ease: "power3.out",
          delay: p.delay,
        },
        0,
      );

      // Fase 2: flotación breve mientras la pantalla está cubierta.
      tick.to(
        el,
        {
          x: `+=${gsap.utils.random(-10, 10)}`,
          y: `+=${gsap.utils.random(-10, 10)}`,
          scale: `+=${gsap.utils.random(0.04, 0.14)}`,
          duration: 0.45,
          ease: "sine.inOut",
        },
        0.8 + p.delay,
      );

      // Fase 3: caen con gravedad y se desvanecen.
      tick.to(
        el,
        {
          x: `+=${p.driftX}`,
          y: `+=${p.driftY}`,
          opacity: 0,
          rotate: p.rotEnd,
          duration: 1.1,
          ease: "power2.in",
        },
        1.35 + p.delay * 0.5,
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={groupRef} className="absolute top-0 left-0 will-change-transform">
      {ring.petals.map((p, i) => (
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
          // maxWidth:none evita que el preflight `img{max-width:100%}`
          // achique el pétalo a 0 (el contenedor padre mide 0×0).
          style={{
            width: p.size,
            height: p.size,
            maxWidth: "none",
            marginLeft: -p.size / 2,
            marginTop: -p.size / 2,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Crea la timeline de GSAP (pausada) antes de montar los anillos, porque
 * <RingView> necesita recibirla ya lista en su primer render para poder
 * añadirle sus propias animaciones.
 */
function BurstRoot({ data, onDone }: { data: Burst; onDone: (id: number) => void }) {
  const veilRef = useRef<HTMLDivElement | null>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  if (!tlRef.current) {
    tlRef.current = gsap.timeline({ paused: true, onComplete: () => onDone(data.id) });
  }

  useLayoutEffect(() => {
    const tl = tlRef.current;
    if (!tl) return undefined;
    const ctx = gsap.context(() => {
      if (veilRef.current) {
        gsap.set(veilRef.current, { opacity: 0 });
        tl.to(veilRef.current, { opacity: 1, duration: 0.65, ease: "power2.inOut" }, 0.3);
      }
      tl.call(() => data.onMidpoint?.(), undefined, 1.05);
      if (veilRef.current) {
        tl.to(veilRef.current, { opacity: 0, duration: 0.9, ease: "power2.inOut" }, 1.55);
      }
      tl.play(0);
    });
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[999]" aria-hidden="true">
      <div ref={veilRef} className="absolute inset-0 bg-background opacity-0" />
      <div className="absolute" style={{ left: data.x, top: data.y, width: 0, height: 0 }}>
        {tlRef.current &&
          data.rings.map((ring) => (
            <RingView key={ring.id} ring={ring} tick={tlRef.current as gsap.core.Timeline} />
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
    const count = window.innerWidth < 640 ? 42 : 72;
    const id = burstIdSeq++;
    const newBurst: Burst = {
      id,
      x,
      y,
      rings: buildRings(count, window.innerWidth, window.innerHeight),
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
        <BurstRoot key={b.id} data={b} onDone={removeBurst} />
      ))}
    </PetalBurstContext.Provider>
  );
}
