import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

const ROUTE_SOURCE_OPTIONS = [
  { text: 'groove', value: 'groove' },
  { text: 'punch', value: 'punch' },
  { text: 'shimmer', value: 'shimmer' },
  { text: 'lift', value: 'lift' },
  { text: 'hush', value: 'hush' },
  { text: 'sway', value: 'sway' },
  { text: 'tempo lfo', value: 'tempoLfo' },
  { text: 'tempo strength', value: 'tempoStrength' },
  { text: 'beat', value: 'beat' },
  { text: 'level', value: 'level' },
  { text: 'bass', value: 'bass' },
  { text: 'mid', value: 'mid' },
  { text: 'treble', value: 'treble' },
];

const ROUTE_RANGE_PRESETS = {
  motion: {
    jetStrength: { add: { min: 0, max: 2.2, step: 0.01 }, beatBoost: { min: 0, max: 1.5, step: 0.01 }, min: { min: 0, max: 4 }, max: { min: 0.6, max: 4.5 } },
    vortexStrength: { add: { min: 0, max: 2.0, step: 0.01 }, min: { min: 0, max: 4 }, max: { min: 0.6, max: 4.5 } },
    curlStrength: { add: { min: 0, max: 1.6, step: 0.01 }, min: { min: 0, max: 3.5 }, max: { min: 0.4, max: 3.5 } },
    orbitStrength: { add: { min: 0, max: 1.4, step: 0.01 }, min: { min: 0, max: 3.5 }, max: { min: 0.4, max: 3.5 } },
    waveAmplitude: { add: { min: 0, max: 2.5, step: 0.01 }, min: { min: 0.0, max: 3.0 }, max: { min: 0.2, max: 3.0 } },
    apicBlend: { add: { min: -0.2, max: 0.6, step: 0.01 }, min: { min: 0, max: 1 }, max: { min: 0, max: 1 } },
    viscosity: { add: { min: -0.3, max: 0.3, step: 0.005 }, min: { min: 0.02, max: 0.6, step: 0.005 }, max: { min: 0.05, max: 0.6, step: 0.005 } },
  },
  visual: {
    surfaceNoise: { add: { min: -0.3, max: 0.6, step: 0.01 }, min: { min: 0.0, max: 2.0 }, max: { min: 0.1, max: 2.5 } },
    colorSaturation: { add: { min: 0, max: 0.8, step: 0.01 }, min: { min: 0.4, max: 2.0 }, max: { min: 0.6, max: 2.0 }, base: { min: 0.5, max: 1.6, step: 0.01 } },
    colorLift: { add: { min: 0, max: 0.3, step: 0.01 }, min: { min: -0.5, max: 0.5, step: 0.01 }, max: { min: -0.5, max: 0.5, step: 0.01 }, base: { min: -0.3, max: 0.3, step: 0.01 } },
    grain: { add: { min: 0, max: 0.12, step: 0.001 }, min: { min: 0, max: 0.2, step: 0.001 }, max: { min: 0, max: 0.3, step: 0.001 } },
  },
  atmos: {
    envSway: { add: { min: 0, max: 0.3, step: 0.005 }, beatBoost: { min: 0, max: 0.2, step: 0.005 } },
    bloom: { add: { min: 0, max: 0.9, step: 0.01 }, minStrength: { min: 0.3, max: 2.0, step: 0.01 }, maxStrength: { min: 0.6, max: 2.5, step: 0.01 }, thresholdAdd: { min: -0.001, max: 0.0005, step: 0.00001 }, thresholdMin: { min: 0.00005, max: 0.0015, step: 0.00001 }, thresholdMax: { min: 0.0001, max: 0.002, step: 0.00001 } },
    focus: { add: { min: 0, max: 0.5, step: 0.005 }, min: { min: 0.3, max: 1.2, step: 0.005 }, max: { min: 0.4, max: 1.4, step: 0.005 } },
    chroma: { add: { min: 0, max: 0.004, step: 0.0001 }, min: { min: 0, max: 0.01, step: 0.0001 }, max: { min: 0, max: 0.01, step: 0.0001 } },
  },
};

