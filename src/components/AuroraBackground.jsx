import { useEffect, useRef } from "react";

/**
 * Aurora background — soft drifting metaballs in brand cyans on the space
 * canvas. Canvas 2D + a heavy CSS blur gives the soft "liquid ether" look
 * (radial-gradient blobs, additive blending, curl-ish drift, gentle mouse
 * repulsion). Renders absolutely-positioned behind its parent's content.
 */
const COLORS = [
  [3, 212, 255],   // electric blue
  [6, 189, 255],   // sky blue
  [0, 255, 187],   // bright turquoise
];

export default function AuroraBackground({ blobCount = 11, blur = 14, opacity = 1, style = {} }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    let W = 0, H = 0, t = 0, raf = 0, alive = true;
    const blobs = Array.from({ length: blobCount }, (_, i) => ({
      x: Math.random(), y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0022, vy: (Math.random() - 0.5) * 0.0022,
      r: 0.24 + Math.random() * 0.24,
      c: COLORS[i % COLORS.length],
      ph: Math.random() * 6.28,
    }));
    const mouse = { x: 0.5, y: 0.5, active: false };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      W = canvas.width = Math.max(1, Math.round(rect.width * dpr));
      H = canvas.height = Math.max(1, Math.round(rect.height * dpr));
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) / Math.max(1, rect.width);
      mouse.y = (e.clientY - rect.top) / Math.max(1, rect.height);
      mouse.active = true;
    };
    const onLeave = () => { mouse.active = false; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerleave", onLeave);

    const frame = () => {
      if (!alive) return;
      t += 0.006;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";
      for (const b of blobs) {
        // curl-ish drift keeps the motion liquid instead of linear
        b.vx += Math.cos(t * 1.3 + b.ph) * 0.00006;
        b.vy += Math.sin(t * 1.1 + b.ph * 1.7) * 0.00006;
        b.x += b.vx; b.y += b.vy;
        if (b.x < -0.25 || b.x > 1.25) b.vx *= -1;
        if (b.y < -0.25 || b.y > 1.25) b.vy *= -1;
        if (mouse.active) {
          const dx = b.x - mouse.x, dy = b.y - mouse.y;
          const d = Math.hypot(dx, dy) || 0.001;
          if (d < 0.4) { b.vx += (dx / d) * 0.0004; b.vy += (dy / d) * 0.0004; }
        }
        b.vx *= 0.985; b.vy *= 0.985;
        const px = b.x * W, py = b.y * H;
        const rr = b.r * Math.min(W, H) * (1 + 0.08 * Math.sin(t + b.ph));
        const g = ctx.createRadialGradient(px, py, 0, px, py, rr);
        g.addColorStop(0, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},.5)`);
        g.addColorStop(1, `rgba(${b.c[0]},${b.c[1]},${b.c[2]},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, rr, 0, 7);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
      if (!reduce) raf = requestAnimationFrame(frame);
    };
    frame();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [blobCount]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        filter: `blur(${blur}px) saturate(1.2)`, opacity,
        pointerEvents: "none", ...style,
      }}
    />
  );
}
