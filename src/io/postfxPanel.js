import { Pane } from "tweakpane";
import * as EssentialsPlugin from "@tweakpane/plugin-essentials";
import { postFxState, POST_FX_DEFAULTS, syncStateObject } from "../postfx/state.js";

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));

class PostFXPanel {
    constructor(lensPipeline = null) {
        this.lens = lensPipeline;
        this.gui = null;
        this._container = null;
        this._ui = postFxState.snapshot();
        this._unsubscribe = null;
    }

    _bind(folder, target, prop, path, params = {}) {
        const binding = folder.addBinding(target, prop, params);
        binding.on('change', (ev) => {
            postFxState.set(path, ev.value);
        });
        return binding;
    }

    _initCameraControls(root) {
        const cameraFolder = root.addFolder({ title: 'camera & env', expanded: false });
        this._bind(cameraFolder, this._ui.camera, 'fov', ['camera', 'fov'], { min: 20, max: 120, step: 1 });
        this._bind(cameraFolder, this._ui.camera, 'exposure', ['camera', 'exposure'], { min: 0.1, max: 2.5, step: 0.01 });
        this._bind(cameraFolder, this._ui.camera, 'envIntensity', ['camera', 'envIntensity'], { min: 0.0, max: 3.0, step: 0.01, label: 'env intensity' });
        this._bind(cameraFolder, this._ui.camera, 'bgRotation', ['camera', 'bgRotation'], { min: -Math.PI, max: Math.PI, step: 0.01, label: 'bg rot' });
        this._bind(cameraFolder, this._ui.camera, 'envRotation', ['camera', 'envRotation'], { min: -Math.PI, max: Math.PI, step: 0.01, label: 'env rot' });
        cameraFolder.addBlade({ view: 'button', label: 'cam', title: 'reset camera' }).on('click', () => {
            postFxState.update({ camera: { ...POST_FX_DEFAULTS.camera } });
        });
    }

    _initLensControls(root) {
        const lensFolder = root.addFolder({ title: 'lens', expanded: false });
        this._bind(lensFolder, this._ui.lens, 'enabled', ['lens', 'enabled'], { label: 'enable' });
        this._bind(lensFolder, this._ui.lens, 'sensorWidth', ['lens', 'sensorWidth'], { min: 12.0, max: 70.0, step: 0.1, label: 'sensor (mm)' });
        this._bind(lensFolder, this._ui.lens, 'focalLength', ['lens', 'focalLength'], { min: 8.0, max: 120.0, step: 0.1, label: 'focal (mm)' });
        this._bind(lensFolder, this._ui.lens, 'fStop', ['lens', 'fStop'], { min: 0.7, max: 16.0, step: 0.1, label: 'f-stop' });
        this._bind(lensFolder, this._ui.lens, 'driveFov', ['lens', 'driveFov'], { label: 'drive FOV' });
        this._bind(lensFolder, this._ui.lens, 'focusSmooth', ['lens', 'focusSmooth'], { min: 0.0, max: 0.9, step: 0.01, label: 'focus smooth' });
        lensFolder.addBlade({ view: 'button', label: 'preset', title: 'macro portrait' }).on('click', () => {
            postFxState.update({
                lens: { enabled: true, driveFov: true, sensorWidth: 36.0, focalLength: 35.0, fStop: 1.4, focusSmooth: 0.25 },
                dof: {
                    enabled: true,
                    autoFocus: true,
                    range: 0.06,
                    amount: 1.35,
                    nearBoost: 1.3,
                    farBoost: 2.1,
                    highlightThreshold: 0.78,
                    highlightGain: 1.05,
                }
            });
        });
    }

