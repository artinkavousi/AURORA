import { Pane } from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';

const formatDriver = (driver) => {
  if (!driver) return 'energy';
  if (typeof driver === 'string') return driver;
  if (Array.isArray(driver)) return driver.join(' + ');
  if (typeof driver === 'object' && driver.blend) {
    return Object.entries(driver.blend)
      .map(([k, v]) => `${k}${typeof v === 'number' ? `×${v.toFixed(1)}` : ''}`)
      .join(' + ');
  }
  return 'custom';
};

export default class AudioPanel {
  constructor(engine, conf, router) {
    this.engine = engine;
    this.conf = conf;
    this.router = router;
    this.gui = null;
    this._container = null;
    this._blueprintList = null;
    this._blueprintDescEl = null;
    this._masterProxy = null;
    this._masterBindings = [];
    this._tempoProxy = null;
    this._tempoBindings = [];
    this._layerProxies = {};
    this._layerBindingMap = new Map();
    this._layerDriverLabels = new Map();
    this._reactorProxy = null;
    this._reactorBinding = null;
    this._routerUnsub = null;
  }

  init(position = 'bottom-right') {
    if (this.gui) return;

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.zIndex = 40;
    container.style.pointerEvents = 'auto';
    container.style.width = '360px';
    container.style.maxHeight = 'calc(100vh - 64px)';
    container.style.overflow = 'hidden';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.borderRadius = '18px';
    container.style.border = '1px solid rgba(255,255,255,0.14)';
    container.style.background = 'linear-gradient(160deg, rgba(20,24,40,0.88), rgba(38,14,54,0.82))';
    container.style.backdropFilter = 'blur(24px) saturate(165%)';
    container.style.WebkitBackdropFilter = 'blur(24px) saturate(165%)';
    container.style.boxShadow = '0 24px 65px rgba(5,7,20,0.65)';
    container.style.padding = '16px';
    container.style.gap = '12px';
    if (position.includes('bottom')) container.style.bottom = '24px';
    else container.style.top = '24px';
    if (position.includes('right')) container.style.right = '24px';
    else container.style.left = '24px';

    const header = document.createElement('div');
    header.textContent = 'Sound Reactor';
    header.style.fontFamily = '"Inter", "Segoe UI", sans-serif';
    header.style.fontSize = '18px';
    header.style.fontWeight = '600';
    header.style.letterSpacing = '0.08em';
    header.style.textTransform = 'uppercase';
    header.style.color = '#f4f7ff';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';

    const pulse = document.createElement('span');
    pulse.textContent = '●';
    pulse.style.color = '#82f8ff';
    pulse.style.fontSize = '14px';
    pulse.style.filter = 'drop-shadow(0 0 6px rgba(130,248,255,0.9))';
    header.appendChild(pulse);

    const sub = document.createElement('div');
    sub.textContent = 'Audio-driven choreography & atmosphere';
    sub.style.fontSize = '12px';
    sub.style.fontWeight = '400';
    sub.style.color = 'rgba(225,235,255,0.8)';
    sub.style.marginTop = '-6px';

    const headWrap = document.createElement('div');
    headWrap.style.display = 'flex';
    headWrap.style.flexDirection = 'column';
    headWrap.appendChild(header);
    headWrap.appendChild(sub);

    const paneHost = document.createElement('div');
    paneHost.style.flex = '1';
    paneHost.style.overflow = 'auto';
    paneHost.style.paddingRight = '4px';

    container.appendChild(headWrap);
    container.appendChild(paneHost);
    document.body.appendChild(container);
    this._container = container;

    const gui = new Pane({ container: paneHost });
    gui.registerPlugin(EssentialsPlugin);
    gui.element.style.setProperty('--tp-base-background-color', 'rgba(18,22,30,0.75)');
    gui.element.style.setProperty('--tp-container-background-color', 'rgba(18,22,30,0.38)');
    gui.element.style.setProperty('--tp-font-size', '12px');
    gui.element.style.setProperty('--tp-outline-width', '1px');
    gui.element.style.setProperty('--tp-accent-color', '#79dfff');
    this.gui = gui;

    this._buildInputSection();
    this._buildBlueprintSection();
    this._buildMasterSection();
    this._buildLayerSection();
    this._buildDiagnosticsSection();

    this._routerUnsub = this.router?.subscribe?.((event) => {
      if (event?.reason === 'blueprint') {
        this._rebuildLayerControls();
      }
      this._syncFromRouter(event);
    });
    this._syncFromRouter();
  }

