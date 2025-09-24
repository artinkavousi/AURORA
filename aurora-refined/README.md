# Aurora Refined

This folder contains a modular rebuild of the original Flow WebGPU experience.
It keeps the simulation and rendering capabilities of the legacy project while
restructuring the orchestration into explicit, testable modules.

## Highlights

- **Lifecycle isolation** – The `Application` class delegates to focused
  modules for environment, simulation, audio, effects, interaction, and
  performance governance.
- **Composable pipeline** – Rendering, simulation updates, audio reactivity,
  and post-processing now flow through a predictable loop managed by
  `UpdateLoop`.
- **UI infrastructure** – Bootstrapping concerns (loading veil and error
  handling) live in `LoadingOverlay`, avoiding scattered DOM queries.
- **Compatibility** – The module layer reuses the battle-tested simulation,
  audio, and UI building blocks from the legacy codebase via relative imports.

Run the project with:

```bash
npm run dev:refined
```

Build the project with:

```bash
npm run build:refined
```
