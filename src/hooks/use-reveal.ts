import { useEffect } from "react";

const SELECTOR =
  ".reveal, .reveal-blur, [data-anim], [data-stagger] > *";

/**
 * Motor de animaciones de scroll.
 * - Observa todo elemento con .reveal, .reveal-blur o [data-anim].
 * - Reproduce la animación CADA vez que el elemento entra en pantalla
 *   (se resetea al salir), de modo que cada scroll vuelve a animar.
 * - Aplica retardos escalonados automáticos en contenedores [data-stagger].
 * - Observa nodos nuevos con MutationObserver (datos async de la base).
 */
export function useReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      document
        .querySelectorAll<HTMLElement>(SELECTOR)
        .forEach((n) => n.classList.add("is-in"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) {
            el.classList.add("is-in");
          } else if (entry.boundingClientRect.top > 0) {
            // Sólo reseteamos cuando el elemento vuelve a quedar por debajo
            // del viewport: así al volver a bajar se anima de nuevo.
            el.classList.remove("is-in");
          }
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" },
    );

    const seen = new WeakSet<Element>();
    const scan = () => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR));
      for (const node of nodes) {
        if (seen.has(node)) continue;
        seen.add(node);
        const parent = node.parentElement;
        if (parent?.hasAttribute("data-stagger")) {
          const index = Array.prototype.indexOf.call(parent.children, node);
          const step = Number(parent.getAttribute("data-stagger") || 90);
          node.style.setProperty("--delay", `${Math.min(index, 10) * step}ms`);
          if (!node.hasAttribute("data-anim") && !node.classList.contains("reveal")) {
            node.setAttribute("data-anim", "fade-up");
          }
        }
        observer.observe(node);
      }
    };

    scan();
    // Re-escaneo con throttle: sin esto, cada cambio del DOM disparaba un
    // querySelectorAll completo y trababa el scroll en celulares.
    let scheduled = false;
    const mo = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        scan();
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mo.disconnect();
    };
  }, []);
}

/** Parallax suave basado en scroll, con requestAnimationFrame. */
export function useParallax(selector = "[data-parallax]") {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
      for (const node of nodes) {
        const rect = node.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) continue;
        const speed = Number(node.dataset["parallax"] ?? 0.12);
        const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
        node.style.transform = `translate3d(0, ${(progress * speed * 100).toFixed(2)}px, 0)`;
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [selector]);
}

/** Barra de progreso de scroll (pinta --scroll-progress en <html>). */
export function useScrollProgress() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      document.documentElement.style.setProperty("--scroll-progress", String(p));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}
