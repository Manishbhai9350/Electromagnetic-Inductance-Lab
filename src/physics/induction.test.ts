import assert from 'node:assert/strict';
import { InductionSim, lenz, loopFlux, meanTurnFlux, DT } from './induction';

const run = (sim: InductionSim, seconds: number, frame: number) => {
  let peak = 0;
  for (let i = 0, n = Math.round(seconds / frame); i < n; i++) { sim.advance(frame); if (Math.abs(sim.emf) > Math.abs(peak)) peak = sim.emf; }
  return peak;
};
// Runs over the same 0.2 m stretch (covers the |dΦ/dz| maximum) of travel regardless of speed, so peaks are comparable.
const peakFor = (patch: { speed?: number } & object, z0: number) => { const s = new InductionSim(); s.reset(z0); s.setParams(patch); s.play(); return run(s, 0.2 / (patch.speed ?? 0.1), 1 / 60); };

// 1. Zero motion → exactly zero EMF.
{ const s = new InductionSim(); s.setParams({ speed: 0 }); s.play(); assert.equal(run(s, 1, 1 / 60), 0); }
// 2. Approaching vs reversed polarity vs moving away: signs.
const base = peakFor({}, -0.2), rev = peakFor({ orientation: -1 }, -0.2), away = peakFor({}, 0);
assert.ok(base < 0 && rev > 0 && Math.abs(base + rev) < 1e-9, 'N-leading approach ε<0; reversed polarity ε>0, same magnitude');
assert.ok(away > 0, 'moving away: ε>0 (opposite to approaching)');
// 3. Doubling speed doubles peak EMF.
const fast = peakFor({ speed: 0.2 }, -0.2);
assert.ok(Math.abs(fast / base - 2) < 0.02, `2× speed → ${fast / base}`);
// 4. Lenz: sign(ε) is always opposite to sign(dΦ/dt).
{ const s = new InductionSim(); s.reset(-0.2); s.play(); let checked = 0;
  for (let i = 0; i < 400; i++) { s.advance(1 / 60); const l = lenz(s.emf, s.dphi); if (l.sense) { assert.equal(l.sense, -Math.sign(s.dphi)); checked++; } }
  assert.ok(checked > 100); }
// 5. Frame-rate independence.
const at = (frame: number) => { const s = new InductionSim(); s.play(); run(s, 1.5, frame); return [s.z, s.emf]; };
{ const a = at(1 / 60), b = at(1 / 144);
  assert.ok(Math.abs(a[0] - b[0]) < 3e-4 && Math.abs(a[1] - b[1]) / Math.abs(a[1]) < 0.05, `${a} vs ${b}`); }
// 6. Finite-difference EMF equals analytic −N dΦ/dz · v.
{ const z = -0.08, h = 1e-6, an = ((meanTurnFlux(z + h, 1) - meanTurnFlux(z - h, 1)) / (2 * h)) * 0.1;
  const s = new InductionSim(); s.reset(z - (0.1 * DT) / 2); s.setParams({ turns: 1 }); s.play(); s.advance(DT * 1.01);
  assert.ok(Math.abs(-s.emf - an) / Math.abs(an) < 1e-3, `${-s.emf} vs ${an}`); }
// 7. Pause freezes state (time too), emf → 0; reset restores.
{ const s = new InductionSim(); s.play(); run(s, 0.5, 1 / 60); s.pause(); const z = s.z, t = s.t; run(s, 0.5, 1 / 60);
  assert.equal(s.z, z); assert.equal(s.t, t); assert.equal(s.emf, 0); s.reset(); assert.equal(s.t, 0); assert.equal(s.z, -0.2); }
// 8. Symmetry and far-field dipole limit Φ → μ0 M a² / (2 d³).
assert.ok(Math.abs(meanTurnFlux(0.1, 1) - meanTurnFlux(-0.1, 1)) < 1e-15);
{ const d = 1, far = (4e-7 * Math.PI * 5 * 0.05 ** 2) / (2 * d ** 3); assert.ok(Math.abs(loopFlux(0, d, 1) / far - 1) < 0.01); }
console.log('All physics checks passed. Peak ε (approach, N=100, 0.1 m/s) =', base.toFixed(5), 'V');
