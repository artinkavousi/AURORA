import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

export default class AudioPanel {
  constructor(engine, conf, router) {
    this.engine = engine;
    this.conf = conf;
    this.router = router;
    this.gui = null;
    this.routesModel = null;
    this._presetInfoEl = null;
    this._styleState = null;
  }

  init(position = 'bottom-right') {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    if (position.includes('bottom')) container.style.bottom = '16px';
    else container.style.top = '16px';
    if (position.includes('right')) container.style.right = '16px';
    else container.style.left = '16px';
    container.style.maxWidth = '380px';
    container.style.padding = '14px 16px 18px 16px';
    container.style.borderRadius = '16px';
    container.style.background = 'linear-gradient(135deg, rgba(18,22,30,0.78), rgba(41,20,54,0.6))';
    container.style.backdropFilter = 'blur(14px) saturate(160%)';
    container.style.WebkitBackdropFilter = 'blur(14px) saturate(160%)';
    container.style.border = '1px solid rgba(255,255,255,0.18)';
    container.style.boxShadow = '0 22px 60px rgba(0,0,0,0.45)';
    container.style.pointerEvents = 'auto';
    container.style.zIndex = 30;
    container.style.color = 'rgba(244,247,255,0.92)';
    container.style.fontFamily = '"Inter", "Helvetica Neue", sans-serif';

    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.flexDirection = 'column';
    header.style.gap = '2px';
    header.style.marginBottom = '10px';

    const title = document.createElement('div');
    title.textContent = 'Sound Reactivity Studio';
    title.style.fontSize = '14px';
    title.style.letterSpacing = '0.12em';
    title.style.textTransform = 'uppercase';
    title.style.opacity = '0.9';

    const presetInfo = document.createElement('div');
    presetInfo.textContent = 'custom blend';
    presetInfo.style.fontSize = '12px';
    presetInfo.style.opacity = '0.72';
    presetInfo.style.whiteSpace = 'nowrap';
    presetInfo.style.overflow = 'hidden';
    presetInfo.style.textOverflow = 'ellipsis';

    header.appendChild(title);
    header.appendChild(presetInfo);
    container.appendChild(header);
    document.body.appendChild(container);

    this._presetInfoEl = presetInfo;

    const gui = new Pane({ container });
    gui.registerPlugin(EssentialsPlugin);
    this.gui = gui;

    const audio = gui.addFolder({ title: 'input sculpting', expanded: true });
    audio.addBinding(this.conf, 'audioEnabled', { label: 'power' });
    audio.addBlade({
      view: 'list',
      label: 'source',
      options: [
        { text: 'mic', value: 'mic' },
        { text: 'file', value: 'file' },
      ],
      value: this.conf.audioSource,
    }).on('change', (ev) => { this.conf.audioSource = ev.value; });
    audio.addBinding(this.conf, 'audioSensitivity', { min: 0.2, max: 3.0, step: 0.05, label: 'gain sculpt' });
    audio.addBinding(this.conf, 'audioAttack', { min: 0.05, max: 0.99, step: 0.01, label: 'attack' });
    audio.addBinding(this.conf, 'audioRelease', { min: 0.05, max: 0.99, step: 0.01, label: 'release' });
    audio.addBinding(this.conf, 'audioBassGain', { min: 0.0, max: 3.0, step: 0.05, label: 'bass hue' });
    audio.addBinding(this.conf, 'audioMidGain', { min: 0.0, max: 3.0, step: 0.05, label: 'mid lift' });
    audio.addBinding(this.conf, 'audioTrebleGain', { min: 0.0, max: 3.0, step: 0.05, label: 'treble glint' });
    audio.addBinding(this.conf, 'audioBeatBoost', { min: 0.0, max: 3.0, step: 0.05, label: 'beat boost' });
    audio.addBlade({ view: 'button', label: 'drop', title: 'Choose Audio File' }).on('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'audio/*';
      input.onchange = async () => {
        const file = input.files && input.files[0];
        if (!file) return;
        const ab = await file.arrayBuffer();
        try { await this.engine.connectFile(ab); }
        catch (e) { console.error(e); }
      };
      input.click();
    });

    const eng = gui.addFolder({ title: 'reactivity engine', expanded: false });
    this._fft = { size: 2048 };
    eng.addBinding(this._fft, 'size', {
      view: 'list',
      label: 'fft window',
      options: [
        { text: '1024', value: 1024 },
        { text: '2048', value: 2048 },
        { text: '4096', value: 4096 },
      ],
      value: 2048,
    }).on('change', (ev) => { try { this.engine.setFftSize(ev.value); } catch {} });
    this._thr = { method: 'median', k: 1.8 };
    eng.addBinding(this._thr, 'method', {
      view: 'list', label: 'flux gate', options: [
        { text: 'median', value: 'median' },
        { text: 'avg', value: 'avg' },
      ], value: 'median',
    }).on('change', () => { this.engine.setFluxThreshold(this._thr); });
    eng.addBinding(this._thr, 'k', { min: 1.0, max: 3.0, step: 0.05, label: 'gate k' })
      .on('change', () => { this.engine.setFluxThreshold(this._thr); });
    this._agc = { amount: 0.0, gate: 0.003, hold: 0.2, inputGain: 1.0 };
    eng.addBinding(this._agc, 'amount', { min: 0.0, max: 1.0, step: 0.01, label: 'agc' })
      .on('change', () => this.engine.setAgc(this._agc.amount));
    eng.addBinding(this._agc, 'gate', { min: 0.0, max: 0.02, step: 0.0005, label: 'gate' })
      .on('change', () => this.engine.setGate(this._agc.gate, this._agc.hold));
    eng.addBinding(this._agc, 'hold', { min: 0.05, max: 0.6, step: 0.01, label: 'hold' })
      .on('change', () => this.engine.setGate(this._agc.gate, this._agc.hold));
    eng.addBinding(this._agc, 'inputGain', { min: 0.1, max: 3.0, step: 0.05, label: 'input gain' })
      .on('change', () => this.engine.setInputGain(this._agc.inputGain));
    this._tempo = { enable: false };
    eng.addBinding(this._tempo, 'enable', { label: 'tempo detect' })
      .on('change', () => this.engine.enableTempo(this._tempo.enable));
    this._mon = { enable: false, level: 0.0 };
    eng.addBinding(this._mon, 'enable', { label: 'monitor mic' })
      .on('change', () => this.engine.setMonitorEnabled(this._mon.enable));
    eng.addBinding(this._mon, 'level', { min: 0.0, max: 1.0, step: 0.01, label: 'monitor lvl' })
      .on('change', () => this.engine.setMonitorLevel(this._mon.level));
    this._master = { master: this.router?.master ?? 1.0 };
    eng.addBinding(this._master, 'master', { min: 0.2, max: 1.8, step: 0.01, label: 'master gain' })
      .on('change', () => { try { this.router?.setMaster?.(this._master.master); } catch {} });

    const diag = gui.addFolder({ title: 'live meters', expanded: false });
    diag.addBinding(this.conf, '_audioLevel', { readonly: true, label: 'level' });
    diag.addBinding(this.conf, '_audioBass', { readonly: true, label: 'bass' });
    diag.addBinding(this.conf, '_audioMid', { readonly: true, label: 'mid' });
    diag.addBinding(this.conf, '_audioTreble', { readonly: true, label: 'treble' });
    diag.addBinding(this.conf, '_audioBeat', { readonly: true, label: 'beat' });

    const presetOptions = this.router?.getPresetOptions?.() ?? [];
    const defaultStyle = this.router?.getActivePreset?.() || (presetOptions[0]?.value ?? 'Nebula Bloom');
    const styles = gui.addFolder({ title: 'moods & morphs', expanded: true });
    const styleState = {
      style: defaultStyle,
      intensity: this.router?.intensity ?? 1.0,
      reactivity: this.router?.reactivity ?? 1.0,
      pulseSpread: this.router?.pulseSpread ?? 0.65,
    };
    this._styleState = styleState;
    styles.addBlade({
      view: 'list',
      label: 'mood',
      options: presetOptions.length ? presetOptions : [
        { text: 'Nebula Bloom', value: 'Nebula Bloom' },
        { text: 'Voltage Runway', value: 'Voltage Runway' },
        { text: 'Lunar Tidal', value: 'Lunar Tidal' },
        { text: 'Particle Ballet', value: 'Particle Ballet' },
      ],
      value: styleState.style,
    }).on('change', (ev) => {
      styleState.style = ev.value;
      this.applyStyle(ev.value);
    });
    styles.addBinding(styleState, 'intensity', { min: 0.2, max: 2.0, step: 0.01, label: 'intensity' })
      .on('change', (ev) => { try { this.router?.setIntensity?.(ev.value); } catch {} });
    styles.addBinding(styleState, 'reactivity', { min: 0.5, max: 2.0, step: 0.01, label: 'reactivity' })
      .on('change', (ev) => { try { this.router?.setReactivity?.(ev.value); } catch {} });
    styles.addBinding(styleState, 'pulseSpread', { min: 0.3, max: 1.2, step: 0.01, label: 'pulse spread' })
      .on('change', (ev) => { try { this.router?.setPulseSpread?.(ev.value); } catch {} });
    styles.addBlade({ view: 'button', label: 'shuffle', title: 'reshuffle micro jitter' })
      .on('click', () => { try { this.router?.randomizePhase?.(); } catch {} });

    const SOURCES = [
      { text: 'level', value: 'level' },
      { text: 'beat', value: 'beat' },
      { text: 'bass', value: 'bass' },
      { text: 'mid', value: 'mid' },
      { text: 'treble', value: 'treble' },
      { text: 'fluxBass', value: 'fluxBass' },
      { text: 'fluxMid', value: 'fluxMid' },
      { text: 'fluxTreble', value: 'fluxTreble' },
    ];
    this.routesModel = this.router?.getRoutes ? this.router.getRoutes() : {};
    const routes = this.routesModel;
    const routing = gui.addFolder({ title: 'motion choreography', expanded: false });
    const addRoute = (folder, key, label, min = 0, max = 2, step = 0.01) => {
      if (!routes[key]) return;
      const r = routes[key];
      const f = folder.addFolder({ title: label, expanded: false });
      f.addBinding(r, 'enable', { label: 'enable' })
        .on('change', () => this._applyRoutes(routes));
      f.addBlade({ view: 'list', label: 'source', options: SOURCES, value: r.source })
        .on('change', (ev) => { r.source = ev.value; this._applyRoutes(routes); });
      f.addBinding(r, 'gain', { min, max, step, label: 'gain' })
        .on('change', () => this._applyRoutes(routes));
      f.addBinding(r, 'curve', { min: 0.5, max: 3.0, step: 0.05, label: 'curve' })
        .on('change', () => this._applyRoutes(routes));
      f.addBinding(r, 'mix', { min: 0.0, max: 1.0, step: 0.01, label: 'mix' })
        .on('change', () => this._applyRoutes(routes));
      f.addBinding(r, 'bias', { min: -0.5, max: 4.0, step: 0.01, label: 'bed' })
        .on('change', () => this._applyRoutes(routes));
      f.addBinding(r, 'floor', { min: -1.0, max: 4.0, step: 0.01, label: 'floor' })
        .on('change', () => this._applyRoutes(routes));
      f.addBinding(r, 'ceiling', { min: -1.0, max: 5.0, step: 0.01, label: 'ceiling' })
        .on('change', () => this._applyRoutes(routes));
      f.addBinding(r, 'attack', { min: 0.01, max: 1.5, step: 0.01, label: 'attack' })
        .on('change', () => this._applyRoutes(routes));
      f.addBinding(r, 'release', { min: 0.05, max: 2.5, step: 0.01, label: 'release' })
        .on('change', () => this._applyRoutes(routes));
      f.addBinding(r, 'jitter', { min: 0.0, max: 0.6, step: 0.01, label: 'jitter' })
        .on('change', () => this._applyRoutes(routes));
      f.addBinding(r, 'jitterSpeed', { min: 0.5, max: 6.0, step: 0.05, label: 'jitter spd' })
        .on('change', () => this._applyRoutes(routes));
      if (r.beatBoost !== undefined) {
        f.addBinding(r, 'beatBoost', { min: 0.0, max: 3.0, step: 0.05, label: 'beat boost' })
          .on('change', () => this._applyRoutes(routes));
      }
    };
    const phys = routing.addFolder({ title: 'fluid drives', expanded: false });
    addRoute(phys, 'jetStrength', 'jet');
    addRoute(phys, 'vortexStrength', 'vortex');
    addRoute(phys, 'curlStrength', 'curl');
    addRoute(phys, 'orbitStrength', 'orbit');
    addRoute(phys, 'waveAmplitude', 'wave', 0, 3, 0.01);
    addRoute(phys, 'apicBlend', 'apic blend', 0, 1, 0.01);
    addRoute(phys, 'viscosity', 'viscosity', -1, 1, 0.01);
    const vis = routing.addFolder({ title: 'visual sheen', expanded: false });
    addRoute(vis, 'noise', 'noise');
    addRoute(vis, 'colorSaturation', 'color');
    addRoute(vis, 'envSway', 'env sway', -0.3, 0.3, 0.001);

    this._updatePresetInfo(this.router?.getPresetMeta?.(styleState.style));

    try {
      if (styleState.style) this.applyStyle(styleState.style, { skipRefresh: true });
      if (this.router?.setIntensity) this.router.setIntensity(styleState.intensity);
      if (this.router?.setReactivity) this.router.setReactivity(styleState.reactivity);
      if (this.router?.setPulseSpread) this.router.setPulseSpread(styleState.pulseSpread);
    } catch {}

    if (this.gui) this.gui.refresh();
  }

  _applyRoutes(routes) {
    if (this.router?.setRoutes) this.router.setRoutes(routes);
  }

  _updatePresetInfo(meta) {
    if (!this._presetInfoEl) return;
    if (!meta) {
      this._presetInfoEl.textContent = 'custom blend';
      this._presetInfoEl.title = '';
      return;
    }
    const tags = meta.tags?.length ? ` · ${meta.tags.join(' / ')}` : '';
    this._presetInfoEl.textContent = `${meta.label}${tags}`;
    this._presetInfoEl.title = meta.description ?? '';
  }

  applyStyle(name, opts = {}) {
    if (!this.router) return;
    let meta = null;
    try {
      if (this.router.applyPreset) meta = this.router.applyPreset(name);
      else if (this.router.setRoutes) {
        const legacy = this._legacyStyles();
        if (legacy[name]) this.router.setRoutes(legacy[name]);
      }
    } catch (err) {
      console.error(err);
    }

    if (this.router.getRoutes) {
      const latest = this.router.getRoutes();
      if (!this.routesModel) {
        this.routesModel = latest;
      } else {
        for (const key of Object.keys(latest)) {
          if (!this.routesModel[key]) this.routesModel[key] = latest[key];
          else Object.assign(this.routesModel[key], latest[key]);
        }
      }
    }

    if (this._styleState) {
      if (typeof this.router?.intensity === 'number') this._styleState.intensity = this.router.intensity;
      if (typeof this.router?.reactivity === 'number') this._styleState.reactivity = this.router.reactivity;
      if (typeof this.router?.pulseSpread === 'number') this._styleState.pulseSpread = this.router.pulseSpread;
    }

    if (this.gui && !opts.skipRefresh) this.gui.refresh();
    this._updatePresetInfo(meta || this.router?.getPresetMeta?.(name));
  }

  _legacyStyles() {
    return {
      Groove: {
        jetStrength: { source: 'bass', gain: 1.3, curve: 1.2, beatBoost: 0.6 },
        vortexStrength: { source: 'mid', gain: 1.1, curve: 1.1 },
        curlStrength: { source: 'treble', gain: 1.2, curve: 1.2 },
        orbitStrength: { source: 'mid', gain: 0.8, curve: 1.0 },
        waveAmplitude: { source: 'beat', gain: 1.2, curve: 1.0 },
        apicBlend: { source: 'level', gain: 0.35, curve: 1.4 },
        noise: { source: 'treble', gain: 0.35, curve: 1.0 },
        envSway: { source: 'level', gain: 0.06, curve: 1.0 },
      },
    };
  }
}
