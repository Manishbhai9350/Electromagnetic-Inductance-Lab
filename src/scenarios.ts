import type { Orient } from './physics/induction';
export interface Scenario {
  id: string; title: string; setup: string; z0: number; direction: Orient; orientation: Orient;
  speed: number; duration: number; question: string; options: string[]; answer: number; explanation: string;
}
export const SCENARIOS: Scenario[] = [
  { id: 'approach', title: 'Approaching', setup: 'North pole leads toward the coil at 0.10 m/s.', z0: -0.2, direction: 1, orientation: 1, speed: 0.1, duration: 12,
    question: 'The N pole approaches, so flux through the coil (along +z) grows. What does the induced EMF do?',
    options: ['Stays zero: the magnet never touches the coil', 'Becomes negative: its current opposes the growing flux', 'Becomes positive: its current helps the flux grow'], answer: 1,
    explanation: 'Φ rises, so dΦ/dt > 0 and ε = −N dΦ/dt < 0. The current is clockwise seen from +z; its field points −z, so the coil face nearest the magnet acts as a north pole and repels it (Lenz).' },
  { id: 'away', title: 'Moving away', setup: 'Magnet leaves the coil centre at 0.10 m/s.', z0: 0, direction: 1, orientation: 1, speed: 0.1, duration: 12,
    question: 'Now the magnet leaves and flux falls. Compared with approaching, the EMF sign is…',
    options: ['The same', 'Opposite', 'Zero'], answer: 1,
    explanation: 'Φ falls, so dΦ/dt < 0 and ε > 0. The coil now tries to keep the flux up: induced field along +z, attracting the retreating magnet.' },
  { id: 'still', title: 'Stationary', setup: 'Magnet rests at the coil centre where flux is largest.', z0: 0, direction: 1, orientation: 1, speed: 0, duration: 5,
    question: 'The flux is at its maximum and the magnet is still. The EMF is…',
    options: ['Maximum', 'Zero', 'Negative'], answer: 1,
    explanation: 'EMF depends on how fast flux changes, not on how large it is. dΦ/dt = 0, so ε = 0 even though Φ is large.' },
  { id: 'faster', title: 'Moving faster', setup: 'Same approach, but at 0.20 m/s.', z0: -0.2, direction: 1, orientation: 1, speed: 0.2, duration: 12,
    question: 'The speed doubles. The peak |EMF| compared with the 0.10 m/s run will be…',
    options: ['The same', 'About twice as large, in a pulse half as long', 'Smaller'], answer: 1,
    explanation: 'dΦ/dt = (dΦ/dz)·v at each position, so the peak doubles; the pulse is traversed in half the time, so the area under it (the total flux change) is unchanged.' },
  { id: 'reversed', title: 'Reversed poles', setup: 'South pole now leads toward the coil at 0.10 m/s.', z0: -0.2, direction: 1, orientation: -1, speed: 0.1, duration: 12,
    question: 'With the S pole leading, the EMF compared with the first scenario is…',
    options: ['The same sign', 'Opposite sign, same size', 'Zero'], answer: 1,
    explanation: 'The flux is now along −z and its magnitude grows, so dΦ/dt < 0 and ε > 0. The induced current reverses, but it still opposes the change: the coil face nearest the magnet becomes a south pole.' },
];