    _initDofControls(root) {
        const dofFolder = root.addFolder({ title: 'depth of field', expanded: true });
        this._bind(dofFolder, this._ui.dof, 'enabled', ['dof', 'enabled'], { label: 'enable' });
        this._bind(dofFolder, this._ui.dof, 'autoFocus', ['dof', 'autoFocus'], { label: 'auto focus' });
        this._bind(dofFolder, this._ui.dof, 'focus', ['dof', 'focus'], { min: 0.1, max: 5.0, step: 0.01 });
        this._bind(dofFolder, this._ui.dof, 'range', ['dof', 'range'], { min: 0.01, max: 2.5, step: 0.01, label: 'range' });
        this._bind(dofFolder, this._ui.dof, 'amount', ['dof', 'amount'], { min: 0.0, max: 2.0, step: 0.01, label: 'amount' });
        this._bind(dofFolder, this._ui.dof, 'quality', ['dof', 'quality'], { min: 0.25, max: 1.0, step: 0.01, label: 'quality' });
        this._bind(dofFolder, this._ui.dof, 'nearBoost', ['dof', 'nearBoost'], { min: 0.2, max: 4.0, step: 0.01, label: 'near boost' });
        this._bind(dofFolder, this._ui.dof, 'farBoost', ['dof', 'farBoost'], { min: 0.2, max: 4.0, step: 0.01, label: 'far boost' });
        this._bind(dofFolder, this._ui.dof, 'highlightThreshold', ['dof', 'highlightThreshold'], { min: 0.0, max: 1.0, step: 0.01, label: 'hi threshold' });
        this._bind(dofFolder, this._ui.dof, 'highlightGain', ['dof', 'highlightGain'], { min: 0.0, max: 2.5, step: 0.01, label: 'hi gain' });
        this._bind(dofFolder, this._ui.dof, 'apertureBlades', ['dof', 'apertureBlades'], { min: 3, max: 12, step: 1, label: 'blades' });
        this._bind(dofFolder, this._ui.dof, 'apertureRotation', ['dof', 'apertureRotation'], { min: -Math.PI, max: Math.PI, step: 0.01, label: 'apert rot' });
        this._bind(dofFolder, this._ui.dof, 'aperturePetal', ['dof', 'aperturePetal'], { min: 0.2, max: 3.0, step: 0.01, label: 'petal' });
        this._bind(dofFolder, this._ui.dof, 'anamorphic', ['dof', 'anamorphic'], { min: -1.0, max: 1.0, step: 0.01, label: 'anamorphic' });
    }

    _initBloomControls(root) {
        const bloomFolder = root.addFolder({ title: 'bloom', expanded: false });
        this._bind(bloomFolder, this._ui.bloom, 'enabled', ['bloom', 'enabled'], { label: 'enable' });
        this._bind(bloomFolder, this._ui.bloom, 'strength', ['bloom', 'strength'], { min: 0.0, max: 3.0, step: 0.01 });
        this._bind(bloomFolder, this._ui.bloom, 'radius', ['bloom', 'radius'], { min: 0.1, max: 2.0, step: 0.01 });
        this._bind(bloomFolder, this._ui.bloom, 'threshold', ['bloom', 'threshold'], { min: 0.0, max: 1.0, step: 0.001 });
    }

    _initFxControls(root) {
        const colorFolder = root.addFolder({ title: 'grading', expanded: false });
        this._bind(colorFolder, this._ui.color, 'saturation', ['color', 'saturation'], { min: 0.0, max: 2.5, step: 0.01 });
        this._bind(colorFolder, this._ui.color, 'contrast', ['color', 'contrast'], { min: 0.5, max: 2.5, step: 0.01 });
        this._bind(colorFolder, this._ui.color, 'lift', ['color', 'lift'], { min: -0.5, max: 0.5, step: 0.005 });

        const vignetteFolder = root.addFolder({ title: 'vignette', expanded: false });
        this._bind(vignetteFolder, this._ui.vignette, 'enabled', ['vignette', 'enabled'], { label: 'enable' });
        this._bind(vignetteFolder, this._ui.vignette, 'amount', ['vignette', 'amount'], { min: 0.0, max: 1.5, step: 0.01 });

        const grainFolder = root.addFolder({ title: 'grain', expanded: false });
        this._bind(grainFolder, this._ui.grain, 'enabled', ['grain', 'enabled'], { label: 'enable' });
        this._bind(grainFolder, this._ui.grain, 'amount', ['grain', 'amount'], { min: 0.0, max: 0.5, step: 0.01 });

        const chromaFolder = root.addFolder({ title: 'chromatic ab', expanded: false });
        this._bind(chromaFolder, this._ui.chroma, 'enabled', ['chroma', 'enabled'], { label: 'enable' });
        this._bind(chromaFolder, this._ui.chroma, 'amount', ['chroma', 'amount'], { min: 0.0, max: 0.01, step: 0.0001 });
        chromaFolder.addBinding(this._ui.chroma, 'center', {
            x: { min: 0.0, max: 1.0, step: 0.001 },
            y: { min: 0.0, max: 1.0, step: 0.001 }
        }).on('change', (ev) => {
            const value = { x: clamp(ev.value.x, 0, 1), y: clamp(ev.value.y, 0, 1) };
            postFxState.set(['chroma', 'center'], value);
        });
        this._bind(chromaFolder, this._ui.chroma, 'scale', ['chroma', 'scale'], { min: 0.2, max: 3.0, step: 0.01 });

        const motionFolder = root.addFolder({ title: 'motion blur', expanded: false });
        this._bind(motionFolder, this._ui.motion, 'enabled', ['motion', 'enabled'], { label: 'enable' });
        this._bind(motionFolder, this._ui.motion, 'amount', ['motion', 'amount'], { min: 0.0, max: 1.0, step: 0.01 });
    }

