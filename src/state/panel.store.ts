import type { StoreApi } from 'zustand/vanilla';
import { createStore } from 'zustand/vanilla';
import { atom, createStore as createJotaiStore } from 'jotai/vanilla';
import type { FlowConfig } from '../config';
import { defaultConfig } from '../config';

type PathSegment = string | number;

type PanelStoreListener<T> = (value: T, previous: T) => void;

type PanelStoreSelector<T> = (state: PanelStoreState) => T;

interface PanelStoreState {
  config: FlowConfig;
  presets: Record<string, FlowConfig>;
  searchTerm: string;
  dirty: boolean;
  setValue: (path: string, value: unknown) => void;
  replaceConfig: (config: FlowConfig) => void;
  reset: () => void;
  setSearch: (term: string) => void;
  importPresets: (payload: string | Record<string, FlowConfig>) => void;
  exportPresets: () => string;
  registerPreset: (name: string, config: FlowConfig) => void;
}

const jotaiStore = createJotaiStore();

const configAtom = atom(defaultConfig);
const searchAtom = atom('');
const dirtyAtom = atom(false);

function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item)) as unknown as T;
  }

  if (value && typeof value === 'object') {
    if (typeof (value as any).clone === 'function') {
      return (value as any).clone();
    }

    const clone: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      clone[key] = cloneValue(child);
    }
    return clone as T;
  }

  return value;
}

function cloneBranch(value: unknown, nextKey?: PathSegment): any {
  if (Array.isArray(value)) {
    return value.slice();
  }

  if (value && typeof value === 'object') {
    if (typeof (value as any).clone === 'function') {
      return (value as any).clone();
    }
    return { ...(value as Record<string, unknown>) };
  }

  if (typeof nextKey === 'number') {
    return [];
  }
  return {};
}

function parsePath(path: string): PathSegment[] {
  if (!path) {
    return [];
  }

  const normalized = path.replace(/\[(\d+)\]/g, '.$1');
  return normalized
    .split('.')
    .filter(Boolean)
    .map((segment) => {
      const numeric = Number(segment);
      return Number.isNaN(numeric) ? segment : numeric;
    });
}

function setAtPath(target: any, source: any, segments: PathSegment[], value: unknown): void {
  if (segments.length === 0) {
    return;
  }

  const [current, ...rest] = segments;
  if (rest.length === 0) {
    if (Array.isArray(target) && typeof current === 'number') {
      target[current] = value;
    } else if (target && typeof target === 'object') {
      (target as Record<PathSegment, unknown>)[current] = value;
    }
    return;
  }

  const nextSource = source ? (source as any)[current] : undefined;
  const nextTarget = cloneBranch(nextSource, rest[0]);
  if (Array.isArray(target) && typeof current === 'number') {
    target[current] = nextTarget;
  } else if (target && typeof target === 'object') {
    (target as Record<PathSegment, unknown>)[current] = nextTarget;
  }
  setAtPath(nextTarget, nextSource, rest, value);
}

function getAtPath(target: any, segments: PathSegment[]): unknown {
  return segments.reduce((acc: unknown, segment) => {
    if (acc == null) {
      return undefined;
    }
    if (Array.isArray(acc) && typeof segment === 'number') {
      return acc[segment];
    }
    if (typeof acc === 'object') {
      return (acc as Record<PathSegment, unknown>)[segment];
    }
    return undefined;
  }, target);
}

