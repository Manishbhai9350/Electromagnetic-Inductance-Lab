/**
 * Electromagnetic induction: bar magnet on the axis of a multi-turn coil.
 * Pure TypeScript, no rendering imports. SI units. Axis = z (metres); coil centred at z = 0.
 *
 * MODEL (documented assumptions)
 *  1. The bar magnet is a point magnetic dipole m = s·M·ẑ (s = +1: N pole toward +z).
 *  2. Flux through one circular loop (radius a) at axial distance d from a dipole is exact:
 *       Φ(d) = s μ0 M a² / (2 (a² + d²)^{3/2})        (reciprocity with a loop's on-axis field)
 *  3. N turns are evenly spread over the coil length L; Φ per turn is the mean of 24 sample loops.
 *  4. Flux linkage = N Φ. Normal vector n̂ = +ẑ, so Φ > 0 when B points along +z.
 *  5. EMF is NOT tabulated: each fixed step computes ε = −N (Φ_now − Φ_prev)/Δt.
 *  Limitations: a real magnet is not a point dipole near the coil (error grows when the
 *  magnet is inside the coil); the coil's own field (self-inductance), eddy currents and the
 *  magnetic braking force on the magnet are ignored; the magnet moves at a prescribed speed.
 *
 * SIGN CONVENTION: ε > 0 drives current counter-clockwise when viewed from the +z end
 * (right-hand rule about n̂ = +ẑ). The induced axial field then points along sign(ε)·ẑ.
 */
export const MU0 = 4e-7 * Math.PI;
export const COIL = { radius: 0.05, length: 0.06 } as const;
export const MAGNET = { moment: 5, length: 0.12, width: 0.03 } as const; // M in A·m²
export const RESISTANCE = 2; // Ω, circuit resistance
export const Z_LIMIT = 0.25; // m, travel limit either side
export const DT = 1 / 480; // s, fixed physics step (frame-rate independent)
export const GRAPH_WINDOW = 8; // s of history kept for the graph
const SAMPLES = 24, SMOOTH = 25, HISTORY_EVERY = 4;

export type Orient = 1 | -1;
export interface Params { turns: number; speed: number; direction: Orient; orientation: Orient }
export interface Sample { t: number; phi: number; emf: number }
export interface Snapshot {
  t: number; z: number; phi: number; dphi: number; emf: number; current: number;
  playing: boolean; atLimit: boolean; p: Params;
}

/** Flux (Wb) of a dipole at zMag through one loop at zLoop. */
export function loopFlux(zMag: number, zLoop: number, s: Orient): number {
  const d = zLoop - zMag, a2 = COIL.radius ** 2;
  return (s * MU0 * MAGNET.moment * a2) / (2 * Math.pow(a2 + d * d, 1.5));
}
/** Mean flux (Wb) per turn for turns spread along the coil length. */
export function meanTurnFlux(zMag: number, s: Orient): number {
  let sum = 0;
  for (let i = 0; i < SAMPLES; i++) sum += loopFlux(zMag, -COIL.length / 2 + ((i + 0.5) * COIL.length) / SAMPLES, s);
  return sum / SAMPLES;
}
/** Reference EMF (V) used only to normalise the meter and glow (magnet at 0.2 m/s). */
export const emfReference = (turns: number) => (turns * Math.abs(loopFlux(0, 0, 1)) * 0.2) / COIL.radius;

/** Lenz's law: which way does the induced effect point, given the flux change? */
export function lenz(emf: number, dphi: number) {
  if (Math.abs(emf) < 1e-7) return { sense: 0 as const, trend: 'steady' as const };
  return { sense: (emf > 0 ? 1 : -1) as Orient, trend: dphi > 0 ? ('rising' as const) : ('falling' as const) };
}

const clamp = (z: number) => Math.max(-Z_LIMIT, Math.min(Z_LIMIT, z));

export class InductionSim {
  p: Params = { turns: 100, speed: 0.1, direction: 1, orientation: 1 };
  t = 0; z = -0.2; target = -0.2; emf = 0; dphi = 0; playing = false; atLimit = false;
  history: Sample[] = [];
  private acc = 0; private prev = 0; private n = 0;
  constructor() { this.rebase(); }
  private rebase() { this.prev = meanTurnFlux(this.z, this.p.orientation); }

  setParams(patch: Partial<Params>) { this.p = { ...this.p, ...patch }; this.rebase(); }
  reset(z0 = -0.2) {
    this.t = 0; this.z = this.target = clamp(z0); this.emf = this.dphi = 0; this.acc = 0; this.n = 0;
    this.playing = false; this.atLimit = false; this.history = []; this.rebase();
  }
  play() {
    if (Math.abs(this.z) >= Z_LIMIT - 1e-9 && Math.sign(this.z) === this.p.direction) {
      this.z = this.target = -this.p.direction * Z_LIMIT; this.rebase();
    }
    this.atLimit = false; this.playing = true;
  }
  pause() { this.playing = false; this.target = this.z; }
  /** Drag / slider: magnet follows the target with first-order smoothing (finite acceleration). */
  moveTo(z: number) { this.playing = false; this.atLimit = false; this.target = clamp(z); }

  advance(dt: number) {
    const active = this.playing || Math.abs(this.target - this.z) > 1e-7;
    if (!active) { this.acc = 0; this.emf = this.dphi = 0; return; }
    this.acc += Math.min(dt, 0.1);
    while (this.acc >= DT) { this.acc -= DT; this.step(); }
  }
  private step() {
    if (this.playing) { this.z += this.p.direction * this.p.speed * DT; this.target = this.z; }
    else this.z += (this.target - this.z) * Math.min(1, DT * SMOOTH);
    if (Math.abs(this.z) >= Z_LIMIT) {
      this.z = this.target = clamp(this.z);
      if (this.playing) { this.playing = false; this.atLimit = true; }
    }
    const phi = meanTurnFlux(this.z, this.p.orientation);
    this.dphi = (phi - this.prev) / DT; // dΦ/dt per turn
    this.emf = -this.p.turns * this.dphi; // ε = −N dΦ/dt
    this.prev = phi; this.t += DT;
    if (++this.n % HISTORY_EVERY === 0) {
      this.history.push({ t: this.t, phi, emf: this.emf });
      while (this.history.length && this.history[0].t < this.t - GRAPH_WINDOW) this.history.shift();
    }
  }
  snapshot(): Snapshot {
    return {
      t: this.t, z: this.z, phi: meanTurnFlux(this.z, this.p.orientation), dphi: this.dphi, emf: this.emf,
      current: this.emf / RESISTANCE, playing: this.playing, atLimit: this.atLimit, p: this.p,
    };
  }
}
