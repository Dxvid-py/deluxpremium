/**
 * Fuegos artificiales limpios y breves (canvas a pantalla completa, sin bloquear clics).
 * Respeta "reducir movimiento" del sistema.
 */
const COLORS = ["#d9b26a", "#f3d9a4", "#e8a0b0", "#ffffff", "#c9893e"];

type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number };

export function launchFireworks(origin?: { x: number; y: number }) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100vw",
    height: "100vh",
    pointerEvents: "none",
    zIndex: "200",
  });
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }
  ctx.scale(dpr, dpr);

  const particles: Particle[] = [];
  const burst = (cx: number, cy: number, count: number) => {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)]!;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
      const speed = 1.6 + Math.random() * 3.2;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        max: 55 + Math.random() * 30,
        color: Math.random() > 0.35 ? color : COLORS[Math.floor(Math.random() * COLORS.length)]!,
        size: 1.4 + Math.random() * 1.6,
      });
    }
  };

  const cx = origin?.x ?? w / 2;
  const cy = origin?.y ?? h / 2;
  const bursts: Array<[number, number, number, number]> = [
    [0, cx, Math.max(80, cy - 90), 46],
    [260, w * 0.28, h * 0.32, 40],
    [420, w * 0.72, h * 0.3, 40],
    [700, w * 0.5, h * 0.24, 52],
  ];
  const start = performance.now();
  const fired = new Set<number>();

  const frame = (now: number) => {
    const elapsed = now - start;
    bursts.forEach(([delay, x, y, count], i) => {
      if (!fired.has(i) && elapsed >= delay) {
        fired.add(i);
        burst(x, y, count);
      }
    });

    ctx.clearRect(0, 0, w, h);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]!;
      p.life += 1;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.975;
      p.vy = p.vy * 0.975 + 0.045;
      const alpha = Math.max(0, 1 - p.life / p.max);
      if (alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (elapsed < 2600 && (particles.length || fired.size < bursts.length)) {
      requestAnimationFrame(frame);
    } else {
      canvas.remove();
    }
  };
  requestAnimationFrame(frame);
}
