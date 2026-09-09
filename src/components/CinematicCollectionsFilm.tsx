import { useLayoutEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Category } from "@/lib/queries";

gsap.registerPlugin(ScrollTrigger);

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export type CinematicCollectionsFilmProps = {
  categories: Category[];
  /** Traductor de contenido dinámico (i18n) ya resuelto por el caller. */
  translate: (value: string) => string;
  eyebrow: string;
  title1: string;
  title2: string;
  ctaLabel: string;
};

/**
 * "Película" de colecciones controlada por scroll.
 *
 * No es un slider automático ni una simple aparición al hacer scroll:
 * el usuario controla el avance como si tuviera el timeline de un video
 * en la mano. Cada colección es una "escena" que entra mediante un iris
 * (wipe circular, técnica de transición de cine), con un Ken Burns
 * continuo ligado 1:1 a la posición de scroll (no al tiempo). Si el
 * usuario se detiene a mitad de scroll, la transición se queda a mitad
 * de camino — igual que pausar un video.
 *
 * Rendimiento / accesibilidad:
 * - Sólo transforms y clip-path (compositor, sin layout thrashing).
 * - prefers-reduced-motion: se desactiva el pin/scrub y se listan las
 *   escenas en una grilla estática ya revelada.
 * - En pantallas pequeñas se acorta la distancia de scroll por escena
 *   vía ScrollTrigger.matchMedia para no volver la página eterna.
 */
