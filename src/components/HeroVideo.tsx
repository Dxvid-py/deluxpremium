import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

/**
 * Hero de video.
 *
 * OJO DE DISEÑO: el video ya trae tu logo/wordmark quemado en el centro-
 * izquierda del cuadro. Por eso el texto (kicker + CTA) va abajo, en la
 * franja oscura que queda libre, en vez de superponerse al logo como
 * hacía el HeroSlider anterior con sus 4 escenas de texto rotando.
 *
 * El archivo `hero-loop.mp4/webm` ya es un "boomerang" (adelante + atrás,
 * sin salto en el punto de giro) generado a partir de tu video original,
 * así que basta con loop=true normal — el navegador solo repite el
 * archivo, que ya contiene la ida y la vuelta.
 */
export default function HeroVideo() {
  return (
    <section className="relative h-[100svh] min-h-[620px] overflow-hidden bg-[oklch(0.1_0.01_330)]">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/video/hero-loop.mp4"
        poster="/video/hero-poster.jpg"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src="/video/hero-loop.webm" type="video/webm" />
        <source src="/video/hero-loop.mp4" type="video/mp4" />
      </video>

      {/* Leve viñeta inferior para que el texto siempre sea legible,
          sin tapar el logo ni el arreglo floral. */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-transparent to-transparent" />

      <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-5 pb-16 md:px-8 md:pb-20">
        <div className="max-w-xl">
          <p className="eyebrow reveal is-in text-[oklch(0.86_0.02_80)]">Floristería de lujo · Barranquilla</p>
          <p className="reveal is-in mt-4 max-w-md text-sm leading-relaxed text-[oklch(0.86_0.02_80/0.85)] sm:text-base">
            Composiciones de autor, entrega el mismo día.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link
              to="/catalogo"
              className="group inline-flex items-center gap-3 bg-primary px-8 py-4 text-[11px] tracking-[0.26em] text-primary-foreground uppercase transition-opacity hover:opacity-90"
            >
              Ver colecciones
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/contacto"
              className="border border-[oklch(0.86_0.02_80/0.4)] px-8 py-4 text-[11px] tracking-[0.26em] text-cream uppercase transition-colors hover:border-primary hover:text-primary"
            >
              Pedido a medida
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
