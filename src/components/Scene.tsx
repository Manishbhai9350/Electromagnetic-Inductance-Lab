import { useEffect, useMemo, useRef, type ElementRef } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { ContactShadows, Environment, Html, Lightformer, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { COIL, MAGNET, emfReference, type InductionSim, type Orient } from '../physics/induction';

const S = 10; // scene units per metre; physics axis z maps to scene x
export const PRESETS = { Perspective: [3.2, 2.2, 5], Side: [0, 0.4, 7], Top: [0, 7, 0.01], Axis: [7, 0.3, 0] } as const;
export type PresetName = keyof typeof PRESETS;
type Controls = ElementRef<typeof OrbitControls>;

function Stepper({ sim }: { sim: InductionSim }) {
  useFrame((_, dt) => sim.advance(dt));
  return null;
}

class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(private turns: number) { super(); }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return target.set((t - 0.5) * COIL.length * S, COIL.radius * S * Math.cos(a), COIL.radius * S * Math.sin(a));
  }
}

/** Drawn turns = N / 10 (a readable 1:10 scale); physics always uses the real N. */
function Coil({ sim, turns }: { sim: InductionSim; turns: number }) {
  const drawn = Math.max(2, Math.round(turns / 10));
  const curve = useMemo(() => new Helix(drawn), [drawn]);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    if (mat.current) mat.current.emissiveIntensity = Math.min(1, Math.abs(sim.emf) / emfReference(sim.p.turns)) * 0.9;
  });
  return (
    <mesh>
      <tubeGeometry args={[curve, drawn * 24, 0.014, 8, false]} />
      <meshStandardMaterial ref={mat} color="#b87333" metalness={1} roughness={0.28} emissive="#ff7a1a" emissiveIntensity={0} />
    </mesh>
  );
}

function Magnet({ sim, orientation, onDrag }: { sim: InductionSim; orientation: Orient; onDrag: (d: boolean) => void }) {
  const group = useRef<THREE.Group>(null);
  const { camera, gl, raycaster } = useThree();
  const half = (MAGNET.length * S) / 2, w = MAGNET.width * S;
  useFrame(() => { if (group.current) group.current.position.x = sim.z * S; });

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation(); sim.pause(); onDrag(true);
    const el = gl.domElement; el.style.cursor = 'grabbing';
    const plane = new THREE.Plane(), nrm = new THREE.Vector3(), pt = new THREE.Vector3(), ndc = new THREE.Vector2();
    let off: number | null = null;
    const move = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      camera.getWorldDirection(nrm); nrm.x = 0; // plane contains the axis and faces the camera
      if (nrm.lengthSq() < 1e-4) nrm.set(0, 0, 1);
      plane.setFromNormalAndCoplanarPoint(nrm.normalize(), pt.set(0, 0, 0));
      if (!raycaster.ray.intersectPlane(plane, pt)) return;
      if (off === null) off = sim.z * S - pt.x;
      sim.moveTo((pt.x + off) / S);
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      el.style.cursor = ''; onDrag(false);
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };

  const poles: [string, number, string][] = [['N', orientation, '#c8372d'], ['S', -orientation, '#3d6fb0']];
  return (
    <group ref={group} onPointerDown={onDown}
      onPointerOver={() => { gl.domElement.style.cursor = 'grab'; }} onPointerOut={() => { gl.domElement.style.cursor = ''; }}>
      {poles.map(([label, side, color]) => (
        <group key={label} position={[(side * half) / 2, 0, 0]}>
          <mesh><boxGeometry args={[half, w, w]} /><meshStandardMaterial color={color} metalness={0.35} roughness={0.4} /></mesh>
          <Html center position={[0, w * 0.9, 0]} style={{ pointerEvents: 'none' }}><span className="pole">{label}</span></Html>
        </group>
      ))}
    </group>
  );
}

function CameraRig({ preset, reduced, controls }: { preset: { name: PresetName; n: number }; reduced: boolean; controls: React.RefObject<Controls> }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    const c = controls.current; if (!c) return;
    const [x, y, z] = PRESETS[preset.name];
    if (reduced || preset.n === 0) { camera.position.set(x, y, z); c.target.set(0, 0, 0); c.update(); return; }
    c.target.set(0, 0, 0);
    const tw = gsap.to(camera.position, { x, y, z, duration: 0.8, ease: 'power2.inOut', onUpdate: () => c.update() });
    return () => { tw.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset.n]);
  return null;
}

interface SceneProps {
  sim: InductionSim; theme: 'dark' | 'light'; turns: number; orientation: Orient; reduced: boolean;
  preset: { name: PresetName; n: number }; dragging: boolean; onDrag: (d: boolean) => void;
}
export function Scene({ sim, theme, turns, orientation, reduced, preset, dragging, onDrag }: SceneProps) {
  const controls = useRef<Controls>(null);
  const dark = theme === 'dark';
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 38, near: 0.1, far: 60, position: [3.2, 2.2, 5] }} gl={{ antialias: true }}>
      <color attach="background" args={[dark ? '#0d0f12' : '#eef0f2']} />
      <Stepper sim={sim} />
      <ambientLight intensity={dark ? 0.25 : 0.5} />
      <directionalLight position={[3, 5, 2]} intensity={dark ? 1.2 : 1.6} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.5} position={[0, 5, -4]} scale={[10, 3, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[-5, 1, 3]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[5, 1, 3]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
      </Environment>
      <Coil sim={sim} turns={turns} />
      <Magnet sim={sim} orientation={orientation} onDrag={onDrag} />
      <ContactShadows position={[0, -0.9, 0]} opacity={dark ? 0.5 : 0.3} blur={2.4} far={2} scale={14} />
      <OrbitControls ref={controls} makeDefault enableDamping={!reduced} enabled={!dragging} minDistance={2} maxDistance={14} />
      <CameraRig preset={preset} reduced={reduced} controls={controls} />
    </Canvas>
  );
}
