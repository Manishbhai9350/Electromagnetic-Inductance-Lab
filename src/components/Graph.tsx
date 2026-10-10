import { useEffect, useRef } from 'react';
import { GRAPH_WINDOW, loopFlux, type InductionSim } from '../physics/induction';
import { eng } from '../format';

/** Live traces read straight from the simulation's history buffer (no prerecorded data). */
export function Graph({ sim }: { sim: InductionSim }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, ctx = c.getContext('2d')!;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      const cs = getComputedStyle(c), css = (k: string) => cs.getPropertyValue(k).trim();
      const hist = sim.history, t1 = Math.max(sim.t, GRAPH_WINDOW), t0 = t1 - GRAPH_WINDOW;
      const emfMax = Math.max(2e-3, ...hist.map((s) => Math.abs(s.emf))) * 1.15;
      const rows = [
        { key: 'phi' as const, color: css('--flux'), label: 'Φ_B per turn', unit: 'Wb', scale: Math.abs(loopFlux(0, 0, 1)) * 1.1 },
        { key: 'emf' as const, color: css('--emf'), label: 'ε induced', unit: 'V', scale: emfMax },
      ];
      const rh = h / 2;
      rows.forEach((r, i) => {
        const top = i * rh, mid = top + rh / 2, amp = rh / 2 - 14;
        ctx.strokeStyle = css('--line'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid); ctx.stroke();
        ctx.fillStyle = css('--muted'); ctx.font = '11px ui-monospace, monospace';
        ctx.fillText(`${r.label} · ±${eng(r.scale, r.unit)}`, 8, top + 13);
        ctx.strokeStyle = r.color; ctx.lineWidth = 2; ctx.beginPath();
        hist.forEach((s, k) => {
          const x = ((s.t - t0) / GRAPH_WINDOW) * w, y = mid - (s[r.key] / r.scale) * amp;
          if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      });
    };
    const id = window.setInterval(draw, 50); draw();
    return () => window.clearInterval(id);
  }, [sim]);
  return <canvas ref={ref} className="graph" role="img" aria-label="Live graph of magnetic flux per turn and induced EMF over the last 8 seconds" />;
}
