# Aurora Migration Proposal

## Executive Summary
Aurora's legacy Three.js integration has grown tightly coupled to bespoke scene management utilities, which limits maintainability and experiment velocity. This proposal recommends migrating to a modular rendering stack centered on a headless simulation core and a modern React Three Fiber (R3F) presentation layer. The migration will deliver a composable architecture, enable consistent UI tooling through Tweakpane, and simplify state orchestration with lightweight stores such as Zustand or Jotai. The resulting system will support rapid iteration on visual experiences while lowering the cost of onboarding and future refactors.

## Target Tech Stack
- **Three r180** for the rendering engine baseline, leveraging its improved WebGPU readiness and refreshed loaders.
- **React Three Fiber (R3F)** to declaratively author scene graphs and integrate with the existing React UI shell.
- **Tweakpane** to provide live parameter controls for designers and engineers without bespoke panels.
- **Zustand or Jotai** for scoped state management, enabling deterministic data flow between the headless engine and the R3F presentation layer.

## Risks & Mitigations
| Risk | Impact | Mitigation |
| --- | --- | --- |
| Regression in rendering features during migration | Medium | Maintain a headless engine contract with snapshot tests to validate material, lighting, and animation outputs before swapping presenters. |
| Performance degradation from React reconciliation | Medium | Employ R3F's `useFrame` hooks and memoized components; profile using React DevTools and Three.js inspector to keep frame budgets in check. |
| Knowledge gap on new tooling (R3F, Zustand/Jotai) | Low | Schedule focused training sessions and circulate curated documentation before the Replace phase. |
| Extended downtime due to stepwise rollout | Low | Follow an incremental adapter strategy that keeps the legacy scene available until verification passes in parallel environments. |

## Migration Timeline
| Phase | Duration | Key Activities |
| --- | --- | --- |
| Week 1: Analyze | Inventory existing Three.js utilities, identify implicit contracts, and catalog shader/material usage. |
| Weeks 2–3: Extract | Isolate the simulation logic into a headless engine module with typed interfaces and regression tests. |
| Weeks 3–4: Wrap | Implement adapters that expose the headless engine to both the legacy renderer and the new R3F layer, ensuring feature parity. |
| Weeks 4–5: Replace | Incrementally move presentation responsibilities to R3F components, wiring state through Zustand/Jotai stores and instrumenting Tweakpane controls. |
| Week 6: Verify | Conduct integrated QA, performance benchmarks, and documentation handoff before decommissioning the legacy renderer. |

## Research Sources
1. Three.js r180 release notes highlighting WebGPU and loader updates: <https://github.com/mrdoob/three.js/releases/tag/r180>
2. React Three Fiber documentation on architecture and hooks: <https://docs.pmnd.rs/react-three-fiber/getting-started/introduction>
3. Tweakpane official guide detailing panel configuration patterns: <https://tweakpane.github.io/docs/>
4. Zustand documentation covering store patterns and best practices: <https://docs.pmnd.rs/zustand/getting-started/introduction>
5. Jotai release notes for atom-based state management: <https://github.com/pmndrs/jotai/releases>