export default function CinematicCollectionsFilm({
  categories,
  translate,
  eyebrow,
  title1,
  title2,
  ctaLabel,
}: CinematicCollectionsFilmProps) {
  const root = useRef<HTMLDivElement | null>(null);
  const scenesRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (reduceMotion || categories.length === 0) return undefined;

    const ctx = gsap.context(() => {
      const scenes = gsap.utils.toArray<HTMLElement>(".film-scene");
      const total = scenes.length;
      if (total === 0) return;

      // Móvil: misma mecánica, pero con menos distancia de scroll por escena
      // para que no se sienta interminable en pantallas pequeñas.
      const perScenePx = window.innerWidth < 768 ? 900 : 1600;
      buildTimeline(scenes, total, perScenePx);

      function buildTimeline(nodes: HTMLElement[], count: number, perScenePx: number) {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: () => `+=${perScenePx * count}`,
            scrub: 0.65,
            pin: scenesRef.current,
            anticipatePin: 1,
          },
        });

        nodes.forEach((scene, i) => {
          const img = scene.querySelector<HTMLElement>(".film-image");
          const wipe = scene.querySelector<HTMLElement>(".film-wipe");
          const num = scene.querySelector<HTMLElement>(".film-number");
          const kicker = scene.querySelector<HTMLElement>(".film-kicker");
          const heading = scene.querySelector<HTMLElement>(".film-heading");
          const copy = scene.querySelector<HTMLElement>(".film-copy");
          const cta = scene.querySelector<HTMLElement>(".film-cta");
          const rail = document.querySelectorAll<HTMLElement>(".film-rail-item")[i];

          const label = `scene${i}`;
          tl.addLabel(label);

          if (i > 0 && wipe) {
            // Iris: el círculo crece y descubre la escena siguiente por encima
            // de la anterior — la transición de cine que reemplaza al fundido.
            tl.fromTo(
              wipe,
              { clipPath: "circle(0% at 50% 45%)" },
              { clipPath: "circle(75% at 50% 45%)", duration: 1, ease: "power2.inOut" },
              label,
            );
          } else if (wipe) {
            gsap.set(wipe, { clipPath: "circle(75% at 50% 45%)" });
            // La escena 0 no tiene wipe de entrada (ya está visible al llegar);
            // se compensa con un tramo neutro para que reciba la misma
            // porción de distancia de scroll que el resto de escenas.
            tl.to({}, { duration: 1 }, label);
          }

          if (img) {
            // Empuje de cámara continuo, ligado al scroll: mientras la escena
            // está "en foco" la imagen avanza lentamente hacia el espectador.
            tl.fromTo(
              img,
              { scale: i === 0 ? 1 : 1.16 },
              { scale: 1.02, duration: 1.15, ease: "none" },
              label,
            );
          }

          if (kicker && heading && copy) {
            tl.fromTo(
              [kicker, heading, copy],
              { clipPath: "inset(0 0 100% 0)", y: 18 },
              { clipPath: "inset(0 0 0% 0)", y: 0, duration: 0.6, stagger: 0.08, ease: "power3.out" },
              i === 0 ? label : `${label}+=0.35`,
            );
          }

          if (cta) {
            tl.fromTo(cta, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, `${label}+=0.7`);
          }

          if (num) {
            tl.fromTo(
              num,
              { opacity: 0.25, scale: 0.85 },
              { opacity: 1, scale: 1, duration: 0.4 },
              i === 0 ? label : `${label}+=0.2`,
            );
          }

          if (rail) {
            tl.call(
              () => {
                document
                  .querySelectorAll(".film-rail-item")
                  .forEach((el) => el.classList.remove("is-active"));
                rail.classList.add("is-active");
              },
              undefined,
              i === 0 ? label : `${label}+=0.15`,
            );
          }

          // Hueco de "sostenimiento": la escena permanece legible antes de
          // que empiece el iris de la siguiente.
          tl.to({}, { duration: 0.9 });
        });
      }
    }, root);

    return () => ctx.revert();
  }, [categories.length, reduceMotion]);

  if (categories.length === 0) return null;

  // Sin animación: grilla estática, totalmente accesible, sin pin ni scrub.
  if (reduceMotion) {
    return (
      <section className="relative py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="eyebrow">{eyebrow}</p>
          <h2 className="mt-4 font-display text-4xl leading-tight md:text-5xl">
            {title1} <span className="text-lux-gradient italic">{title2}</span>
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/coleccion/$slug"
                params={{ slug: c.slug }}
                className="group relative block overflow-hidden rounded-sm"
              >
                <img src={c.image_url} alt={c.name} className="aspect-[3/4] w-full object-cover" />
                <span className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-6">
                  <span className="font-display text-2xl text-cream">{translate(c.name)}</span>
                  <span className="mt-3 inline-flex items-center gap-2 text-[10px] tracking-[0.24em] text-primary uppercase">
                    {ctaLabel} <ArrowUpRight className="h-3 w-3" />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={root} className="relative">
      <div ref={scenesRef} className="relative h-[100svh] min-h-[560px] overflow-hidden bg-[oklch(0.15_0.012_330)]">
        {categories.map((c, i) => (
          <div
            key={c.id}
            className="film-scene absolute inset-0"
            style={{ zIndex: i + 1 }}
          >
            <div className="film-wipe absolute inset-0" style={{ clipPath: i === 0 ? "circle(75% at 50% 45%)" : "circle(0% at 50% 45%)" }}>
              <img
                src={c.image_url}
                alt={c.name}
                loading={i === 0 ? "eager" : "lazy"}
                className="film-image absolute inset-0 h-full w-full object-cover will-change-transform"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.12_0.012_330/0.92)] via-[oklch(0.12_0.012_330/0.4)] to-[oklch(0.12_0.012_330/0.55)]" />
              <div className="diffused-light absolute inset-0" />
            </div>

            <span className="film-number pointer-events-none absolute top-8 left-5 font-display text-lg text-[oklch(0.86_0.02_80)] md:top-10 md:left-8 md:text-xl">
              0{i + 1} <span className="text-[oklch(0.86_0.02_80/0.4)]">/ 0{categories.length}</span>
            </span>

            <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-24 md:px-8 md:pb-28">
              <p className="film-kicker eyebrow text-[oklch(0.86_0.02_80)]" style={{ clipPath: "inset(0 0 100% 0)" }}>
                {i === 0 ? eyebrow : translate(c.name)}
              </p>
              <h2
                className="film-heading mt-4 max-w-2xl font-display text-4xl leading-[1.02] text-cream sm:text-6xl md:text-7xl"
                style={{ clipPath: "inset(0 0 100% 0)" }}
              >
                {i === 0 ? (
                  <>
                    {title1} <span className="text-lux-gradient italic">{title2}</span>
                  </>
                ) : (
                  translate(c.name)
                )}
              </h2>
              <p
                className="film-copy mt-5 max-w-md text-sm leading-relaxed text-[oklch(0.86_0.02_80/0.85)] sm:text-base"
                style={{ clipPath: "inset(0 0 100% 0)" }}
              >
                {i === 0
                  ? "Desliza para recorrer nuestras colecciones, cada una una escena distinta."
                  : translate(c.description)}
              </p>
              <Link
                to="/coleccion/$slug"
                params={{ slug: c.slug }}
                className="film-cta press group mt-7 inline-flex w-fit items-center gap-3 border border-[oklch(0.86_0.02_80/0.4)] px-7 py-3.5 text-[11px] tracking-[0.26em] text-cream uppercase opacity-0 transition-colors hover:border-primary hover:text-primary"
              >
                {ctaLabel}
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
          </div>
        ))}

        {/* Riel de progreso: refuerza la sensación de "timeline de video". */}
        <div className="pointer-events-none absolute right-5 bottom-8 z-20 flex items-center gap-2 md:right-8">
          {categories.map((c, i) => (
            <span
              key={c.id}
              className={`film-rail-item h-px w-8 bg-[oklch(0.86_0.02_80/0.35)] transition-all duration-500 ${i === 0 ? "is-active" : ""}`}
            />
          ))}
        </div>
      </div>

      {/* Sin JS de reduced-motion: fallback totalmente estático y accesible. */}
      <noscript>
        <div className="grid grid-cols-1 gap-6 p-8 sm:grid-cols-3">
          {categories.map((c) => (
            <img key={c.id} src={c.image_url} alt={c.name} className="aspect-[3/4] w-full object-cover" />
          ))}
        </div>
      </noscript>
    </section>
  );
}
