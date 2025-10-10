# Target File Map

```
AURORA/
├── docs/
│   ├── Proposal.md
│   ├── Refactor Plan.md
│   └── File Map.md
├── src/
│   ├── engine/
│   │   ├── core/
│   │   │   ├── sceneEngine.ts
│   │   │   └── contracts/
│   │   │       └── auroraEngine.ts
│   │   ├── loaders/
│   │   │   ├── assetLoader.ts
│   │   │   └── materials/
│   │   │       └── index.ts
│   │   └── systems/
│   │       ├── animationSystem.ts
│   │       └── physicsSystem.ts
│   ├── store/
│   │   ├── engineStore.ts
│   │   ├── uiStore.ts
│   │   └── index.ts
│   ├── view/
│   │   ├── r3f/
│   │   │   ├── AppCanvas.tsx
│   │   │   ├── controls/
│   │   │   │   └── OrbitControls.tsx
│   │   │   ├── scenes/
│   │   │   │   ├── MainScene.tsx
│   │   │   │   └── layers/
│   │   │   │       ├── EnvironmentLayer.tsx
│   │   │   │       └── EffectsLayer.tsx
│   │   │   └── hooks/
│   │   │       ├── useEngineFrame.ts
│   │   │       └── useSceneAssets.ts
│   │   ├── controls/
│   │   │   └── tweakpane/
│   │   │       ├── debugPanel.ts
│   │   │       └── presets/
│   │   │           └── default.json
│   │   └── ui/
│   │       ├── layout/
│   │       │   └── Shell.tsx
│   │       └── components/
│   │           └── StatusBar.tsx
│   ├── routes/
│   │   ├── index.tsx
│   │   └── legacyRedirect.tsx
│   └── utils/
│       ├── performance/
│       │   └── metrics.ts
│       └── testing/
│           └── visualRegression.ts
├── tests/
│   ├── engine/
│   │   └── sceneEngine.test.ts
│   └── visual/
│       └── comparison.spec.ts
└── package.json
```

This layout aligns the forthcoming SFM (Simulation-Frontend-Management) separation: `src/engine` hosts headless simulation logic, `src/view` contains presentation and control surfaces, and `src/store` centralizes shared state. The `tests` directory captures both unit and visual regression suites to support the Verify phase.
