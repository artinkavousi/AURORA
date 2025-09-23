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

    // Per-feature envelope smoothing
    const envelopes = audio.addFolder({ title: 'envelopes', expanded: false });
    this._featureSmooth = {
      level: { attack: 0.5, release: 0.2 },
      beat: { attack: 0.6, release: 0.2 },
      bass: { attack: 0.55, release: 0.25 },
      mid: { attack: 0.5, release: 0.22 },
      treble: { attack: 0.45, release: 0.25 },
      sub: { attack: 0.55, release: 0.22 },
      lowMid: { attack: 0.5, release: 0.25 },
      highMid: { attack: 0.45, release: 0.25 },
      presence: { attack: 0.5, release: 0.28 },
      air: { attack: 0.45, release: 0.28 },
      stereo: { attack: 0.5, release: 0.3 },
      dynamics: { attack: 0.65, release: 0.3 },
    };
    const updateSmooth = () => {
      try { this.engine.setFeatureSmoothing(this._featureSmooth); } catch {}
    };
    const smoothDefs = [
      ['level', 'level'],
      ['beat', 'beat'],
      ['bass', 'bass'],
      ['mid', 'mid'],
      ['treble', 'treble'],
      ['sub', 'sub'],
      ['lowMid', 'low-mid'],
      ['highMid', 'high-mid'],
      ['presence', 'presence'],
      ['air', 'air'],
      ['stereo', 'stereo'],
      ['dynamics', 'dynamics'],
    ];
    smoothDefs.forEach(([key, label]) => {
      envelopes.addBinding(this._featureSmooth[key], 'attack', { min: 0.05, max: 0.99, step: 0.01, label: `${label} atk` })
        .on('change', updateSmooth);
      envelopes.addBinding(this._featureSmooth[key], 'release', { min: 0.05, max: 0.99, step: 0.01, label: `${label} rel` })
        .on('change', updateSmooth);
    });
    updateSmooth();

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
    // Tweakpane v4: use bindings with graph view instead of addMonitor
    const meterOpts = { view: 'graph', min: 0, max: 1, interval: 60 };
    diag.addBinding(this.conf, '_audioLevel', { ...meterOpts, readonly: true, label: 'level' });
    diag.addBinding(this.conf, '_audioSub', { ...meterOpts, readonly: true, label: 'sub' });
    diag.addBinding(this.conf, '_audioBass', { ...meterOpts, readonly: true, label: 'bass' });
    diag.addBinding(this.conf, '_audioMid', { ...meterOpts, readonly: true, label: 'mid' });
    diag.addBinding(this.conf, '_audioPresence', { ...meterOpts, readonly: true, label: 'presence' });
    diag.addBinding(this.conf, '_audioAir', { ...meterOpts, readonly: true, label: 'air' });
    diag.addBinding(this.conf, '_audioBeat', { ...meterOpts, readonly: true, label: 'beat' });
    diag.addBinding(this.conf, '_audioFluxNorm', { ...meterOpts, readonly: true, label: 'flux' });
    diag.addBinding(this.conf, '_audioDynamics', { ...meterOpts, readonly: true, label: 'dynamics' });
    diag.addBinding(this.conf, '_audioStereo', { ...meterOpts, readonly: true, label: 'stereo' });
    diag.addBinding(this.conf, '_audioTempoBpm', { readonly: true, label: 'tempo bpm' });
    diag.addBinding(this.conf, '_audioTempoConf', { readonly: true, label: 'tempo conf' });
    diag.addBinding(this.conf, '_audioTempoPhase', { readonly: true, label: 'tempo phase' });
    diag.addBinding(this.conf, '_audioTilt', { readonly: true, label: 'tilt' });

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
    const styleState = {
      style: 'Groove',
      enabled: this.router?.enabled ?? true,
      master: this.router?.master ?? 1.0,
      intensity: this.router?.intensity ?? 1.2,
      reactivity: this.router?.reactivity ?? 1.1,
    };
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
    styles.addBinding(styleState, 'enabled', { label: 'enabled' })
      .on('change', ev => { try { this.router.setEnabled(ev.value); } catch {} });
    styles.addBinding(styleState, 'master', { min: 0.0, max: 2.0, step: 0.01, label: 'master' })
      .on('change', ev => { try { this.router.setMaster(ev.value); } catch {} });
    styles.addBinding(styleState, 'intensity', { min: 0.2, max: 2.0, step: 0.01, label: 'intensity' })
      .on('change', ev => { try { this.router.setIntensity(ev.value); } catch {} });
    styles.addBinding(styleState, 'reactivity', { min: 0.5, max: 2.0, step: 0.01, label: 'reactivity' })
      .on('change', ev => { try { this.router.setReactivity(ev.value); } catch {} });

    // Routing controls (merged)
    const routing = gui.addFolder({ title: 'routing', expanded: false });
    const SOURCES = [
      { text: 'level', value: 'level' },
      { text: 'beat', value: 'beat' },
      { text: 'beat conf', value: 'beatConfidence' },
      { text: 'bass', value: 'bass' },
      { text: 'sub', value: 'sub' },
      { text: 'low-mid', value: 'lowMid' },
      { text: 'mid', value: 'mid' },
      { text: 'high-mid', value: 'highMid' },
      { text: 'presence', value: 'presence' },
      { text: 'treble', value: 'treble' },
      { text: 'air', value: 'air' },
      { text: 'tilt', value: 'tilt' },
      { text: 'flux norm', value: 'flux' },
      { text: 'flux bass', value: 'fluxBass' },
      { text: 'flux mid', value: 'fluxMid' },
      { text: 'flux treble', value: 'fluxTreble' },
      { text: 'dynamics', value: 'dynamics' },
      { text: 'rms', value: 'rms' },
      { text: 'loudness', value: 'loudness' },
      { text: 'crest', value: 'crest' },
      { text: 'stereo', value: 'stereo' },
      { text: 'stereo (signed)', value: 'stereoSigned' },
      { text: 'stereo width', value: 'stereoWidth' },
      { text: 'tempo', value: 'tempo' },
      { text: 'tempo pulse', value: 'tempoPulse' },
      { text: 'tempo phase', value: 'tempoPhase' },
      { text: 'tempo conf', value: 'tempoConf' },
      { text: 'dominant freq', value: 'dominant' },
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
    addRoute(phys, 'jetStrength', 'jet strength');
    addRoute(phys, 'jetRadius', 'jet radius', 0, 20, 0.1);
    addRoute(phys, 'vortexStrength', 'vortex strength');
    addRoute(phys, 'vortexRadius', 'vortex radius', 0, 20, 0.1);
    addRoute(phys, 'apicBlend', 'apic blend', 0, 1, 0.01);
    addRoute(phys, 'viscosity', 'viscosity', -1, 1, 0.01);

    const fields = routing.addFolder({ title: 'fields', expanded: false });
    addRoute(fields, 'curlStrength', 'curl strength');
    addRoute(fields, 'curlScale', 'curl scale', 0, 0.05, 0.0005);
    addRoute(fields, 'curlTime', 'curl time', 0, 1.5, 0.01);
    addRoute(fields, 'orbitStrength', 'orbit strength');
    addRoute(fields, 'orbitRadius', 'orbit radius', 0, 20, 0.1);
    addRoute(fields, 'waveAmplitude', 'wave amplitude', 0, 3, 0.01);
    addRoute(fields, 'waveScale', 'wave scale', 0, 0.2, 0.001);
    addRoute(fields, 'waveSpeed', 'wave speed', 0, 2, 0.01);

    const vis = routing.addFolder({ title: 'visuals & fx', expanded: false });
    addRoute(vis, 'noise', 'noise');
    addRoute(vis, 'bloomStrength', 'bloom', 0, 1, 0.01);
    addRoute(vis, 'postSaturation', 'post sat', 0, 1, 0.01);
    addRoute(vis, 'postContrast', 'post contrast', 0, 1, 0.01);
    addRoute(vis, 'postLift', 'post lift', -0.5, 0.5, 0.01);
    addRoute(vis, 'vignetteAmount', 'vignette', 0, 0.4, 0.005);
    addRoute(vis, 'grainAmount', 'grain', 0, 0.5, 0.01);
    addRoute(vis, 'chromaAmount', 'chroma', 0, 0.02, 0.0005);
    addRoute(vis, 'motionBlur', 'motion blur', 0, 1, 0.01);

    const env = routing.addFolder({ title: 'environment', expanded: false });
    addRoute(env, 'envSway', 'env sway', 0, 0.2, 0.001);
    addRoute(env, 'envPan', 'env pan', -1, 1, 0.01);

    const optics = routing.addFolder({ title: 'optics', expanded: false });
    addRoute(optics, 'dofFocus', 'dof focus', 0, 1, 0.01);
    addRoute(optics, 'dofRange', 'dof range', 0, 0.5, 0.01);

    this.gui = gui;

    // Apply a musical default style on first open
    try {
      this.applyStyle('Groove');
      if (this.router?.setEnabled) this.router.setEnabled(styleState.enabled);
      if (this.router?.setMaster) this.router.setMaster(styleState.master);
      if (this.router?.setIntensity) this.router.setIntensity(styleState.intensity);
      if (this.router?.setReactivity) this.router.setReactivity(styleState.reactivity);
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
        jetRadius: { source: 'sub', gain: 6.5, curve: 1.1, enable: true },
        vortexStrength: { source: 'mid', gain: 1.1, curve: 1.1 },
        vortexRadius: { source: 'tempo', gain: 6.0, curve: 1.0, enable: true },
        curlStrength: { source: 'treble', gain: 1.2, curve: 1.2 },
        curlScale: { source: 'presence', gain: 0.014, curve: 1.0, enable: true },
        curlTime: { source: 'tempoPulse', gain: 0.7, curve: 1.0, enable: true },
        orbitStrength: { source: 'mid', gain: 0.8, curve: 1.0 },
        orbitRadius: { source: 'tempo', gain: 5.5, curve: 1.0, enable: true },
        waveAmplitude: { source: 'beat', gain: 1.2, curve: 1.0 },
        waveSpeed: { source: 'air', gain: 1.1, curve: 1.0, enable: true },
        apicBlend: { source: 'level', gain: 0.35, curve: 1.4 },
        noise: { source: 'treble', gain: 0.35, curve: 1.0 },
        bloomStrength: { source: 'loudness', gain: 0.45, curve: 1.0, enable: true },
        postSaturation: { source: 'presence', gain: 0.35, curve: 1.1, enable: true },
        postLift: { source: 'tilt', gain: 0.12, curve: 1.0, enable: true },
        chromaAmount: { source: 'air', gain: 0.006, curve: 1.2, enable: true },
        motionBlur: { source: 'beatConfidence', gain: 0.3, curve: 1.0, enable: true },
        envSway: { source: 'level', gain: 0.06, curve: 1.0 },
        envPan: { source: 'stereoSigned', gain: 0.45, curve: 1.0, enable: true },
        dofFocus: { source: 'tempoPulse', gain: 0.38, curve: 1.0, enable: true },
        dofRange: { source: 'dynamics', gain: 0.1, curve: 1.0, enable: true },
      },
      Swirl: {
        jetStrength: { source: 'bass', gain: 0.8, curve: 1.2, beatBoost: 0.4 },
        jetRadius: { source: 'sub', gain: 4.0, curve: 1.0, enable: true },
        vortexStrength: { source: 'mid', gain: 1.4, curve: 1.15 },
        vortexRadius: { source: 'tempo', gain: 7.0, curve: 1.0, enable: true },
        curlStrength: { source: 'mid', gain: 0.8, curve: 1.0 },
        curlScale: { source: 'presence', gain: 0.012, curve: 1.0, enable: true },
        curlTime: { source: 'tempoPulse', gain: 0.8, curve: 1.0, enable: true },
        orbitStrength: { source: 'mid', gain: 1.2, curve: 1.2 },
        orbitRadius: { source: 'tempo', gain: 6.5, curve: 1.0, enable: true },
        waveAmplitude: { source: 'fluxMid', gain: 0.9, curve: 1.0 },
        waveSpeed: { source: 'air', gain: 0.8, curve: 1.0, enable: true },
        apicBlend: { source: 'level', gain: 0.4, curve: 1.4 },
        noise: { source: 'treble', gain: 0.25, curve: 1.0 },
        bloomStrength: { source: 'loudness', gain: 0.35, curve: 1.0, enable: true },
        postSaturation: { source: 'presence', gain: 0.28, curve: 1.0, enable: true },
        postLift: { source: 'tilt', gain: 0.08, curve: 1.0, enable: true },
        chromaAmount: { source: 'air', gain: 0.005, curve: 1.1, enable: true },
        motionBlur: { source: 'beatConfidence', gain: 0.35, curve: 1.0, enable: true },
        envSway: { source: 'level', gain: 0.05, curve: 1.0 },
        envPan: { source: 'stereoSigned', gain: 0.35, curve: 1.0, enable: true },
        dofFocus: { source: 'tempoPulse', gain: 0.3, curve: 1.0, enable: true },
        dofRange: { source: 'dynamics', gain: 0.08, curve: 1.0, enable: true },
      },
      Waves: {
        jetStrength: { source: 'fluxBass', gain: 0.9, curve: 1.1, beatBoost: 0.3 },
        jetRadius: { source: 'sub', gain: 5.0, curve: 1.0, enable: true },
        vortexStrength: { source: 'mid', gain: 0.9, curve: 1.0 },
        vortexRadius: { source: 'tempo', gain: 5.5, curve: 1.0, enable: true },
        curlStrength: { source: 'treble', gain: 0.6, curve: 1.0 },
        curlScale: { source: 'presence', gain: 0.01, curve: 1.0, enable: true },
        curlTime: { source: 'tempoPulse', gain: 0.5, curve: 1.0, enable: true },
        orbitStrength: { source: 'mid', gain: 0.7, curve: 1.0 },
        orbitRadius: { source: 'tempo', gain: 4.5, curve: 1.0, enable: true },
        waveAmplitude: { source: 'beat', gain: 1.6, curve: 1.0 },
        waveScale: { source: 'dynamics', gain: 0.07, curve: 1.0, enable: true },
        waveSpeed: { source: 'air', gain: 1.2, curve: 1.0, enable: true },
        apicBlend: { source: 'level', gain: 0.3, curve: 1.2 },
        noise: { source: 'treble', gain: 0.3, curve: 1.0 },
        bloomStrength: { source: 'loudness', gain: 0.4, curve: 1.0, enable: true },
        postSaturation: { source: 'presence', gain: 0.3, curve: 1.1, enable: true },
        postLift: { source: 'tilt', gain: 0.1, curve: 1.0, enable: true },
        chromaAmount: { source: 'air', gain: 0.006, curve: 1.2, enable: true },
        motionBlur: { source: 'beatConfidence', gain: 0.25, curve: 1.0, enable: true },
        envSway: { source: 'level', gain: 0.05, curve: 1.0 },
        envPan: { source: 'stereoSigned', gain: 0.3, curve: 1.0, enable: true },
        dofFocus: { source: 'tempoPulse', gain: 0.28, curve: 1.0, enable: true },
        dofRange: { source: 'dynamics', gain: 0.12, curve: 1.0, enable: true },
      },
      Sparkle: {
        jetStrength: { source: 'fluxBass', gain: 1.1, curve: 1.3, beatBoost: 0.7 },
        jetRadius: { source: 'sub', gain: 5.5, curve: 1.1, enable: true },
        vortexStrength: { source: 'fluxMid', gain: 1.0, curve: 1.3 },
        vortexRadius: { source: 'tempo', gain: 6.0, curve: 1.0, enable: true },
        curlStrength: { source: 'fluxTreble', gain: 1.6, curve: 1.2 },
        curlScale: { source: 'presence', gain: 0.016, curve: 1.1, enable: true },
        curlTime: { source: 'tempoPulse', gain: 0.9, curve: 1.0, enable: true },
        orbitStrength: { source: 'mid', gain: 0.6, curve: 1.0 },
        orbitRadius: { source: 'tempo', gain: 5.0, curve: 1.0, enable: true },
        waveAmplitude: { source: 'beat', gain: 1.0, curve: 1.1 },
        waveSpeed: { source: 'air', gain: 1.4, curve: 1.1, enable: true },
        apicBlend: { source: 'level', gain: 0.35, curve: 1.5 },
        noise: { source: 'treble', gain: 0.4, curve: 1.0 },
        bloomStrength: { source: 'loudness', gain: 0.5, curve: 1.0, enable: true },
        postSaturation: { source: 'presence', gain: 0.4, curve: 1.1, enable: true },
        postContrast: { source: 'dynamics', gain: 0.2, curve: 1.0, enable: true },
        postLift: { source: 'tilt', gain: 0.14, curve: 1.0, enable: true },
        grainAmount: { source: 'dynamics', gain: 0.35, curve: 1.0, enable: true },
        chromaAmount: { source: 'air', gain: 0.007, curve: 1.3, enable: true },
        motionBlur: { source: 'beatConfidence', gain: 0.4, curve: 1.0, enable: true },
        envSway: { source: 'level', gain: 0.06, curve: 1.0 },
        envPan: { source: 'stereoSigned', gain: 0.5, curve: 1.0, enable: true },
        dofFocus: { source: 'tempoPulse', gain: 0.34, curve: 1.0, enable: true },
        dofRange: { source: 'dynamics', gain: 0.1, curve: 1.0, enable: true },
      },
    };
    const r = styles[name];
    if (r && this.router.setRoutes) this.router.setRoutes(r);
  }
}