  dispose() {
    if (this._routerUnsub) { this._routerUnsub(); this._routerUnsub = null; }
    if (this.gui) { this.gui.dispose(); this.gui = null; }
    if (this._container && this._container.parentNode) {
      this._container.parentNode.removeChild(this._container);
    }
    this._container = null;
  }

  _buildInputSection() {
    const input = this.gui.addFolder({ title: 'audio input', expanded: true });

    input.addBinding(this.conf, 'audioEnabled', { label: 'enable' })
      .on('change', (ev) => { try { this.router?.setEnabled(ev.value); } catch {} });

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
    input.addBinding(this.conf, 'audioBassGain', { min: 0.0, max: 3.0, step: 0.05, label: 'bass gain' });
    input.addBinding(this.conf, 'audioMidGain', { min: 0.0, max: 3.0, step: 0.05, label: 'mid gain' });
    input.addBinding(this.conf, 'audioTrebleGain', { min: 0.0, max: 3.0, step: 0.05, label: 'treble gain' });
    input.addBinding(this.conf, 'audioBeatBoost', { min: 0.0, max: 3.0, step: 0.05, label: 'beat boost' });

    const processing = input.addFolder({ title: 'processing', expanded: false });
    this._agcProxy = { amount: 0.0, gate: 0.003, hold: 0.2, inputGain: 1.0 };
    processing.addBinding(this._agcProxy, 'amount', { min: 0.0, max: 1.0, step: 0.01, label: 'agc' })
      .on('change', () => this.engine.setAgc(this._agcProxy.amount));
    processing.addBinding(this._agcProxy, 'gate', { min: 0.0, max: 0.02, step: 0.0005, label: 'gate' })
      .on('change', () => this.engine.setGate(this._agcProxy.gate, this._agcProxy.hold));
    processing.addBinding(this._agcProxy, 'hold', { min: 0.05, max: 0.6, step: 0.01, label: 'hold' })
      .on('change', () => this.engine.setGate(this._agcProxy.gate, this._agcProxy.hold));
    processing.addBinding(this._agcProxy, 'inputGain', { min: 0.1, max: 3.0, step: 0.05, label: 'input' })
      .on('change', () => this.engine.setInputGain(this._agcProxy.inputGain));

    const fft = { size: 2048 };
    processing.addBinding(fft, 'size', {
      view: 'list',
      label: 'fft',
      options: [
        { text: '1024', value: 1024 },
        { text: '2048', value: 2048 },
        { text: '4096', value: 4096 },
      ],
      value: 2048,
    }).on('change', (ev) => { try { this.engine.setFftSize(ev.value); } catch {} });

    const monitor = input.addFolder({ title: 'monitor', expanded: false });
    this._monitorProxy = { enable: false, level: 0.0 };
    monitor.addBinding(this._monitorProxy, 'enable', { label: 'monitor' })
      .on('change', (ev) => this.engine.setMonitorEnabled(ev.value));
    monitor.addBinding(this._monitorProxy, 'level', { min: 0.0, max: 1.0, step: 0.01, label: 'level' })
      .on('change', (ev) => this.engine.setMonitorLevel(ev.value));

    input.addBlade({ view: 'separator' });
    input.addBlade({ view: 'button', label: 'audio', title: 'Import Audio File' })
      .on('click', () => this._chooseAudioFile());
  }

