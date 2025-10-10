import type { FpsGraphBladeApi } from '@tweakpane/plugin-essentials';
import type { PanelSchema } from './panel.orchestrator';
import type { PanelControlSchema } from './panel.orchestrator';
import type { PanelSectionSchema } from './panel.orchestrator';

export interface DefaultPanelSchemaOptions {
  onFpsReady?: (api: FpsGraphBladeApi) => void;
  onRenderModeChange?: (mode: number) => void;
  renderMode?: number;
}

const gravityOptions = [
  { text: 'Down', value: 1 },
  { text: 'Center', value: 2 },
  { text: 'Device', value: 3 },
  { text: 'Mouse', value: 4 },
  { text: 'Back', value: 0 },
];

const solverControls: PanelControlSchema[] = [
  {
    id: 'simulation-run',
    type: 'boolean',
    label: 'Run Simulation',
    binding: { path: 'simulation.run' },
  },
  {
    id: 'simulation-speed',
    type: 'number',
    label: 'Speed',
    binding: { path: 'simulation.speed' },
    ui: { min: 0, max: 3, step: 0.05 },
  },
  {
    id: 'simulation-noise',
    type: 'number',
    label: 'Noise',
    binding: { path: 'simulation.noise' },
    ui: { min: 0, max: 2, step: 0.01 },
  },
  {
    id: 'simulation-gravity',
    type: 'choice',
    label: 'Gravity Mode',
    binding: { path: 'simulation.gravityType' },
    ui: { options: gravityOptions },
  },
  {
    id: 'simulation-transfer',
    type: 'choice',
    label: 'Transfer Mode',
    binding: { path: 'simulation.transferMode' },
    ui: {
      options: [
        { text: 'PIC', value: 0 },
        { text: 'FLIP', value: 1 },
        { text: 'Hybrid', value: 2 },
      ],
    },
  },
  {
    id: 'simulation-flip-ratio',
    type: 'number',
    label: 'FLIP Ratio',
    binding: { path: 'simulation.flipRatio' },
    ui: { min: 0, max: 1, step: 0.01 },
  },
];

const fluidControls: PanelControlSchema[] = [
  {
    id: 'simulation-vorticity-enabled',
    type: 'boolean',
    label: 'Vorticity',
    binding: { path: 'simulation.vorticityEnabled' },
  },
  {
    id: 'simulation-vorticity-epsilon',
    type: 'number',
    label: 'Vorticity Strength',
    binding: { path: 'simulation.vorticityEpsilon' },
    ui: { min: 0, max: 1, step: 0.01 },
  },
  {
    id: 'simulation-surface-enabled',
    type: 'boolean',
    label: 'Surface Tension',
    binding: { path: 'simulation.surfaceTensionEnabled' },
  },
  {
    id: 'simulation-surface-coeff',
    type: 'number',
    label: 'Surface Coefficient',
    binding: { path: 'simulation.surfaceTensionCoeff' },
    ui: { min: 0, max: 2, step: 0.05 },
  },
  {
    id: 'simulation-adaptive',
    type: 'boolean',
    label: 'Adaptive Timestep',
    binding: { path: 'simulation.adaptiveTimestep' },
  },
  {
    id: 'simulation-cfl',
    type: 'number',
    label: 'CFL Target',
    binding: { path: 'simulation.cflTarget' },
    ui: { min: 0.3, max: 1.0, step: 0.01 },
  },
];

const renderingControls = (options?: DefaultPanelSchemaOptions): PanelControlSchema[] => [
  {
    id: 'rendering-mode',
    type: 'choice',
    label: 'Render Mode',
    binding: {
      initialValue: options?.renderMode ?? 0,
      onChange: (value) => options?.onRenderModeChange?.(Number(value)),
    },
    ui: {
      options: [
        { text: 'Mesh', value: 0 },
        { text: 'Point', value: 1 },
      ],
    },
  },
  {
    id: 'rendering-bloom-toggle',
    type: 'boolean',
    label: 'Bloom',
    binding: { path: 'rendering.bloom' },
  },
  {
    id: 'rendering-points',
    type: 'boolean',
    label: 'Point Renderer',
    binding: { path: 'rendering.points' },
  },
];

