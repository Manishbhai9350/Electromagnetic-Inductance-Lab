import { useEffect, useState } from 'react';
import { InductionSim, RESISTANCE, Z_LIMIT, emfReference, lenz, type Orient, type Snapshot } from './physics/induction';
import { SCENARIOS, type Scenario } from './scenarios';
import { Scene, PRESETS, type PresetName } from './components/Scene';
import { Graph } from './components/Graph';
import { eng } from './format';

type Theme = 'dark' | 'light';
const DEFAULTS = { turns: 100 };

function useReducedMotion() {
  const [r, setR] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const m = matchMedia('(prefers-reduced-motion: reduce)'), h = () => setR(m.matches);
    m.addEventListener('change', h); return () => m.removeEventListener('change', h);
  }, []);
  return r;
}

function Slider(p: { id: string; label: string; value: number; min: number; max: number; step: number; unit: string; digits?: number; onChange: (v: number) => void }) {
  return (
    <div className="field">
      <label htmlFor={p.id}>{p.label}<output htmlFor={p.id}>{p.value.toFixed(p.digits ?? 0)} {p.unit}</output></label>
      <input id={p.id} type="range" min={p.min} max={p.max} step={p.step} value={p.value} onChange={(e) => p.onChange(+e.target.value)} />
    </div>
  );
}
function Seg<T extends number>(p: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="field">
      <span className="lbl" id={`seg-${p.label}`}>{p.label}</span>
      <div className="seg" role="group" aria-labelledby={`seg-${p.label}`}>
        {p.options.map(([v, t]) => <button key={v} aria-pressed={p.value === v} onClick={() => p.onChange(v)}>{t}</button>)}
      </div>
    </div>
  );
}

