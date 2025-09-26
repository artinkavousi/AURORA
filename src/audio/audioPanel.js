import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

export default class AudioPanel {
  constructor(engine, conf, router) {
    this.engine = engine;
    this.conf = conf;
    this.router = router;
    this.gui = null;
  }

  init(position = 'bottom-right') {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    if (position.includes('bottom')) container.style.bottom = '16px';
    else container.style.top = '16px';
    if (position.includes('right')) container.style.right = '16px';
    else container.style.left = '16px';
    container.style.maxWidth = '360px';
    container.style.padding = '8px';
    container.style.borderRadius = '12px';
    container.style.background = 'rgba(20, 24, 28, 0.28)';
    container.style.backdropFilter = 'blur(10px) saturate(140%)';
    container.style.WebkitBackdropFilter = 'blur(10px) saturate(140%)';
    container.style.border = '1px solid rgba(255,255,255,0.12)';
    container.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
    container.style.pointerEvents = 'auto';
    container.style.zIndex = 30;
    document.body.appendChild(container);

    const gui = new Pane({ container });
    gui.registerPlugin(EssentialsPlugin);

    const audio = gui.addFolder({ title: 'audio', expanded: true });
    audio.addBinding(this.conf, 'audioEnabled', { label: 'enable' });
    audio.addBlade({
      view: 'list',
      label: 'source',
      options: [
        { text: 'mic', value: 'mic' },
        { text: 'file', value: 'file' },
      ],
      value: this.conf.audioSource,
    }).on('change', (ev) => { this.conf.audioSource = ev.value; });
    audio.addBinding(this.conf, 'audioSensitivity', { min: 0.2, max: 3.0, step: 0.05, label: 'sensitivity' });
    audio.addBinding(this.conf, 'audioAttack', { min: 0.05, max: 0.99, step: 0.01, label: 'attack' });
    audio.addBinding(this.conf, 'audioRelease', { min: 0.05, max: 0.99, step: 0.01, label: 'release' });
    audio.addBinding(this.conf, 'audioBassGain', { min: 0.0, max: 3.0, step: 0.05, label: 'bass gain' });
    audio.addBinding(this.conf, 'audioMidGain', { min: 0.0, max: 3.0, step: 0.05, label: 'mid gain' });
    audio.addBinding(this.conf, 'audioTrebleGain', { min: 0.0, max: 3.0, step: 0.05, label: 'treble gain' });
    audio.addBinding(this.conf, 'audioBeatBoost', { min: 0.0, max: 3.0, step: 0.05, label: 'beat boost' });

    // Engine-level controls
    const eng = gui.addFolder({ title: 'engine', expanded: false });
    this._fft = { size: 2048 };
    eng.addBinding(this._fft, 'size', { view: 'list', label: 'fft', options: [
      { text: '1024', value: 1024 },
      { text: '2048', value: 2048 },
      { text: '4096', value: 4096 },
    ], value: 2048 }).on('change', (ev) => { try { this.engine.setFftSize(ev.value); } catch {} });
    this._thr = { method: 'median', k: 1.8 };
    eng.addBinding(this._thr, 'method', { view: 'list', label: 'threshold', options: [
      { text: 'median', value: 'median' },
      { text: 'avg', value: 'avg' },
    ], value: 'median' }).on('change', () => { this.engine.setFluxThreshold(this._thr); });
    eng.addBinding(this._thr, 'k', { min: 1.0, max: 3.0, step: 0.05, label: 'thr k' }).on('change', () => { this.engine.setFluxThreshold(this._thr); });
    this._agc = { amount: 0.0, gate: 0.003, hold: 0.2, inputGain: 1.0 };
    eng.addBinding(this._agc, 'amount', { min: 0.0, max: 1.0, step: 0.01, label: 'agc' }).on('change', () => this.engine.setAgc(this._agc.amount));
    eng.addBinding(this._agc, 'gate', { min: 0.0, max: 0.02, step: 0.0005, label: 'gate' }).on('change', () => this.engine.setGate(this._agc.gate, this._agc.hold));
    eng.addBinding(this._agc, 'hold', { min: 0.05, max: 0.6, step: 0.01, label: 'hold' }).on('change', () => this.engine.setGate(this._agc.gate, this._agc.hold));
    eng.addBinding(this._agc, 'inputGain', { min: 0.1, max: 3.0, step: 0.05, label: 'input' }).on('change', () => this.engine.setInputGain(this._agc.inputGain));
    this._tempo = { enable: false };
    eng.addBinding(this._tempo, 'enable', { label: 'tempo' }).on('change', () => this.engine.enableTempo(this._tempo.enable));
    // Monitoring (mic only)
    this._mon = { enable: false, level: 0.0 };
    eng.addBinding(this._mon, 'enable', { label: 'monitor' }).on('change', () => this.engine.setMonitorEnabled(this._mon.enable));
    eng.addBinding(this._mon, 'level', { min: 0.0, max: 1.0, step: 0.01, label: 'monitor lvl' }).on('change', () => this.engine.setMonitorLevel(this._mon.level));

    // Diagnostics
    const diag = gui.addFolder({ title: 'meters', expanded: false });
    // bind to conf runtime mirrors
    diag.addBinding(this.conf, '_audioLevel', { readonly: true, label: 'level' });
    diag.addBinding(this.conf, '_audioBass', { readonly: true, label: 'bass' });
    diag.addBinding(this.conf, '_audioMid', { readonly: true, label: 'mid' });
    diag.addBinding(this.conf, '_audioTreble', { readonly: true, label: 'treble' });
    diag.addBinding(this.conf, '_audioBeat', { readonly: true, label: 'beat' });

    // File input
    audio.addBlade({ view: 'button', label: 'input', title: 'Choose Audio File' }).on('click', () => {
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

    // Style presets for routing
    const styles = gui.addFolder({ title: 'reactivity styles', expanded: true });
    const styleState = { style: 'Groove', intensity: 1.0, reactivity: 1.0 };
    styles.addBlade({
      view: 'list',
      label: 'style',
      options: [
        { text: 'Groove', value: 'Groove' },
        { text: 'Swirl', value: 'Swirl' },
        { text: 'Waves', value: 'Waves' },
        { text: 'Sparkle', value: 'Sparkle' },
      ],
      value: styleState.style,
    }).on('change', ev => { styleState.style = ev.value; this.applyStyle(ev.value); });
    styles.addBinding(styleState, 'intensity', { min: 0.2, max: 2.0, step: 0.01, label: 'intensity' })
      .on('change', ev => { try { this.router.setIntensity(ev.value); } catch {} });
    styles.addBinding(styleState, 'reactivity', { min: 0.5, max: 2.0, step: 0.01, label: 'reactivity' })
      .on('change', ev => { try { this.router.setReactivity(ev.value); } catch {} });

    // Routing controls (merged)
    const routing = gui.addFolder({ title: 'routing', expanded: false });
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
    const routes = this.router?.getRoutes ? this.router.getRoutes() : {};
    const addRoute = (folder, key, label, min=0, max=2, step=0.01) => {
      if (!routes[key]) return;
      const r = routes[key];
      const f = folder.addFolder({ title: label, expanded: false });
      f.addBinding(r, 'enable', { label: 'enable' });
      f.addBlade({ view: 'list', label: 'source', options: SOURCES, value: r.source })
        .on('change', ev => { r.source = ev.value; this._applyRoutes(routes); });
      f.addBinding(r, 'gain', { min, max, step, label: 'gain' })
        .on('change', () => this._applyRoutes(routes));
      f.addBinding(r, 'curve', { min: 0.5, max: 3.0, step: 0.05, label: 'curve' })
        .on('change', () => this._applyRoutes(routes));
      if (r.beatBoost !== undefined)
        f.addBinding(r, 'beatBoost', { min: 0.0, max: 3.0, step: 0.05, label: 'beat boost' })
          .on('change', () => this._applyRoutes(routes));
    };
    const phys = routing.addFolder({ title: 'physics', expanded: false });
    addRoute(phys, 'jetStrength', 'jet');
    addRoute(phys, 'vortexStrength', 'vortex');
    addRoute(phys, 'curlStrength', 'curl');
    addRoute(phys, 'orbitStrength', 'orbit');
    addRoute(phys, 'waveAmplitude', 'wave', 0, 3, 0.01);
    addRoute(phys, 'apicBlend', 'apic blend', 0, 1, 0.01);
    addRoute(phys, 'viscosity', 'viscosity', -1, 1, 0.01);
    const vis = routing.addFolder({ title: 'visuals', expanded: false });
    addRoute(vis, 'noise', 'noise');
    addRoute(vis, 'colorSaturation', 'color');
    addRoute(vis, 'envSway', 'env sway', 0, 0.2, 0.001);

    this.gui = gui;

    // Apply a musical default style on first open
    try {
      this.applyStyle('Groove');
      if (this.router?.setIntensity) this.router.setIntensity(1.2);
      if (this.router?.setReactivity) this.router.setReactivity(1.1);
    } catch {}
  }

  _applyRoutes(routes) {
    if (this.router?.setRoutes) this.router.setRoutes(routes);
  }

  applyStyle(name) {
    if (!this.router) return;
    const styles = {
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
      Swirl: {
        jetStrength: { source: 'bass', gain: 0.8, curve: 1.2, beatBoost: 0.4 },
        vortexStrength: { source: 'mid', gain: 1.4, curve: 1.15 },
        curlStrength: { source: 'mid', gain: 0.8, curve: 1.0 },
        orbitStrength: { source: 'mid', gain: 1.2, curve: 1.2 },
        waveAmplitude: { source: 'fluxMid', gain: 0.9, curve: 1.0 },
        apicBlend: { source: 'level', gain: 0.4, curve: 1.4 },
        noise: { source: 'treble', gain: 0.25, curve: 1.0 },
        envSway: { source: 'level', gain: 0.05, curve: 1.0 },
      },
      Waves: {
        jetStrength: { source: 'fluxBass', gain: 0.9, curve: 1.1, beatBoost: 0.3 },
        vortexStrength: { source: 'mid', gain: 0.9, curve: 1.0 },
        curlStrength: { source: 'treble', gain: 0.6, curve: 1.0 },
        orbitStrength: { source: 'mid', gain: 0.7, curve: 1.0 },
        waveAmplitude: { source: 'beat', gain: 1.6, curve: 1.0 },
        apicBlend: { source: 'level', gain: 0.3, curve: 1.2 },
        noise: { source: 'treble', gain: 0.3, curve: 1.0 },
        envSway: { source: 'level', gain: 0.05, curve: 1.0 },
      },
      Sparkle: {
        jetStrength: { source: 'fluxBass', gain: 1.1, curve: 1.3, beatBoost: 0.7 },
        vortexStrength: { source: 'fluxMid', gain: 1.0, curve: 1.3 },
        curlStrength: { source: 'fluxTreble', gain: 1.6, curve: 1.2 },
        orbitStrength: { source: 'mid', gain: 0.6, curve: 1.0 },
        waveAmplitude: { source: 'beat', gain: 1.0, curve: 1.1 },
        apicBlend: { source: 'level', gain: 0.35, curve: 1.5 },
        noise: { source: 'treble', gain: 0.4, curve: 1.0 },
        envSway: { source: 'level', gain: 0.06, curve: 1.0 },
      },
    };
    const r = styles[name];
    if (r && this.router.setRoutes) this.router.setRoutes(r);
  }
}