const bloomControls: PanelControlSchema[] = [
  {
    id: 'bloom-enabled',
    type: 'boolean',
    label: 'Enable Bloom',
    binding: { path: 'bloom.enabled' },
  },
  {
    id: 'bloom-strength',
    type: 'number',
    label: 'Strength',
    binding: { path: 'bloom.strength' },
    ui: { min: 0, max: 2, step: 0.01 },
  },
  {
    id: 'bloom-threshold',
    type: 'number',
    label: 'Threshold',
    binding: { path: 'bloom.threshold' },
    ui: { min: 0, max: 1, step: 0.01 },
  },
  {
    id: 'bloom-radius',
    type: 'number',
    label: 'Radius',
    binding: { path: 'bloom.radius' },
    ui: { min: 0, max: 2, step: 0.01 },
  },
];

const audioControls: PanelControlSchema[] = [
  {
    id: 'audio-enabled',
    type: 'boolean',
    label: 'Audio Input',
    binding: { path: 'audio.enabled' },
  },
  {
    id: 'audio-reactive',
    type: 'boolean',
    label: 'Audio Reactive',
    binding: { path: 'audioReactive.enabled' },
  },
  {
    id: 'audio-reactive-mode',
    type: 'choice',
    label: 'Reactive Mode',
    binding: { path: 'audioReactive.mode' },
    ui: {
      options: [
        { text: 'Spectrum', value: 0 },
        { text: 'Wave', value: 1 },
        { text: 'Hybrid', value: 2 },
      ],
    },
  },
  {
    id: 'audio-reactive-inertia',
    type: 'number',
    label: 'Inertia',
    binding: { path: 'audioReactive.inertia' },
    ui: { min: 0, max: 1, step: 0.01 },
  },
  {
    id: 'audio-reactive-resonance',
    type: 'number',
    label: 'Resonance',
    binding: { path: 'audioReactive.resonance' },
    ui: { min: 0, max: 2, step: 0.01 },
  },
];

const presetControls: PanelControlSchema[] = [
  {
    id: 'panel-search',
    type: 'search',
    label: 'Search Controls',
    binding: {},
    ui: { placeholder: 'Filter controls…' },
  },
  {
    id: 'panel-reset',
    type: 'button',
    label: 'Reset to Defaults',
    action: { type: 'reset' },
  },
  {
    id: 'panel-import',
    type: 'button',
    label: 'Import Presets',
    action: { type: 'import-presets', prompt: 'Paste preset JSON to import' },
  },
  {
    id: 'panel-export',
    type: 'button',
    label: 'Export Presets',
    action: { type: 'export-presets' },
  },
];

const overviewSections = (options?: DefaultPanelSchemaOptions): PanelSectionSchema[] => [
  {
    id: 'overview-performance',
    title: 'Performance',
    expanded: true,
    controls: [
      {
        id: 'performance-fps',
        type: 'monitor',
        label: 'Frame Rate',
        blade: { view: 'fpsgraph', lineCount: 2 },
        onReady: (api) => options?.onFpsReady?.(api as FpsGraphBladeApi),
      },
    ],
  },
  {
    id: 'overview-presets',
    title: 'Presets & Search',
    expanded: true,
    controls: presetControls,
  },
];

export const createDefaultPanelSchema = (
  options?: DefaultPanelSchemaOptions
): PanelSchema => ({
  id: 'aurora-panel',
  title: 'Aurora Control Center',
  tabs: [
    {
      id: 'tab-overview',
      title: 'Overview',
      order: 0,
      sections: overviewSections(options),
    },
    {
      id: 'tab-simulation',
      title: 'Simulation',
      order: 1,
      sections: [
        { id: 'simulation-solver', title: 'Solver', expanded: true, controls: solverControls },
        { id: 'simulation-fluid', title: 'Fluid Dynamics', expanded: false, controls: fluidControls },
      ],
    },
    {
      id: 'tab-rendering',
      title: 'Rendering',
      order: 2,
      sections: [
        { id: 'rendering-primary', title: 'Renderer', expanded: true, controls: renderingControls(options) },
        { id: 'rendering-bloom', title: 'Bloom', expanded: false, controls: bloomControls },
      ],
    },
    {
      id: 'tab-audio',
      title: 'Audio',
      order: 3,
      sections: [
        { id: 'audio-reactive-section', title: 'Reactive Mapping', expanded: true, controls: audioControls },
      ],
    },
  ],
});
