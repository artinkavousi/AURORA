import { createStore } from 'zustand/vanilla';
import { defaultConfig, mergeConfig, updateParticleParams, type FlowConfig } from '../config';

export interface EngineParamsSlice {
  engineConfig: FlowConfig;
  engineVersion: number;
  setEngineConfig: (config: FlowConfig) => void;
  updateEngineConfig: (updater: (config: FlowConfig) => FlowConfig) => void;
  updateSimulation: (patch: Partial<FlowConfig['simulation']>) => void;
  updateParticles: (patch: Partial<FlowConfig['particles']>) => void;
  updateRendering: (patch: Partial<FlowConfig['rendering']>) => void;
  updateCamera: (patch: Partial<FlowConfig['camera']>) => void;
  updateBloom: (patch: Partial<FlowConfig['bloom']>) => void;
  updateRadialFocus: (patch: Partial<FlowConfig['radialFocus']>) => void;
  updateRadialCA: (patch: Partial<FlowConfig['radialCA']>) => void;
  recalculateParticleParams: () => void;
  resetEngineConfig: () => void;
}

export interface UiSchemaState {
  ui: {
    activePanels: Record<string, boolean>;
    lastChangedAt: number;
  };
  togglePanel: (id: string, open?: boolean) => void;
  markUiDirty: () => void;
}

export interface AudioReactivitySlice {
  audioVersion: number;
  updateAudio: (patch: Partial<FlowConfig['audio']>) => void;
  updateAudioReactive: (patch: Partial<FlowConfig['audioReactive']>) => void;
}

export interface PersistenceSlice {
  serializeConfig: () => FlowConfig;
  hydrateConfig: (config: Partial<FlowConfig>) => void;
}

export interface FlowSelectors {
  readonly isAudioPipelineEnabled: () => boolean;
  readonly getParticleCount: () => number;
}

export interface SelectorSlice {
  selectors: FlowSelectors;
}

export type FlowState = EngineParamsSlice & UiSchemaState & AudioReactivitySlice & PersistenceSlice & SelectorSlice;

function cloneConfig(config: FlowConfig): FlowConfig {
  return structuredClone(config);
}

function buildEngineUpdate(
  state: FlowState,
  config: FlowConfig,
): Pick<EngineParamsSlice, 'engineConfig' | 'engineVersion'> {
  return {
    engineConfig: config,
    engineVersion: state.engineVersion + 1,
  };
}

