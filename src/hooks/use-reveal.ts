import { useEffect } from "react";

const SELECTOR = ".reveal, .reveal-blur, [data-anim], [data-stagger] > *";

/**
 * Reveal ligero: cada elemento entra una sola vez.
 * Evita reiniciar animaciones al hacer scroll hacia arriba/abajo,
 * lo que reduce tirones en móviles.
 */
export function useReveal() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      document.querySelectorAll<HTMLElement>(SELECTOR).forEach((node) => {
        node.classList.add("is-in");
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target as HTMLElement;
          el.classList.add("is-in");
          observer.unobserve(el);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -8% 0px" },
    );

    const seen = new WeakSet<Element>();
    let frame = 0;

    const scan = () => {
      frame = 0;
      for (const node of document.querySelectorAll<HTMLElement>(SELECTOR)) {
        if (seen.has(node)) continue;
        seen.add(node);

        const parent = node.parentElement;
        if (parent?.hasAttribute("data-stagger")) {
          const index = Array.prototype.indexOf.call(parent.children, node);
          const step = Number(parent.getAttribute("data-stagger") || 70);
          node.style.setProperty("--delay", `${Math.min(index, 8) * step}ms`);
          if (!node.hasAttribute("data-anim") && !node.classList.contains("reveal")) {
            node.setAttribute("data-anim", "fade-up");
          }
        }
        observer.observe(node);
      }
    };

    scan();

    const mo = new MutationObserver(() => {
      if (frame) return;
      frame = requestAnimationFrame(scan);
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mo.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
}

/** Parallax suave, solo cuando el elemento está cerca del viewport. */
export function useParallax(selector = "[data-parallax]") {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const vh = window.innerHeight;
      for (const node of document.querySelectorAll<HTMLElement>(selector)) {
        const rect = node.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) continue;
        const speed = Number(node.dataset["parallax"] ?? 0.08);
        const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
        node.style.transform = `translate3d(0, ${(progress * speed * 70).toFixed(2)}px, 0)`;
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