const DEFAULT_SLIDERS = {
  add: { min: -1.5, max: 2.5, step: 0.01 },
  min: { min: -2, max: 5, step: 0.01 },
  max: { min: -2, max: 5, step: 0.01 },
  beatBoost: { min: 0, max: 2.0, step: 0.01 },
  smooth: { min: 0.0, max: 0.98, step: 0.01 },
  hushMix: { min: 0, max: 1, step: 0.01 },
};

export default class AudioPanel {
  constructor(engine, conf, router) {
    this.engine = engine;
    this.conf = conf;
    this.router = router;
    this.gui = null;
    this._routes = router ? router.getRoutes() : {
      motion: { enabled: true, entries: {} },
      visual: { enabled: true, entries: {} },
      atmos: { enabled: true, entries: {} },
    };
    this._featureSmoothing = {
      level: 0.5,
      bass: 0.5,
      mid: 0.5,
      treble: 0.5,
      beat: 0.6,
    };
  }

  init(position = 'left') {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '16px';
    container.style.top = '50%';
    container.style.transform = 'translateY(-50%)';
    container.style.width = '380px';
    container.style.maxHeight = '86vh';
    container.style.padding = '12px';
    container.style.borderRadius = '16px';
    container.style.background = 'rgba(14, 18, 24, 0.34)';
    container.style.backdropFilter = 'blur(12px) saturate(150%)';
    container.style.WebkitBackdropFilter = 'blur(12px) saturate(150%)';
    container.style.border = '1px solid rgba(255,255,255,0.12)';
    container.style.boxShadow = '0 18px 45px rgba(0,0,0,0.35)';
    container.style.pointerEvents = 'auto';
    container.style.overflow = 'hidden auto';
    container.style.zIndex = 32;
    document.body.appendChild(container);

    const gui = new Pane({ container });
    gui.registerPlugin(EssentialsPlugin);

    const tabs = gui.addTab({
      pages: [
        { title: 'source' },
        { title: 'dynamics' },
        { title: 'choreo' },
        { title: 'visual' },
        { title: 'diagnostics' },
      ],
    });

    const [sourcePage, dynamicsPage, choreoPage, visualPage, diagnosticsPage] = tabs.pages.map((p) => p.pane);

    this._buildSourcePage(sourcePage);
    this._buildDynamicsPage(dynamicsPage);
    this._buildChoreoPage(choreoPage);
    this._buildVisualPage(visualPage);
    this._buildDiagnosticsPage(diagnosticsPage);

    this.gui = gui;
  }

  _rangeFor(group, key, prop) {
    return ROUTE_RANGE_PRESETS[group]?.[key]?.[prop] || DEFAULT_SLIDERS[prop] || DEFAULT_SLIDERS.add;
  }