  _buildBlueprintSection() {
    const reactor = this.gui.addFolder({ title: 'blueprints', expanded: true });

    this._reactorProxy = { enabled: this.router?.enabled ?? true };
    this._reactorBinding = reactor.addBinding(this._reactorProxy, 'enabled', { label: 'reactor' })
      .on('change', (ev) => this.router?.setEnabled(ev.value));

    const options = (this.router?.getBlueprintOptions?.() || []).map(({ value, text }) => ({ value, text }));
    const current = this.router?.getCurrentBlueprint?.();
    this._blueprintList = reactor.addBlade({
      view: 'list',
      label: 'blueprint',
      options,
      value: current || (options[0]?.value),
    });
    this._blueprintList.on('change', (ev) => {
      try { this.router?.setBlueprint(ev.value); } catch (err) { console.warn(err); }
    });

    const desc = document.createElement('div');
    desc.style.marginTop = '8px';
    desc.style.fontSize = '11px';
    desc.style.lineHeight = '1.45';
    desc.style.color = 'rgba(220,232,255,0.75)';
    desc.style.fontFamily = '"Inter", sans-serif';
    desc.style.padding = '0 6px 6px 6px';
    desc.textContent = this.router?.getBlueprintDescription?.(current) || '';
    reactor.element.appendChild(desc);
    this._blueprintDescEl = desc;
  }

  _buildMasterSection() {
    const groove = this.gui.addFolder({ title: 'groove controls', expanded: true });
    const masterSchema = this.router?.getMasterSchema?.() || [];
    this._masterProxy = this.router?.getMasterState?.() || {};
    this._masterBindings = [];
    masterSchema.forEach((meta) => {
      if (!(meta.key in this._masterProxy)) this._masterProxy[meta.key] = 1.0;
      const binding = groove.addBinding(this._masterProxy, meta.key, {
        label: meta.label,
        min: meta.min,
        max: meta.max,
        step: meta.step,
      }).on('change', (ev) => this.router?.setMaster(meta.key, ev.value));
      this._masterBindings.push(binding);
    });

    const tempoFolder = groove.addFolder({ title: 'tempo assist', expanded: false });
    const tempoSchema = this.router?.getTempoSchema?.() || [];
    this._tempoProxy = this.router?.getTempoState?.() || {};
    this._tempoBindings = [];
    tempoSchema.forEach((meta) => {
      if (!(meta.key in this._tempoProxy)) this._tempoProxy[meta.key] = meta.min;
      const binding = tempoFolder.addBinding(this._tempoProxy, meta.key, {
        label: meta.label,
        min: meta.min,
        max: meta.max,
        step: meta.step,
      }).on('change', () => this.router?.setTempoState({ [meta.key]: this._tempoProxy[meta.key] }));
      this._tempoBindings.push(binding);
    });
  }

  _buildLayerSection() {
    this._layersFolder = this.gui.addFolder({ title: 'kinetic layers', expanded: false });
    this._rebuildLayerControls();
  }

  _rebuildLayerControls() {
    if (!this._layersFolder) return;
    [...this._layersFolder.children].forEach((child) => this._layersFolder.remove(child));
    this._layerBindingMap.clear();
    this._layerDriverLabels.clear();
    this._layerProxies = {};

    const layers = this.router?.describeLayers?.() || [];
    layers.forEach((layer) => {
      const proxy = {
        enabled: layer.enabled,
        weight: layer.weight,
        accent: layer.accent ?? 0.5,
        curve: layer.curve ?? 1.0,
        jitter: layer.jitter ?? 0,
      };
      this._layerProxies[layer.key] = proxy;

      const folder = this._layersFolder.addFolder({ title: layer.label, expanded: false });
      if (layer.ui?.description) {
        const desc = document.createElement('div');
        desc.textContent = layer.ui.description;
        desc.style.fontSize = '11px';
        desc.style.lineHeight = '1.4';
        desc.style.color = 'rgba(205,220,255,0.7)';
        desc.style.margin = '4px 0 6px 0';
        desc.style.fontFamily = '"Inter", sans-serif';
        folder.element.appendChild(desc);
      }
      const driverLabel = document.createElement('div');
      driverLabel.textContent = `driver: ${formatDriver(layer.driver)}`;
      driverLabel.style.fontSize = '10px';
      driverLabel.style.letterSpacing = '0.05em';
      driverLabel.style.textTransform = 'uppercase';
      driverLabel.style.color = 'rgba(150,180,220,0.65)';
      driverLabel.style.marginBottom = '6px';
      folder.element.appendChild(driverLabel);
      this._layerDriverLabels.set(layer.key, driverLabel);

      const bindings = [];
      bindings.push(folder.addBinding(proxy, 'enabled', { label: 'active' })
        .on('change', (ev) => this.router?.updateLayer(layer.key, { enabled: ev.value })));
      bindings.push(folder.addBinding(proxy, 'weight', { label: 'energy', min: 0.0, max: 2.5, step: 0.01 })
        .on('change', (ev) => this.router?.updateLayer(layer.key, { weight: ev.value })));
      bindings.push(folder.addBinding(proxy, 'accent', { label: 'accent', min: 0.0, max: 1.5, step: 0.01 })
        .on('change', (ev) => this.router?.updateLayer(layer.key, { accent: ev.value })));
      bindings.push(folder.addBinding(proxy, 'curve', { label: 'curve', min: 0.4, max: 2.5, step: 0.01 })
        .on('change', (ev) => this.router?.updateLayer(layer.key, { curve: ev.value })));
      bindings.push(folder.addBinding(proxy, 'jitter', { label: 'jitter', min: 0.0, max: 1.0, step: 0.01 })
        .on('change', (ev) => this.router?.updateLayer(layer.key, { jitter: ev.value })));
      this._layerBindingMap.set(layer.key, bindings);
    });
  }

