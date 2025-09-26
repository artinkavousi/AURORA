const DEFAULTS = {
  enabled: true,
  camera: {
    fov: 60,
    exposure: 0.66,
    envIntensity: 0.5,
    bgRotation: 2.15,
    envRotation: -2.15,
  },
  lens: {
    enabled: false,
    sensorWidth: 36.0,
    focalLength: 24.0,
    fStop: 1.8,
    driveFov: true,
    focusSmooth: 0.2,
  },
  dof: {
    enabled: true,
    autoFocus: true,
    focus: 0.8,
    range: 0.08,
    amount: 1.15,
    highQuality: true,
    quality: 1.0,
    nearBoost: 1.0,
    farBoost: 1.0,
    highlightThreshold: 0.8,
    highlightGain: 0.6,
    apertureBlades: 7,
    apertureRotation: 0.0,
    aperturePetal: 1.0,
    anamorphic: 0.0,
  },
  bloom: {
    enabled: true,
    strength: 1.2,
    radius: 1.0,
    threshold: 0.0005,
  },
  vignette: {
    enabled: false,
    amount: 0.25,
  },
  grain: {
    enabled: false,
    amount: 0.08,
  },
  chroma: {
    enabled: false,
    amount: 0.0025,
    center: { x: 0.5, y: 0.5 },
    scale: 1.0,
  },
  motion: {
    enabled: false,
    amount: 0.35,
  },
  color: {
    saturation: 1.0,
    contrast: 1.0,
    lift: 0.0,
  },
  aa: {
    mode: 'off',
    amount: 1.0,
  },
  ao: {
    enabled: false,
    radius: 0.25,
    thickness: 1.0,
    distanceExponent: 1.0,
    scale: 1.0,
    samples: 16,
    resolutionScale: 1.0,
  },
  ssr: {
    enabled: false,
    opacity: 0.2,
    maxDistance: 1.0,
    thickness: 0.1,
    resolutionScale: 0.75,
    metalness: 0.8,
  },
};

const clone = (value) => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const assignDeep = (target, source) => {
  Object.keys(target).forEach((key) => {
    if (!(key in source)) delete target[key];
  });
  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = Array.isArray(value) ? [] : {};
      }
      assignDeep(target[key], value);
    } else {
      target[key] = value;
    }
  });
  return target;
};

class PostFXState {
  constructor(defaults) {
    this._defaults = clone(defaults);
    this._state = clone(defaults);
    this._listeners = new Set();
    this.version = 0;
  }

  get value() {
    return this._state;
  }

  snapshot() {
    return clone(this._state);
  }

  reset() {
    this._state = clone(this._defaults);
    this._emit();
  }

  set(path, value, { notify = true } = {}) {
    if (!path) return;
    const segments = Array.isArray(path) ? path : `${path}`.split('.');
    const last = segments[segments.length - 1];
    let cursor = this._state;
    for (let i = 0; i < segments.length - 1; i += 1) {
      const key = segments[i];
      if (!cursor[key] || typeof cursor[key] !== 'object') {
        cursor[key] = {};
      }
      cursor = cursor[key];
    }
    const current = cursor[last];
    const nextValue = value && typeof value === 'object' && !Array.isArray(value)
      ? clone(value)
      : value;
    const same = (typeof current === 'object' && typeof nextValue === 'object')
      ? JSON.stringify(current) === JSON.stringify(nextValue)
      : current === nextValue;
    if (same) return;
    cursor[last] = nextValue;
    if (notify) this._emit();
  }

  update(partial) {
    assignDeep(this._state, { ...this._state, ...partial });
    this._emit();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  _emit() {
    this.version += 1;
    const snapshot = this.snapshot();
    this._listeners.forEach((fn) => {
      try {
        fn(snapshot, this.version);
      } catch (err) {
        console.warn('postFxState listener error', err);
      }
    });
  }
}

export const postFxState = new PostFXState(DEFAULTS);
export const POST_FX_DEFAULTS = clone(DEFAULTS);
export const syncStateObject = assignDeep;