    _initAdvanced(root) {
        const aaFolder = root.addFolder({ title: 'anti aliasing', expanded: false });
        aaFolder.addBlade({
            view: 'list',
            label: 'mode',
            options: [
                { text: 'off', value: 'off' },
                { text: 'fxaa', value: 'fxaa' },
                { text: 'smaa', value: 'smaa' },
                { text: 'traa', value: 'traa' },
            ],
            value: this._ui.aa.mode,
        }).on('change', (ev) => {
            postFxState.set(['aa', 'mode'], ev.value);
        });
        this._bind(aaFolder, this._ui.aa, 'amount', ['aa', 'amount'], { min: 0.2, max: 2.0, step: 0.05, label: 'amount' });

        const aoFolder = root.addFolder({ title: 'ambient occlusion', expanded: false });
        this._bind(aoFolder, this._ui.ao, 'enabled', ['ao', 'enabled'], { label: 'enable' });
        this._bind(aoFolder, this._ui.ao, 'radius', ['ao', 'radius'], { min: 0.05, max: 2.0, step: 0.01, label: 'radius' });
        this._bind(aoFolder, this._ui.ao, 'thickness', ['ao', 'thickness'], { min: 0.1, max: 4.0, step: 0.05, label: 'thickness' });
        this._bind(aoFolder, this._ui.ao, 'distanceExponent', ['ao', 'distanceExponent'], { min: 0.5, max: 3.0, step: 0.05, label: 'distance exp' });
        this._bind(aoFolder, this._ui.ao, 'scale', ['ao', 'scale'], { min: 0.1, max: 2.0, step: 0.05 });
        this._bind(aoFolder, this._ui.ao, 'samples', ['ao', 'samples'], { min: 4, max: 32, step: 1 });
        this._bind(aoFolder, this._ui.ao, 'resolutionScale', ['ao', 'resolutionScale'], { min: 0.25, max: 1.0, step: 0.05, label: 'res scale' });

        const ssrFolder = root.addFolder({ title: 'screen space reflections', expanded: false });
        this._bind(ssrFolder, this._ui.ssr, 'enabled', ['ssr', 'enabled'], { label: 'enable' });
        this._bind(ssrFolder, this._ui.ssr, 'opacity', ['ssr', 'opacity'], { min: 0.0, max: 1.0, step: 0.01 });
        this._bind(ssrFolder, this._ui.ssr, 'maxDistance', ['ssr', 'maxDistance'], { min: 0.1, max: 5.0, step: 0.01, label: 'distance' });
        this._bind(ssrFolder, this._ui.ssr, 'thickness', ['ssr', 'thickness'], { min: 0.01, max: 1.0, step: 0.01 });
        this._bind(ssrFolder, this._ui.ssr, 'resolutionScale', ['ssr', 'resolutionScale'], { min: 0.25, max: 1.0, step: 0.05, label: 'res scale' });
        this._bind(ssrFolder, this._ui.ssr, 'metalness', ['ssr', 'metalness'], { min: 0.0, max: 1.5, step: 0.01 });
    }

    init(position = 'left') {
        if (this.gui) return this.gui;
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.top = '16px';
        container.style.left = position === 'left' ? '16px' : 'auto';
        container.style.right = position === 'right' ? '16px' : 'auto';
        container.style.maxWidth = '360px';
        container.style.padding = '8px';
        container.style.borderRadius = '12px';
        container.style.background = 'rgba(16, 20, 24, 0.32)';
        container.style.backdropFilter = 'blur(12px) saturate(160%)';
        container.style.WebkitBackdropFilter = 'blur(12px) saturate(160%)';
        container.style.border = '1px solid rgba(255,255,255,0.14)';
        container.style.boxShadow = '0 12px 32px rgba(0,0,0,0.35)';
        container.style.pointerEvents = 'auto';
        document.body.appendChild(container);
        this._container = container;

        const pane = new Pane({ container });
        pane.registerPlugin(EssentialsPlugin);
        this.gui = pane;

        pane.addBinding(this._ui, 'enabled', { label: 'enable post fx' }).on('change', (ev) => {
            postFxState.set('enabled', ev.value);
        });

        const sections = pane.addFolder({ title: 'pipeline', expanded: true });
        this._initCameraControls(sections);
        this._initLensControls(sections);
        this._initDofControls(sections);
        this._initBloomControls(sections);
        this._initFxControls(sections);
        this._initAdvanced(sections);

        pane.addBlade({ view: 'button', label: 'reset', title: 'Reset to defaults' }).on('click', () => {
            postFxState.reset();
        });

        this._unsubscribe = postFxState.subscribe((state) => {
            syncStateObject(this._ui, state);
            if (this.gui) this.gui.refresh();
        });

        return pane;
    }

    dispose() {
        if (this._unsubscribe) this._unsubscribe();
        this._unsubscribe = null;
        if (this.gui) {
            this.gui.dispose();
            this.gui = null;
        }
        if (this._container && this._container.parentElement) {
            this._container.parentElement.removeChild(this._container);
        }
        this._container = null;
    }
}

export default PostFXPanel;