  _buildDiagnosticsSection() {
    const diag = this.gui.addFolder({ title: 'diagnostics', expanded: false });
    diag.addBinding(this.conf, '_audioLevel', { readonly: true, label: 'level' });
    diag.addBinding(this.conf, '_audioBeat', { readonly: true, label: 'beat' });
    diag.addBinding(this.conf, '_audioBass', { readonly: true, label: 'bass' });
    diag.addBinding(this.conf, '_audioMid', { readonly: true, label: 'mid' });
    diag.addBinding(this.conf, '_audioTreble', { readonly: true, label: 'treble' });
    diag.addBinding(this.conf, '_audioTempoBpm', { readonly: true, label: 'tempo bpm' });
  }

  _chooseAudioFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const arrayBuffer = await file.arrayBuffer();
        await this.engine.connectFile(arrayBuffer);
        this.conf.audioSource = 'file';
        if (this._blueprintList) this._blueprintList.refresh?.();
      } catch (err) {
        console.error(err);
      }
    };
    input.click();
  }

  _syncFromRouter(event) {
    if (!this.router) return;
    if (this._reactorProxy) {
      this._reactorProxy.enabled = this.router.enabled;
      this._reactorBinding?.refresh();
    }

    if (this._blueprintList) {
      const current = this.router.getCurrentBlueprint?.();
      if (current) this._blueprintList.value = current;
      if (this._blueprintDescEl) {
        this._blueprintDescEl.textContent = this.router.getBlueprintDescription?.(current) || '';
      }
    }

    if (this._masterProxy) {
      Object.assign(this._masterProxy, this.router.getMasterState?.() || {});
      this._masterBindings.forEach((binding) => binding.refresh());
    }
    if (this._tempoProxy) {
      Object.assign(this._tempoProxy, this.router.getTempoState?.() || {});
      this._tempoBindings.forEach((binding) => binding.refresh());
    }

    const layers = this.router.describeLayers?.() || [];
    const knownKeys = new Set(layers.map((l) => l.key));
    const needsRebuild = layers.length !== Object.keys(this._layerProxies || {}).length
      || (event && event.reason === 'blueprint')
      || [...Object.keys(this._layerProxies || {})].some((k) => !knownKeys.has(k));
    if (needsRebuild) {
      this._rebuildLayerControls();
      return;
    }

    layers.forEach((layer) => {
      const proxy = this._layerProxies[layer.key];
      const bindings = this._layerBindingMap.get(layer.key);
      if (!proxy || !bindings) return;
      proxy.enabled = layer.enabled;
      proxy.weight = layer.weight;
      proxy.accent = layer.accent ?? proxy.accent;
      proxy.curve = layer.curve ?? proxy.curve;
      proxy.jitter = layer.jitter ?? proxy.jitter;
      const driverLabel = this._layerDriverLabels.get(layer.key);
      if (driverLabel) driverLabel.textContent = `driver: ${formatDriver(layer.driver)}`;
      bindings.forEach((binding) => binding.refresh());
    });
  }
}