export const flowStore = createStore<FlowState>((set, get) => {
  const initialConfig = cloneConfig(defaultConfig);
  return {
    engineConfig: initialConfig,
    engineVersion: 0,
    setEngineConfig: (config: FlowConfig) => {
      const next = cloneConfig(config);
      updateParticleParams(next);
      set(state => ({
        ...buildEngineUpdate(state, next),
        audioVersion: state.audioVersion + 1,
      }));
    },
    updateEngineConfig: (updater) => {
      set(state => {
        const draft = cloneConfig(state.engineConfig);
        const next = updater(draft);
        updateParticleParams(next);
        return {
          ...buildEngineUpdate(state, next),
          audioVersion: state.audioVersion + 1,
        };
      });
    },
    updateSimulation: (patch) => {
      set(state => {
        const next: FlowConfig = {
          ...state.engineConfig,
          simulation: { ...state.engineConfig.simulation, ...patch },
        };
        updateParticleParams(next);
        return buildEngineUpdate(state, next);
      });
    },
    updateParticles: (patch) => {
      set(state => {
        const next: FlowConfig = {
          ...state.engineConfig,
          particles: { ...state.engineConfig.particles, ...patch },
        };
        updateParticleParams(next);
        return buildEngineUpdate(state, next);
      });
    },
    updateRendering: (patch) => {
      set(state => {
        const next: FlowConfig = {
          ...state.engineConfig,
          rendering: { ...state.engineConfig.rendering, ...patch },
        };
        return buildEngineUpdate(state, next);
      });
    },
    updateCamera: (patch) => {
      set(state => {
        const next: FlowConfig = {
          ...state.engineConfig,
          camera: { ...state.engineConfig.camera, ...patch },
        };
        return buildEngineUpdate(state, next);
      });
    },
    updateBloom: (patch) => {
      set(state => {
        const next: FlowConfig = {
          ...state.engineConfig,
          bloom: { ...state.engineConfig.bloom, ...patch },
        };
        return {
          ...buildEngineUpdate(state, next),
          audioVersion: state.audioVersion + 1,
        };
      });
    },
    updateRadialFocus: (patch) => {
      set(state => {
        const next: FlowConfig = {
          ...state.engineConfig,
          radialFocus: { ...state.engineConfig.radialFocus, ...patch },
        };
        return {
          ...buildEngineUpdate(state, next),
          audioVersion: state.audioVersion + 1,
        };
      });
    },
    updateRadialCA: (patch) => {
      set(state => {
        const next: FlowConfig = {
          ...state.engineConfig,
          radialCA: { ...state.engineConfig.radialCA, ...patch },
        };
        return {
          ...buildEngineUpdate(state, next),
          audioVersion: state.audioVersion + 1,
        };
      });
    },
    recalculateParticleParams: () => {
      set(state => {
        const next = cloneConfig(state.engineConfig);
        updateParticleParams(next);
        return buildEngineUpdate(state, next);
      });
    },
    resetEngineConfig: () => {
      const reset = cloneConfig(defaultConfig);
      updateParticleParams(reset);
      set(state => ({
        ...buildEngineUpdate(state, reset),
        audioVersion: state.audioVersion + 1,
      }));
    },

    ui: {
      activePanels: {},
      lastChangedAt: Date.now(),
    },
    togglePanel: (id, open) => {
      set(state => {
        const current = state.ui.activePanels[id] ?? false;
        const nextOpen = open ?? !current;
        return {
          ui: {
            activePanels: { ...state.ui.activePanels, [id]: nextOpen },
            lastChangedAt: Date.now(),
          },
        };
      });
    },
    markUiDirty: () => {
      set(state => ({
        ui: {
          ...state.ui,
          lastChangedAt: Date.now(),
        },
      }));
    },

    audioVersion: 0,
    updateAudio: (patch) => {
      set(state => {
        const next: FlowConfig = {
          ...state.engineConfig,
          audio: { ...state.engineConfig.audio, ...patch },
        };
        return {
          ...buildEngineUpdate(state, next),
          audioVersion: state.audioVersion + 1,
        };
      });
    },
    updateAudioReactive: (patch) => {
      set(state => {
        const next: FlowConfig = {
          ...state.engineConfig,
          audioReactive: { ...state.engineConfig.audioReactive, ...patch },
        };
        return {
          ...buildEngineUpdate(state, next),
          audioVersion: state.audioVersion + 1,
        };
      });
    },

    serializeConfig: () => cloneConfig(get().engineConfig),
    hydrateConfig: (config) => {
      set(state => {
        const merged = mergeConfig(cloneConfig(defaultConfig), config);
        updateParticleParams(merged);
        return {
          ...buildEngineUpdate(state, merged),
          audioVersion: state.audioVersion + 1,
        };
      });
    },

    selectors: {
      isAudioPipelineEnabled: () => {
        const { engineConfig } = get();
        return engineConfig.audio.enabled || engineConfig.audioReactive.enabled;
      },
      getParticleCount: () => get().engineConfig.particles.count,
    },
  };
});

export const selectEngineConfig = (state: FlowState) => state.engineConfig;
export const selectSimulationConfig = (state: FlowState) => state.engineConfig.simulation;
export const selectAudioConfig = (state: FlowState) => state.engineConfig.audio;
export const selectAudioReactiveConfig = (state: FlowState) => state.engineConfig.audioReactive;
export const selectUiState = (state: FlowState) => state.ui;