const panelStore = createStore<PanelStoreState>((set, get) => ({
  config: cloneValue(defaultConfig),
  presets: {},
  searchTerm: '',
  dirty: false,
  setValue: (path: string, value: unknown) => {
    const segments = parsePath(path);
    if (segments.length === 0) {
      return;
    }

    set((state) => {
      const nextConfig = cloneBranch(state.config);
      setAtPath(nextConfig, state.config, segments, value);
      jotaiStore.set(configAtom, nextConfig);
      jotaiStore.set(dirtyAtom, true);
      return {
        config: nextConfig,
        dirty: true,
      };
    });
  },
  replaceConfig: (config: FlowConfig) => {
    const next = cloneValue(config);
    set({ config: next, dirty: false });
    jotaiStore.set(configAtom, next);
    jotaiStore.set(dirtyAtom, false);
  },
  reset: () => {
    const next = cloneValue(defaultConfig);
    set({ config: next, dirty: false });
    jotaiStore.set(configAtom, next);
    jotaiStore.set(dirtyAtom, false);
  },
  setSearch: (term: string) => {
    set({ searchTerm: term });
    jotaiStore.set(searchAtom, term);
  },
  importPresets: (payload: string | Record<string, FlowConfig>) => {
    let parsed: Record<string, FlowConfig>;

    if (typeof payload === 'string') {
      parsed = JSON.parse(payload) as Record<string, FlowConfig>;
    } else {
      parsed = payload;
    }

    const normalized: Record<string, FlowConfig> = {};
    for (const [name, config] of Object.entries(parsed)) {
      normalized[name] = cloneValue(config);
    }

    set((state) => ({ presets: { ...state.presets, ...normalized } }));
  },
  exportPresets: () => {
    const { presets } = get();
    return JSON.stringify(presets, null, 2);
  },
  registerPreset: (name: string, config: FlowConfig) => {
    set((state) => ({ presets: { ...state.presets, [name]: cloneValue(config) } }));
  },
}));

export interface PanelStateApi {
  store: StoreApi<PanelStoreState>;
  getConfig: () => FlowConfig;
  getValue: <T = unknown>(path: string) => T;
  setValue: (path: string, value: unknown) => void;
  replaceConfig: (config: FlowConfig) => void;
  reset: () => void;
  setSearch: (term: string) => void;
  getSearch: () => string;
  subscribeToConfig: (
    listener: (config: FlowConfig) => void,
    options?: { fireImmediately?: boolean }
  ) => () => void;
  subscribeToPath: <T = unknown>(
    path: string,
    listener: PanelStoreListener<T>,
    options?: { fireImmediately?: boolean }
  ) => () => void;
  subscribeToSearch: (
    listener: (term: string) => void,
    options?: { fireImmediately?: boolean }
  ) => () => void;
  importPresets: (payload: string | Record<string, FlowConfig>) => void;
  exportPresets: () => string;
  registerPreset: (name: string, config: FlowConfig) => void;
  jotai: ReturnType<typeof createJotaiStore>;
  atoms: {
    config: typeof configAtom;
    search: typeof searchAtom;
    dirty: typeof dirtyAtom;
  };
}

function subscribeWithSelector<T>(
  selector: PanelStoreSelector<T>,
  listener: PanelStoreListener<T>,
  options?: { fireImmediately?: boolean }
): () => void {
  const unsubscribe = panelStore.subscribe(selector, listener, {
    equalityFn: Object.is,
    fireImmediately: options?.fireImmediately ?? false,
  });
  return unsubscribe;
}

export const panelState: PanelStateApi = {
  store: panelStore,
  jotai: jotaiStore,
  atoms: {
    config: configAtom,
    search: searchAtom,
    dirty: dirtyAtom,
  },
  getConfig: () => panelStore.getState().config,
  getValue: <T = unknown>(path: string): T => {
    const segments = parsePath(path);
    return getAtPath(panelStore.getState().config, segments) as T;
  },
  setValue: (path: string, value: unknown) => panelStore.getState().setValue(path, value),
  replaceConfig: (config: FlowConfig) => panelStore.getState().replaceConfig(config),
  reset: () => panelStore.getState().reset(),
  setSearch: (term: string) => panelStore.getState().setSearch(term),
  getSearch: () => panelStore.getState().searchTerm,
  subscribeToConfig: (listener, options) =>
    subscribeWithSelector((state) => state.config, (value) => listener(value), options),
  subscribeToPath: <T = unknown>(path: string, listener: PanelStoreListener<T>, options?: { fireImmediately?: boolean }) => {
    const segments = parsePath(path);
    return subscribeWithSelector(
      (state) => getAtPath(state.config, segments) as T,
      listener,
      options,
    );
  },
  subscribeToSearch: (listener, options) =>
    subscribeWithSelector((state) => state.searchTerm, (value) => listener(value), options),
  importPresets: (payload) => panelStore.getState().importPresets(payload),
  exportPresets: () => panelStore.getState().exportPresets(),
  registerPreset: (name, config) => panelStore.getState().registerPreset(name, config),
};

export type { PanelStoreState };
