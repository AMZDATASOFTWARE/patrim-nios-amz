import { useRef, useEffect } from 'react';

/**
 * Fundo interativo: campo de "bolhas/vapor" em canvas que reage ao mouse
 * (repulsão suave + linhas de conexão holográficas).
 * Respeita prefers-reduced-motion.
 */
export default function FluidBackground({ density = 70, onInteract, style, ...props }) {
  const ref = useRef(null);
  const interactRef = useRef(onInteract);
  interactRef.current = onInteract;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf, w, h;
    const mouse = { x: -9999, y: -9999 };
    const N = Math.max(20, Math.min(140, density));
    const parts = [];
    const dpr = window.devicePixelRatio || 1;

    function resize() {
      const r = canvas.getBoundingClientRect();
      w = canvas.width = r.width * dpr;
      h = canvas.height = r.height * dpr;
    }
    resize();
    for (let i = 0; i < N; i++) {
      parts.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25 * dpr,
        vy: (-0.15 - Math.random() * 0.35) * dpr,
        r: (1 + Math.random() * 2.5) * dpr,
      });
    }

    function onMove(e) {
      const r = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - r.left) * dpr;
      mouse.y = (e.clientY - r.top) * dpr;
    }
    function onLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }
    function onTouch(e) {
      if (e.touches && e.touches.length > 0) {
        const r = canvas.getBoundingClientRect();
        mouse.x = (e.touches[0].clientX - r.left) * dpr;
        mouse.y = (e.touches[0].clientY - r.top) * dpr;
      }
    }

    let lastSoundTime = 0;
    function frame() {
      ctx.clearRect(0, 0, w, h);
      const linkDist = 130 * dpr;
      let maxIntensity = 0;
      for (const p of parts) {
        if (!reduced) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const d2 = dx * dx + dy * dy;
          const rad = 160 * dpr;
          if (d2 < rad * rad) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / rad) * 1.2 * dpr;
            p.x += (dx / d) * f;
            p.y += (dy / d) * f;
            const intensity = 1 - d / rad;
            if (intensity > maxIntensity) maxIntensity = intensity;
          }
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -10) {
            p.y = h + 10;
            p.x = Math.random() * w;
          }
          if (p.x < -10) p.x = w + 10;
          if (p.x > w + 10) p.x = -10;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'hsl(190 95% 65% / 0.55)';
        ctx.fill();
      }
      if (maxIntensity > 0 && interactRef.current) {
        const sndNow = performance.now();
        if (sndNow - lastSoundTime > 90) {
          lastSoundTime = sndNow;
          interactRef.current();
        }
      }
      ctx.lineWidth = dpr;
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i];
          const b = parts[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < linkDist) {
            ctx.strokeStyle = `hsl(200 80% 60% / ${0.14 * (1 - d / linkDist)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('mouseout', onLeave);
    frame();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('mouseout', onLeave);
    };
  }, [density]);

  return (
    <canvas
      ref={ref}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', ...style }}
      {...props}
    />
  );
}