  _mergeRoutes(target, source) {
    Object.keys(target).forEach((key) => {
      if (!(key in source)) delete target[key];
    });
    Object.entries(source).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (!target[key] || typeof target[key] !== 'object') target[key] = {};
        this._mergeRoutes(target[key], value);
      } else {
        target[key] = value;
      }
    });
  }

  _applyRoutes() {
    if (this.router?.setRoutes) this.router.setRoutes(this._routes);
  }

  _buildSourcePage(page) {
    const input = page.addFolder({ title: 'input', expanded: true });
    input.addBinding(this.conf, 'audioEnabled', { label: 'enable' });
    input.addBlade({
      view: 'list',
      label: 'source',
      options: [
        { text: 'mic', value: 'mic' },
        { text: 'file', value: 'file' },
      ],
      value: this.conf.audioSource,
    }).on('change', (ev) => { this.conf.audioSource = ev.value; });
    input.addBinding(this.conf, 'audioSensitivity', { min: 0.2, max: 3.0, step: 0.05, label: 'sensitivity' });
    input.addBinding(this.conf, 'audioAttack', { min: 0.05, max: 0.99, step: 0.01, label: 'attack' });
    input.addBinding(this.conf, 'audioRelease', { min: 0.05, max: 0.99, step: 0.01, label: 'release' });
    input.addBlade({ view: 'button', label: 'input', title: 'choose audio file' }).on('click', () => {
      const element = document.createElement('input');
      element.type = 'file';
      element.accept = 'audio/*';
      element.onchange = async () => {
        const file = element.files && element.files[0];
        if (!file) return;
        const buf = await file.arrayBuffer();
        try { await this.engine.connectFile(buf); }
        catch (e) { console.error(e); }
      };
      element.click();
    });

    const monitor = page.addFolder({ title: 'monitor', expanded: false });
    this._monitorState = { enable: false, level: 0.0 };
    monitor.addBinding(this._monitorState, 'enable', { label: 'monitor' }).on('change', () => {
      this.engine.setMonitorEnabled(this._monitorState.enable);
    });
    monitor.addBinding(this._monitorState, 'level', { min: 0, max: 1, step: 0.01, label: 'monitor lvl' }).on('change', () => {
      this.engine.setMonitorLevel(this._monitorState.level);
    });

    const engine = page.addFolder({ title: 'engine', expanded: false });
    this._fft = { size: 2048 };
    engine.addBinding(this._fft, 'size', {
      view: 'list',
      label: 'fft',
      options: [
        { text: '1024', value: 1024 },
        { text: '2048', value: 2048 },
        { text: '4096', value: 4096 },
      ],
    }).on('change', (ev) => {
      try { this.engine.setFftSize(ev.value); } catch {}
    });

    this._agc = { amount: 0.0, gate: 0.003, hold: 0.2, inputGain: 1.0 };
    engine.addBinding(this._agc, 'amount', { min: 0, max: 1, step: 0.01, label: 'agc' }).on('change', () => {
      this.engine.setAgc(this._agc.amount);
    });
    engine.addBinding(this._agc, 'inputGain', { min: 0.1, max: 3, step: 0.05, label: 'input' }).on('change', () => {
      this.engine.setInputGain(this._agc.inputGain);
    });
    engine.addBinding(this._agc, 'gate', { min: 0, max: 0.02, step: 0.0005, label: 'gate' }).on('change', () => {
      this.engine.setGate(this._agc.gate, this._agc.hold);
    });
    engine.addBinding(this._agc, 'hold', { min: 0.05, max: 0.6, step: 0.01, label: 'hold' }).on('change', () => {
      this.engine.setGate(this._agc.gate, this._agc.hold);
    });
  }

  _buildDynamicsPage(page) {
    const envelopes = page.addFolder({ title: 'envelopes', expanded: true });
    envelopes.addBinding(this.conf, 'audioBassGain', { min: 0.0, max: 3.0, step: 0.05, label: 'bass gain' });
    envelopes.addBinding(this.conf, 'audioMidGain', { min: 0.0, max: 3.0, step: 0.05, label: 'mid gain' });
    envelopes.addBinding(this.conf, 'audioTrebleGain', { min: 0.0, max: 3.0, step: 0.05, label: 'treble gain' });
    envelopes.addBinding(this.conf, 'audioBeatBoost', { min: 0.0, max: 3.0, step: 0.05, label: 'beat boost' });

    const smoothing = page.addFolder({ title: 'feature smoothing', expanded: false });
    Object.entries(this._featureSmoothing).forEach(([key]) => {
      smoothing.addBinding(this._featureSmoothing, key, { min: 0.05, max: 0.95, step: 0.01, label: key })
        .on('change', () => {
          if (this.engine?.setFeatureSmoothing) {
            this.engine.setFeatureSmoothing({
              level: { attack: this._featureSmoothing.level, release: this._featureSmoothing.level },
              bass: { attack: this._featureSmoothing.bass, release: this._featureSmoothing.bass },
              mid: { attack: this._featureSmoothing.mid, release: this._featureSmoothing.mid },
              treble: { attack: this._featureSmoothing.treble, release: this._featureSmoothing.treble },
              beat: { attack: this._featureSmoothing.beat, release: this._featureSmoothing.beat },
            });
          }
        });
    });

    const tempo = page.addFolder({ title: 'tempo tools', expanded: false });
    this._tempoState = { enable: false };
    tempo.addBinding(this._tempoState, 'enable', { label: 'estimate tempo' }).on('change', () => {
      if (this.engine?.enableTempo) this.engine.enableTempo(this._tempoState.enable);
    });
    this._thr = { method: 'median', k: 1.8 };
    tempo.addBinding(this._thr, 'method', {
      view: 'list',
      label: 'threshold',
      options: [
        { text: 'median', value: 'median' },
        { text: 'avg', value: 'avg' },
      ],
    }).on('change', () => this.engine.setFluxThreshold(this._thr));
    tempo.addBinding(this._thr, 'k', { min: 1.0, max: 3.0, step: 0.05, label: 'thr k' }).on('change', () => {
      this.engine.setFluxThreshold(this._thr);
    });
  }

  _buildChoreoPage(page) {
    const scenes = this.router?.getScenes?.() || [];
    const sceneFolder = page.addFolder({ title: 'scene & macros', expanded: true });

    const macroState = {
      enabled: this.router?.enabled ?? true,
      master: this.router?.master ?? 1.0,
      intensity: this.router?.intensity ?? 1.0,
      reactivity: this.router?.reactivity ?? 1.0,
      scene: this.conf.audioScene || this.router?.getScene?.() || (scenes[0] || 'Neon Pulse'),
    };

    if (scenes.length > 0) {
      sceneFolder.addBlade({
        view: 'list',
        label: 'scene',
        options: scenes.map((name) => ({ text: name, value: name })),
        value: macroState.scene,
      }).on('change', (ev) => {
        macroState.scene = ev.value;
        this.conf.audioScene = ev.value;
        if (this.router?.setScene) this.router.setScene(ev.value, this.conf);
        const fresh = this.router?.getRoutes?.();
        if (fresh) {
          this._mergeRoutes(this._routes, fresh);
        }
        if (this.gui) this.gui.refresh();
      });
    }

    sceneFolder.addBinding(macroState, 'enabled', { label: 'router' }).on('change', () => {
      if (this.router?.setEnabled) this.router.setEnabled(macroState.enabled);
    });
    sceneFolder.addBinding(macroState, 'master', { min: 0.2, max: 2.4, step: 0.01, label: 'master' }).on('change', () => {
      if (this.router?.setMaster) this.router.setMaster(macroState.master);
    });
    sceneFolder.addBinding(macroState, 'intensity', { min: 0.2, max: 2.4, step: 0.01, label: 'intensity' }).on('change', () => {
      if (this.router?.setIntensity) this.router.setIntensity(macroState.intensity);
    });
    sceneFolder.addBinding(macroState, 'reactivity', { min: 0.4, max: 2.4, step: 0.01, label: 'reactivity' }).on('change', () => {
      if (this.router?.setReactivity) this.router.setReactivity(macroState.reactivity);
    });
    sceneFolder.addBlade({ view: 'button', label: 'baselines', title: 'resync baselines' }).on('click', () => {
      if (this.router?.captureBaselines) this.router.captureBaselines(this.conf);
    });

    const motionFolder = page.addFolder({ title: 'motion layer', expanded: false });
    this._buildRouteGroup(motionFolder, 'motion', 'Motion Routes');
  }

  _buildVisualPage(page) {
    const visualFolder = page.addFolder({ title: 'surface & color', expanded: true });
    this._buildRouteGroup(visualFolder, 'visual', 'Surface & Color');
    const atmosFolder = page.addFolder({ title: 'atmosphere', expanded: false });
    this._buildRouteGroup(atmosFolder, 'atmos', 'Atmos Layer');
  }

  _buildDiagnosticsPage(page) {
    const meters = page.addFolder({ title: 'meters', expanded: true });
    meters.addBinding(this.conf, '_audioLevel', { readonly: true, label: 'level' });
    meters.addBinding(this.conf, '_audioBeat', { readonly: true, label: 'beat' });
    meters.addBinding(this.conf, '_audioBass', { readonly: true, label: 'bass' });
    meters.addBinding(this.conf, '_audioMid', { readonly: true, label: 'mid' });
    meters.addBinding(this.conf, '_audioTreble', { readonly: true, label: 'treble' });
    meters.addBinding(this.conf, '_audioTempoBpm', { readonly: true, label: 'tempo bpm' });
    meters.addBinding(this.conf, '_audioTempoPhase', { readonly: true, label: 'tempo phase' });
  }

  _buildRouteGroup(parent, groupKey, title) {
    const group = this._routes[groupKey];
    if (!group) return;
    const folder = parent.addFolder({ title, expanded: groupKey !== 'atmos' });
    folder.addBinding(group, 'enabled', { label: 'enable' }).on('change', () => this._applyRoutes());
    const entries = group.entries || {};
    Object.entries(entries).forEach(([key, route]) => {
      this._buildRouteFolder(folder, groupKey, key, route);
    });
  }

  _buildRouteFolder(parent, groupKey, routeKey, route) {
    if (!route) return;
    const folder = parent.addFolder({ title: routeKey, expanded: false });
    folder.addBinding(route, 'enable', { label: 'enable' }).on('change', () => this._applyRoutes());
    if (route.source) {
      folder.addBlade({ view: 'list', label: 'source', options: ROUTE_SOURCE_OPTIONS, value: route.source })
        .on('change', (ev) => { route.source = ev.value; this._applyRoutes(); });
    }
    if (route.curve !== undefined) {
      folder.addBinding(route, 'curve', { min: 0.4, max: 2.6, step: 0.01, label: 'curve' }).on('change', () => this._applyRoutes());
    }
    if (route.add !== undefined) {
      folder.addBinding(route, 'add', { label: 'add', ...this._rangeFor(groupKey, routeKey, 'add') })
        .on('change', () => this._applyRoutes());
    }
    if (route.beatBoost !== undefined) {
      folder.addBinding(route, 'beatBoost', { label: 'beat boost', ...this._rangeFor(groupKey, routeKey, 'beatBoost') })
        .on('change', () => this._applyRoutes());
    }
    if (route.min !== undefined) {
      folder.addBinding(route, 'min', { label: 'min', ...this._rangeFor(groupKey, routeKey, 'min') })
        .on('change', () => this._applyRoutes());
    }
    if (route.max !== undefined) {
      folder.addBinding(route, 'max', { label: 'max', ...this._rangeFor(groupKey, routeKey, 'max') })
        .on('change', () => this._applyRoutes());
    }
    if (route.minStrength !== undefined) {
      folder.addBinding(route, 'minStrength', { label: 'min strength', ...this._rangeFor(groupKey, routeKey, 'minStrength') })
        .on('change', () => this._applyRoutes());
    }
    if (route.maxStrength !== undefined) {
      folder.addBinding(route, 'maxStrength', { label: 'max strength', ...this._rangeFor(groupKey, routeKey, 'maxStrength') })
        .on('change', () => this._applyRoutes());
    }
    if (route.thresholdAdd !== undefined) {
      folder.addBinding(route, 'thresholdAdd', { label: 'threshold add', ...this._rangeFor(groupKey, routeKey, 'thresholdAdd') })
        .on('change', () => this._applyRoutes());
    }
    if (route.thresholdMin !== undefined) {
      folder.addBinding(route, 'thresholdMin', { label: 'threshold min', ...this._rangeFor(groupKey, routeKey, 'thresholdMin') })
        .on('change', () => this._applyRoutes());
    }
    if (route.thresholdMax !== undefined) {
      folder.addBinding(route, 'thresholdMax', { label: 'threshold max', ...this._rangeFor(groupKey, routeKey, 'thresholdMax') })
        .on('change', () => this._applyRoutes());
    }
    if (route.base !== undefined && ROUTE_RANGE_PRESETS[groupKey]?.[routeKey]?.base) {
      folder.addBinding(route, 'base', { label: 'base', ...this._rangeFor(groupKey, routeKey, 'base') })
        .on('change', () => this._applyRoutes());
    }
    if (route.mode !== undefined) {
      folder.addBlade({
        view: 'list',
        label: 'mode',
        options: [
          { text: 'add', value: 'add' },
          { text: 'symmetric', value: 'symmetric' },
          { text: 'inverted', value: 'inverted' },
        ],
        value: route.mode,
      }).on('change', (ev) => { route.mode = ev.value; this._applyRoutes(); });
    }
    if (route.scaleMaster !== undefined) {
      folder.addBinding(route, 'scaleMaster', { label: 'scale master' }).on('change', () => this._applyRoutes());
    }
    if (route.smooth !== undefined) {
      folder.addBinding(route, 'smooth', { label: 'smooth', ...this._rangeFor(groupKey, routeKey, 'smooth') })
        .on('change', () => this._applyRoutes());
    }
    if (route.hushMix !== undefined) {
      folder.addBinding(route, 'hushMix', { label: 'hush mix', ...this._rangeFor(groupKey, routeKey, 'hushMix') })
        .on('change', () => this._applyRoutes());
    }
  }
}
