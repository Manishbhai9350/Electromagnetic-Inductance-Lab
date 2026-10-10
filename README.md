# EMI Lab: bar magnet through a copper coil
`npm install && npm run build` · `npm run dev` · `npm run test` (physics checks, no browser needed)

- `src/physics/` rendering-free simulation (point-dipole flux, ε = −N dΦ/dt on a fixed 1/480 s step) and tests
- `src/components/` R3F scene (Scene) and live graph (Graph); `src/scenarios.ts` prediction scenarios
- Shortcuts: Space play/pause, ←/→ nudge magnet, R reset, T theme, 1–4 camera presets
Extending to flux, motional EMF, AC generator, inductance: add a new simulation class beside `induction.ts`, reuse Scene/Graph/App panels.