export default function App() {
  const [sim] = useState(() => new InductionSim());
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme as Theme) || 'dark');
  const reduced = useReducedMotion();
  const [turns, setTurns] = useState(DEFAULTS.turns);
  const [speed, setSpeed] = useState(0.1);
  const [dir, setDir] = useState<Orient>(1);
  const [orient, setOrient] = useState<Orient>(1);
  const [snap, setSnap] = useState<Snapshot>(() => sim.snapshot());
  const [preset, setPreset] = useState<{ name: PresetName; n: number }>({ name: 'Perspective', n: 0 });
  const [dragging, setDragging] = useState(false);
  const [si, setSi] = useState(0);
  const [phase, setPhase] = useState<'predict' | 'running' | 'result'>('predict');
  const [choice, setChoice] = useState<number | null>(null);
  const sc = SCENARIOS[si];

  useEffect(() => { sim.setParams({ turns, speed, direction: dir, orientation: orient }); }, [sim, turns, speed, dir, orient]);
  useEffect(() => { const id = window.setInterval(() => setSnap(sim.snapshot()), 66); return () => window.clearInterval(id); }, [sim]);
  useEffect(() => {
    if (phase === 'running' && (snap.atLimit || snap.t >= sc.duration)) { sim.pause(); setPhase('result'); }
  }, [snap, phase, sc, sim]);

  const toggleTheme = () => setTheme((t) => {
    const n = t === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = n; localStorage.setItem('emi-theme', n); return n;
  });
  const apply = (s: Scenario) => {
    sim.setParams({ speed: s.speed, direction: s.direction, orientation: s.orientation });
    sim.reset(s.z0); setSpeed(s.speed); setDir(s.direction); setOrient(s.orientation); setSnap(sim.snapshot());
  };
  const pick = (i: number) => { setSi(i); setPhase('predict'); setChoice(null); apply(SCENARIOS[i]); };
  const resetAll = () => {
    sim.setParams({ turns: DEFAULTS.turns }); setTurns(DEFAULTS.turns);
    apply(sc); setPhase('predict'); setChoice(null);
  };
  const run = () => { apply(sc); sim.play(); setPhase('running'); };
  const toggle = () => { if (sim.playing) sim.pause(); else sim.play(); setSnap(sim.snapshot()); };
  const goto = (name: PresetName) => setPreset((p) => ({ name, n: p.n + 1 }));

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes((e.target as HTMLElement).tagName)) return;
      const names = Object.keys(PRESETS) as PresetName[];
      if (e.key === ' ') { e.preventDefault(); toggle(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); sim.moveTo(sim.target + (e.key === 'ArrowRight' ? 0.01 : -0.01)); setSnap(sim.snapshot()); }
      else if (e.key === 'r' || e.key === 'R') resetAll();
      else if (e.key === 't' || e.key === 'T') toggleTheme();
      else if (/^[1-4]$/.test(e.key)) goto(names[+e.key - 1]);
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  });

  const ref = emfReference(turns), l = lenz(snap.emf, snap.dphi);
  const needle = 50 + Math.max(-1, Math.min(1, snap.emf / ref)) * 50;
  const right = choice === sc.answer;

  return (
    <div className="app">
      <header>
        <h1>Electromagnetic Induction <span>· Magnet through a coil</span></h1>
        <div className="actions">
          <button onClick={resetAll} title="Reset (R)">Reset</button>
          <button onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title="Theme (T)">{theme === 'dark' ? 'Light' : 'Dark'}</button>
        </div>
      </header>
      <main>
        <section className="left" aria-label="Experiment">
          <div className="stage" role="group" aria-label="3D scene. Drag the magnet, or use the position slider or arrow keys.">
            <Scene sim={sim} theme={theme} turns={turns} orientation={orient} reduced={reduced} preset={preset} dragging={dragging} onDrag={setDragging} />
            <div className="overlay top" role="group" aria-label="Camera presets">
              {(Object.keys(PRESETS) as PresetName[]).map((n, i) => <button key={n} onClick={() => goto(n)} title={`Key ${i + 1}`}>{n}</button>)}
            </div>
            <div className="overlay bottom">
              <button className="primary" onClick={toggle} title="Play / pause (Space)">{snap.playing ? 'Pause' : 'Play'}</button>
              <span className="axis">+z (right) → ε &gt; 0 is counter-clockwise seen from the +z end</span>
            </div>
          </div>
          <div className="graphwrap"><Graph sim={sim} /></div>
        </section>
        <aside aria-label="Controls and learning">
          <section className="card" aria-labelledby="h-ctl">
            <h2 id="h-ctl">Controls</h2>
            <Slider id="pos" label="Magnet position" value={sim.target * 100} min={-Z_LIMIT * 100} max={Z_LIMIT * 100} step={0.5} unit="cm" digits={1}
              onChange={(v) => { sim.moveTo(v / 100); setSnap(sim.snapshot()); }} />
            <Slider id="spd" label="Speed" value={speed} min={0} max={0.4} step={0.01} unit="m/s" digits={2} onChange={setSpeed} />
            <Slider id="n" label="Coil turns N" value={turns} min={20} max={200} step={10} unit="" onChange={setTurns} />
            <Seg label="Direction" value={dir} options={[[1, 'Toward +z'], [-1, 'Toward −z']]} onChange={setDir} />
            <Seg label="Magnet poles" value={orient} options={[[1, 'N toward +z'], [-1, 'S toward +z']]} onChange={setOrient} />
            <p className="hint">Space play/pause · ←/→ nudge · R reset · T theme · 1–4 camera</p>
          </section>
          <section className="card" aria-labelledby="h-ins">
            <h2 id="h-ins">Inspector</h2>
            <div className="meter" role="img" aria-label={`Galvanometer: ${eng(snap.emf, 'V')}`}><i style={{ left: `${needle}%` }} /></div>
            <p className="eq" aria-label="Faraday's law">ε = −N · dΦ<sub>B</sub>/dt</p>
            <p className="eq sub">= −({turns}) × ({eng(snap.dphi, 'Wb/s')}) = <b>{eng(snap.emf, 'V')}</b></p>
            <dl>
              <dt>Position z</dt><dd>{(snap.z * 100).toFixed(1)} cm</dd>
              <dt>Flux per turn Φ<sub>B</sub></dt><dd>{eng(snap.phi, 'Wb')}</dd>
              <dt>Flux linkage NΦ<sub>B</sub></dt><dd>{eng(snap.phi * turns, 'Wb')}</dd>
              <dt>Current I = ε/R <small>(R = {RESISTANCE} Ω)</small></dt><dd>{eng(snap.current, 'A')}</dd>
            </dl>
            <p className="lenz" aria-live="off">
              {l.sense === 0 ? 'Flux is steady, so ε = 0 and there is no induced current.'
                : `Flux along z is ${l.trend}. Induced current is ${l.sense > 0 ? 'counter-clockwise' : 'clockwise'} seen from +z; its field points ${l.sense > 0 ? '+z' : '−z'}, opposing the change.`}
            </p>
          </section>
          <section className="card" aria-labelledby="h-sc">
            <h2 id="h-sc">Scenarios</h2>
            <div className="tabs" role="group" aria-label="Choose scenario">
              {SCENARIOS.map((s, i) => <button key={s.id} aria-pressed={i === si} onClick={() => pick(i)}>{s.title}</button>)}
            </div>
            <p className="hint">{sc.setup}</p>
            <fieldset disabled={phase !== 'predict'}>
              <legend>Predict: {sc.question}</legend>
              {sc.options.map((o, i) => (
                <label key={o} className="opt"><input type="radio" name="pred" checked={choice === i} onChange={() => setChoice(i)} />{o}</label>
              ))}
            </fieldset>
            {phase === 'predict' && <button className="primary" disabled={choice === null} onClick={run}>Lock prediction and run</button>}
            {phase === 'running' && <p className="hint">Running… watch the meter and the graph.</p>}
            <div aria-live="polite">
              {phase === 'result' && (
                <div className={`result ${right ? 'ok' : 'no'}`}>
                  <b>{right ? 'Your prediction was correct.' : `Not quite: ${sc.options[sc.answer]}.`}</b>
                  <p>{sc.explanation}</p>
                  <button onClick={() => pick(si)}>Try again</button>{' '}
                  {si < SCENARIOS.length - 1 && <button onClick={() => pick(si + 1)}>Next scenario</button>}
                </div>
              )}
            </div>
          </section>
          <section className="card" aria-labelledby="h-lrn">
            <h2 id="h-lrn">Learn</h2>
            <p><b>Faraday’s law.</b> A changing magnetic flux through a loop induces an EMF equal to the rate of change of flux linkage: ε = −N dΦ<sub>B</sub>/dt. Φ<sub>B</sub> = ∫B·dA is in webers; ε is in volts. Only the <em>change</em> matters, not the flux itself.</p>
            <p><b>Lenz’s law.</b> The minus sign: the induced current’s own magnetic field opposes the change in flux that caused it. That is energy conservation: you must do work pushing the magnet against the induced field.</p>
            <details>
              <summary>Model, assumptions and limits</summary>
              <ul>
                <li>Magnet = point dipole (M = 5 A·m²); flux through one loop is exact for a dipole on the axis.</li>
                <li>Coil radius 5 cm, length 6 cm; turns evenly spread, Φ per turn averaged over 24 sample loops.</li>
                <li>ε is the finite difference −N ΔΦ/Δt on a fixed 1/480 s step, so it does not depend on frame rate.</li>
                <li>Ignored: self-inductance, eddy currents, braking force on the magnet, and the real field of a finite magnet close to the coil.</li>
                <li>The coil is drawn with N/10 turns for clarity; the physics uses the real N.</li>
              </ul>
            </details>
          </section>
        </aside>
      </main>
    </div>
  );
}
