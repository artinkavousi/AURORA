import { Pane } from "tweakpane";
import * as EssentialsPlugin from "@tweakpane/plugin-essentials";

export const buildDashboard = (conf) => {
    if (conf.gui) return conf.gui;
    // Create glass-styled container for the control panel
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '16px';
    container.style.right = '16px';
    container.style.maxWidth = '360px';
    container.style.padding = '8px';
    container.style.borderRadius = '12px';
    container.style.background = 'rgba(20, 24, 28, 0.28)';
    container.style.backdropFilter = 'blur(10px) saturate(140%)';
    container.style.WebkitBackdropFilter = 'blur(10px) saturate(140%)';
    container.style.border = '1px solid rgba(255,255,255,0.12)';
    container.style.boxShadow = '0 10px 30px rgba(0,0,0,0.35)';
    container.style.pointerEvents = 'auto';
    document.body.appendChild(container);

    const gui = new Pane({ container })
    gui.registerPlugin(EssentialsPlugin);

    const stats = gui.addFolder({
        title: "stats",
        expanded: false,
    });
    conf.fpsGraph = stats.addBlade({
        view: 'fpsgraph',
        label: 'fps',
        rows: 2,
    });

    const settings = gui.addFolder({
        title: "settings",
        expanded: false,
    });
    settings.addBinding(conf, "particles", { min: 4096, max: conf.maxParticles, step: 4096 }).on('change', () => { conf.updateParams(); });
    settings.addBinding(conf, "size", { min: 0.5, max: 2, step: 0.1 }).on('change', () => { conf.updateParams(); });
    const rendering = settings.addFolder({
        title: "rendering",
        expanded: false,
    });
    rendering.addBlade({
        view: 'list',
        label: 'mode',
        options: [
            { text: 'surface', value: 'surface' },
            { text: 'glyphs', value: 'glyphs' },
            { text: 'points', value: 'points' },
        ],
        value: conf.renderMode,
    }).on('change', (ev) => { conf.renderMode = ev.value; });
    rendering.addBlade({
        view: 'list',
        label: 'color',
        options: [
            { text: 'fluid', value: 'fluid' },
            { text: 'audio', value: 'audio' },
            { text: 'velocity', value: 'velocity' },
        ],
        value: conf.colorMode,
    }).on('change', (ev) => { conf.colorMode = ev.value; });
    // Bloom controls moved to Post FX panel
    rendering.addBinding(conf, "points");
    rendering.addBinding(conf, "worldScale", { min: 0.5, max: 3.0, step: 0.01, label: 'world scale' });
    rendering.addBinding(conf, "autoWorldFit", { label: 'auto fit world' });
    rendering.addBlade({
        view: 'list',
        label: 'fit',
        options: [
            { text: 'contain', value: 'contain' },
            { text: 'cover', value: 'cover' },
        ],
        value: conf.fitMode,
    }).on('change', (ev) => { conf.fitMode = ev.value; });
    rendering.addBinding(conf, "zScale", { min: 0.05, max: 2.0, step: 0.01, label: 'z compress' });
    rendering.addBinding(conf, "fitMargin", { min: 0.90, max: 1.0, step: 0.005, label: 'fit margin' });

    // World border behavior when boundaries are disabled
    rendering.addBlade({
        view: 'list',
        label: 'world border',
        options: [
            { text: 'bounce', value: 'bounce' },
            { text: 'wrap', value: 'wrap' },
        ],
        value: conf.borderMode || 'bounce',
    }).on('change', (ev) => { conf.borderMode = ev.value; });

    // DOF controls moved under Post FX
    const dofMacro = () => {
        conf.zScale = 0.18;
        conf.dofEnabled = true;
        conf.dofHighQuality = true;
        conf.dofAutoFocus = true;
        conf.dofRange = 0.06;
        conf.dofAmount = 1.30;
        conf.fov = Math.max(60, conf.fov);
        conf.updateParams();
        if (conf.gui) conf.gui.refresh();
    };

    const perf = settings.addFolder({ title: 'performance', expanded: false });
    perf.addBinding(conf, 'autoPerf', { label: 'auto adjust' });
    perf.addBinding(conf, 'perfMinFps', { min: 20, max: 80, step: 1, label: 'min fps' });
    perf.addBinding(conf, 'perfMaxFps', { min: 30, max: 120, step: 1, label: 'max fps' });
    perf.addBinding(conf, 'perfStep', { min: 1024, max: 16384, step: 1024, label: 'step' });

    const camera = settings.addFolder({
        title: "camera",
        expanded: false,
    });
    camera.addBinding(conf, "fov", { min: 30, max: 100, step: 1 });
    // Lens controls (approximate mapping to DOF params)
    const lens = settings.addFolder({ title: 'lens & dof', expanded: false });
    conf.lensEnabled = false;
    conf.sensorWidth = 36.0; // mm (full-frame)
    conf.focalLength = 24.0; // mm
    conf.fStop = 1.8;
    conf.lensDriveFov = true;
    conf.focusSmooth = 0.2;
    lens.addBinding(conf, 'lensEnabled', { label: 'enable' });
    lens.addBinding(conf, 'sensorWidth', { min: 12.0, max: 70.0, step: 0.1, label: 'sensor (mm)' });
    lens.addBinding(conf, 'focalLength', { min: 8.0, max: 120.0, step: 0.1, label: 'focal (mm)' });
    lens.addBinding(conf, 'fStop', { min: 0.7, max: 16.0, step: 0.1, label: 'f‑stop' });
    lens.addBinding(conf, 'lensDriveFov', { label: 'drive FOV' });
    lens.addBinding(conf, 'focusSmooth', { min: 0.0, max: 0.9, step: 0.01, label: 'focus smooth' });
    // DOF controls (moved here)
    lens.addBinding(conf, 'dofEnabled', { label: 'dof enable' });
    lens.addBinding(conf, 'dofAutoFocus', { label: 'auto focus (pointer)' });
    lens.addBinding(conf, 'dofHighQuality', { label: 'high quality' });
    lens.addBinding(conf, 'dofFocus', { min: 0.1, max: 3.0, step: 0.01 });
    lens.addBinding(conf, 'dofRange', { min: 0.02, max: 2.0, step: 0.01 });
    lens.addBinding(conf, 'dofAmount', { min: 0.0, max: 2.0, step: 0.01 });
    // DOF quality (0.25..1.0)
    conf.dofQuality = 1.0;
    lens.addBinding(conf, 'dofQuality', { min: 0.25, max: 1.0, step: 0.01, label: 'dof quality' });
    lens.addBlade({ view: 'button', label: 'macro', title: 'Macro Shot' }).on('click', dofMacro);
    // Advanced bokeh controls
    conf.dofNearBoost = conf.dofNearBoost ?? 1.0;
    conf.dofFarBoost = conf.dofFarBoost ?? 1.0;
    conf.dofHighlightThreshold = conf.dofHighlightThreshold ?? 0.8;
    conf.dofHighlightGain = conf.dofHighlightGain ?? 0.6;
    lens.addBinding(conf, 'dofNearBoost', { min: 0.5, max: 3.0, step: 0.01, label: 'near boost' });
    lens.addBinding(conf, 'dofFarBoost', { min: 0.5, max: 3.0, step: 0.01, label: 'far boost' });
    lens.addBinding(conf, 'dofHighlightThreshold', { min: 0.0, max: 1.0, step: 0.01, label: 'hi thresh' });
    lens.addBinding(conf, 'dofHighlightGain', { min: 0.0, max: 2.0, step: 0.01, label: 'hi gain' });
    // Aperture & anamorphic
    conf.apertureBlades = 7; // polygon blades
    conf.apertureRotation = 0.0; // radians
    conf.aperturePetal = 1.0; // sharpness of polygon weighting
    conf.anamorphic = 0.0; // -1..1 (negative vertical, positive horizontal)
    lens.addBinding(conf, 'apertureBlades', { min: 3, max: 12, step: 1, label: 'blades' });
    lens.addBinding(conf, 'apertureRotation', { min: -3.1416, max: 3.1416, step: 0.01, label: 'apert rot' });
    lens.addBinding(conf, 'aperturePetal', { min: 0.2, max: 2.5, step: 0.01, label: 'apert petal' });
    lens.addBinding(conf, 'anamorphic', { min: -1.0, max: 1.0, step: 0.01, label: 'anamorphic' });
    // Creative presets
    lens.addBlade({ view: 'button', label: 'preset', title: 'Creamy Wide' }).on('click', () => {
        conf.lensEnabled = true; conf.lensDriveFov = true;
        conf.sensorWidth = 36.0; conf.focalLength = 24.0; conf.fStop = 1.4;
        conf.dofEnabled = true; conf.dofAutoFocus = true; conf.dofHighQuality = true;
        conf.dofRange = 0.06; conf.dofAmount = 1.4; conf.dofFarBoost = 2.2; conf.dofNearBoost = 1.2;
        conf.dofHighlightThreshold = 0.8; conf.dofHighlightGain = 1.1; conf.focusSmooth = 0.25;
        if (conf.gui) conf.gui.refresh();
    });

    const environment = settings.addFolder({
        title: "environment",
        expanded: false,
    });
    environment.addBinding(conf, "envIntensity", { min: 0.0, max: 5.0, step: 0.05 });
    environment.addBinding(conf, "exposure", { min: 0.0, max: 2.0, step: 0.01 });
    environment.addBinding(conf, "bgRotY", { label: 'bg rot Y', min: -Math.PI, max: Math.PI, step: 0.01 });
    environment.addBinding(conf, "envRotY", { label: 'env rot Y', min: -Math.PI, max: Math.PI, step: 0.01 });

    const boundary = settings.addFolder({
        title: "boundary",
        expanded: false,
    });
    boundary.addBinding(conf, 'boundariesEnabled', { label: 'enable' });
    boundary.addBlade({
        view: 'list',
        label: 'shape',
        options: [
            { text: 'dodecahedron', value: 'dodeca' },
            { text: 'cube', value: 'cube' },
            { text: 'sphere', value: 'sphere' },
        ],
        value: conf.boundaryShape,
    }).on('change', (ev) => { conf.boundaryShape = ev.value; });
    boundary.addBinding(conf, "glassIor", { min: 1.0, max: 2.6, step: 0.01 });
    boundary.addBinding(conf, "glassThickness", { min: 0.0, max: 2.0, step: 0.01 });
    boundary.addBinding(conf, "glassRoughness", { min: 0.0, max: 0.5, step: 0.005 });
    boundary.addBinding(conf, "glassDispersion", { min: 0.0, max: 1.0, step: 0.01 });
    boundary.addBinding(conf, "glassAttenuationDistance", { min: 0.1, max: 10.0, step: 0.1 });
    boundary.addBinding(conf, "glassAttenuationColor", { view: 'color' });
    boundary.addBinding(conf, "collisionShrink", { min: 0.90, max: 1.00, step: 0.001, label: 'collision shrink' });
    boundary.addBinding(conf, "collisionRestitution", { min: 0.0, max: 1.5, step: 0.01, label: 'restitution' });
    boundary.addBinding(conf, "collisionFriction", { min: 0.0, max: 1.0, step: 0.01, label: 'friction' });
    boundary.addBlade({ view: 'button', label: 'upload', title: 'Choose Model' }).on('click', () => {
        if (conf.__onBoundaryUpload) conf.__onBoundaryUpload();
    });

    const simulation = settings.addFolder({
        title: "simulation",
        expanded: false,
    });
    simulation.addBinding(conf, "run");
    simulation.addBinding(conf, "noise", { min: 0, max: 2, step: 0.01 });
    simulation.addBinding(conf, "speed", { min: 0.1, max: 2, step: 0.1 });
    simulation.addBinding(conf, "substeps", { min: 1, max: 8, step: 1 });
    simulation.addBinding(conf, "apicBlend", { min: 0, max: 1, step: 0.05 });
    simulation.addBinding(conf, "physMaxVelocity", { min: 0.5, max: 6.0, step: 0.1, label: 'max velocity' });
    simulation.addBinding(conf, "cflSafety", { min: 0.05, max: 1.0, step: 0.01, label: 'dt safety' });
    simulation.addBinding(conf, "vorticityEnabled", { label: 'vorticity' });
    simulation.addBinding(conf, "vorticityEps", { min: 0.0, max: 0.8, step: 0.01, label: 'vort strength' });
    simulation.addBinding(conf, "xsphEnabled", { label: 'xsph smooth' });
    simulation.addBinding(conf, "xsphEps", { min: 0.0, max: 0.5, step: 0.01, label: 'xsph strength' });
    simulation.addBinding(conf, "sdfSphere", { label: 'sphere collision' });
    simulation.addBinding(conf, "sdfCenterZ", { min: 4, max: 60, step: 1 });
    simulation.addBinding(conf, "sdfRadius", { min: 4, max: 30, step: 1 });
    simulation.addBlade({
        view: 'list',
        label: 'gravity',
        options: [
            {text: 'back', value: 0},
            {text: 'down', value: 1},
            {text: 'center', value: 2},
            {text: 'device gravity', value: 3},
        ],
        value: 0,
    }).on('change', (ev) => {
        if (ev.value === 3) {
            conf.setupGravitySensor();
        }
        conf.gravity = ev.value;
    });
    simulation.addBinding(conf, "density", { min: 0.4, max: 2, step: 0.1 }).on('change', () => { conf.updateParams(); });;
    simulation.addBinding(conf, "stiffness", { min: 0.5, max: 10, step: 0.1 });
    simulation.addBinding(conf, "dynamicViscosity", { min: 0.01, max: 0.5, step: 0.01 });

    const fields = settings.addFolder({ title: 'fields', expanded: false });
    const jet = fields.addFolder({ title: 'jet', expanded: false });
    jet.addBinding(conf, 'jetEnabled', { label: 'enable' });
    jet.addBinding(conf, 'jetStrength', { min: 0.0, max: 3.0, step: 0.01 });
    jet.addBinding(conf, 'jetRadius', { min: 1.0, max: 32.0, step: 0.1 });
    jet.addBinding(conf, 'jetPos', { x: { min: 0, max: 64, step: 1 }, y: { min: 0, max: 64, step: 1 }, z: { min: 0, max: 64, step: 1 } });
    jet.addBinding(conf, 'jetDir', { x: { min: -1, max: 1, step: 0.01 }, y: { min: -1, max: 1, step: 0.01 }, z: { min: -1, max: 1, step: 0.01 } });

    const vortex = fields.addFolder({ title: 'vortex', expanded: false });
    vortex.addBinding(conf, 'vortexEnabled', { label: 'enable' });
    vortex.addBinding(conf, 'vortexStrength', { min: 0.0, max: 3.0, step: 0.01 });
    vortex.addBinding(conf, 'vortexRadius', { min: 1.0, max: 64.0, step: 0.1 });
    vortex.addBinding(conf, 'vortexCenter', { x: { min: 0, max: 64, step: 1 }, y: { min: 0, max: 64, step: 1 } });

    const turb = fields.addFolder({ title: 'curl turbulence', expanded: false });
    turb.addBinding(conf, 'curlEnabled', { label: 'enable' });
    turb.addBinding(conf, 'curlStrength', { min: 0.0, max: 3.0, step: 0.01, label: 'strength' });
    turb.addBinding(conf, 'curlScale', { min: 0.002, max: 0.08, step: 0.001, label: 'scale' });
    turb.addBinding(conf, 'curlTime', { min: 0.05, max: 3.0, step: 0.01, label: 'time' });

    const orbit = fields.addFolder({ title: 'orbit', expanded: false });
    orbit.addBinding(conf, 'orbitEnabled', { label: 'enable' });
    orbit.addBinding(conf, 'orbitStrength', { min: 0.0, max: 3.0, step: 0.01, label: 'strength' });
    orbit.addBinding(conf, 'orbitRadius', { min: 4.0, max: 64.0, step: 0.1, label: 'radius' });
    orbit.addBlade({
        view: 'list',
        label: 'axis',
        options: [
            { text: 'x', value: 'x' },
            { text: 'y', value: 'y' },
            { text: 'z', value: 'z' },
        ],
        value: conf.orbitAxis,
    }).on('change', (ev) => { conf.orbitAxis = ev.value; });

    const wave = fields.addFolder({ title: 'wave', expanded: false });
    wave.addBinding(conf, 'waveEnabled', { label: 'enable' });
    wave.addBinding(conf, 'waveAmplitude', { min: 0.0, max: 2.0, step: 0.01, label: 'amplitude' });
    wave.addBinding(conf, 'waveScale', { min: 0.02, max: 1.0, step: 0.01, label: 'scale' });
    wave.addBinding(conf, 'waveSpeed', { min: 0.1, max: 4.0, step: 0.01, label: 'speed' });
    wave.addBlade({
        view: 'list',
        label: 'axis',
        options: [
            { text: 'x', value: 'x' },
            { text: 'y', value: 'y' },
            { text: 'z', value: 'z' },
        ],
        value: conf.waveAxis,
    }).on('change', (ev) => { conf.waveAxis = ev.value; });

    // Audio controls moved to dedicated AudioPanel (src/ui/audioPanel.js)

    // Post FX unified panel
    const fx = settings.addFolder({ title: 'post fx', expanded: false });
    // Master toggle
    fx.addBinding(conf, 'postFxEnabled', { label: 'enable all' });
    // Bloom
    const fxBloom = fx.addFolder({ title: 'bloom', expanded: false });
    fxBloom.addBinding(conf, "bloom", { label: 'enable' });
    fxBloom.addBinding(conf, "bloomStrength", { min: 0, max: 2, step: 0.01 });
    fxBloom.addBinding(conf, "bloomRadius", { min: 0, max: 1.2, step: 0.01 });
    fxBloom.addBinding(conf, "bloomThreshold", { min: 0, max: 1, step: 0.001 });
    // Depth of field
    // DOF controls moved into Lens panel for cohesion
    // Vignette
    const fxVig = fx.addFolder({ title: 'vignette', expanded: false });
    fxVig.addBinding(conf, 'vignetteEnabled', { label: 'enable' });
    fxVig.addBinding(conf, 'vignetteAmount', { min: 0.0, max: 1.0, step: 0.01, label: 'amount' });
    // Grain
    const fxGrain = fx.addFolder({ title: 'grain', expanded: false });
    fxGrain.addBinding(conf, 'grainEnabled', { label: 'enable' });
    fxGrain.addBinding(conf, 'grainAmount', { min: 0.0, max: 0.5, step: 0.01, label: 'amount' });
    // Chromatic aberration
    const fxCA = fx.addFolder({ title: 'chroma ab', expanded: false });
    fxCA.addBinding(conf, 'chromaEnabled', { label: 'enable' });
    fxCA.addBinding(conf, 'chromaAmount', { min: 0.0, max: 0.01, step: 0.0001, label: 'amount' });
    conf.chromaCenter = conf.chromaCenter || { x: 0.5, y: 0.5 };
    conf.chromaScale = conf.chromaScale || 1.0;
    fxCA.addBinding(conf, 'chromaCenter', { x: { min: 0.0, max: 1.0, step: 0.001 }, y: { min: 0.0, max: 1.0, step: 0.001 } });
    fxCA.addBinding(conf, 'chromaScale', { min: 0.2, max: 3.0, step: 0.01, label: 'scale' });
    // Motion blur
    const fxMB = fx.addFolder({ title: 'motion blur', expanded: false });
    fxMB.addBinding(conf, 'motionBlurEnabled', { label: 'enable' });
    fxMB.addBinding(conf, 'motionBlurAmount', { min: 0.0, max: 1.0, step: 0.01, label: 'amount' });
    // Grading
    const fxGrade = fx.addFolder({ title: 'grading', expanded: false });
    fxGrade.addBinding(conf, 'postSaturation', { min: 0.0, max: 2.0, step: 0.01, label: 'saturation' });
    fxGrade.addBinding(conf, 'postContrast', { min: 0.5, max: 2.0, step: 0.01, label: 'contrast' });
    fxGrade.addBinding(conf, 'postLift', { min: -0.3, max: 0.3, step: 0.005, label: 'lift' });
    // Anti-aliasing
    const fxAA = fx.addFolder({ title: 'anti aliasing', expanded: false });
    fxAA.addBlade({
        view: 'list',
        label: 'mode',
        options: [
            { text: 'off', value: 'off' },
            { text: 'fxaa', value: 'fxaa' },
            { text: 'smaa', value: 'smaa' },
            { text: 'traa', value: 'traa' },
        ],
        value: conf.aaMode,
    }).on('change', (ev) => { conf.aaMode = ev.value; });
    fxAA.addBinding(conf, 'aaAmount', { min: 0.2, max: 2.0, step: 0.05, label: 'amount' });
    // Ambient Occlusion (GTAO)
    const fxAO = fx.addFolder({ title: 'ambient occlusion', expanded: false });
    fxAO.addBinding(conf, 'gtaoEnabled', { label: 'enable' });
    fxAO.addBinding(conf, 'gtaoRadius', { min: 0.05, max: 2.0, step: 0.01, label: 'radius' });
    fxAO.addBinding(conf, 'gtaoThickness', { min: 0.1, max: 4.0, step: 0.1, label: 'thickness' });
    fxAO.addBinding(conf, 'gtaoDistanceExponent', { min: 0.5, max: 3.0, step: 0.05, label: 'distance exp' });
    fxAO.addBinding(conf, 'gtaoScale', { min: 0.1, max: 2.0, step: 0.05, label: 'scale' });
    fxAO.addBinding(conf, 'gtaoSamples', { min: 4, max: 32, step: 1, label: 'samples' });
    fxAO.addBinding(conf, 'gtaoResolutionScale', { min: 0.25, max: 1.0, step: 0.05, label: 'res scale' });
    // Global Illumination (SSGI)
    const fxGI = fx.addFolder({ title: 'global illumination', expanded: false });
    fxGI.addBinding(conf, 'ssgiEnabled', { label: 'enable' });
    fxGI.addBinding(conf, 'ssgiSlices', { min: 1, max: 4, step: 1, label: 'slices' });
    fxGI.addBinding(conf, 'ssgiSteps', { min: 1, max: 32, step: 1, label: 'steps' });
    fxGI.addBinding(conf, 'ssgiIntensity', { min: 0.0, max: 2.0, step: 0.01, label: 'intensity' });
    fxGI.addBinding(conf, 'ssgiResolutionScale', { min: 0.25, max: 1.0, step: 0.05, label: 'res scale' });
    fxGI.addBinding(conf, 'ssgiDenoise', { label: 'denoise' });
    // Reflections (SSR)
    const fxSSR = fx.addFolder({ title: 'reflections', expanded: false });
    fxSSR.addBinding(conf, 'ssrEnabled', { label: 'enable' });
    fxSSR.addBinding(conf, 'ssrOpacity', { min: 0.0, max: 1.0, step: 0.01, label: 'opacity' });
    fxSSR.addBinding(conf, 'ssrMaxDistance', { min: 0.1, max: 4.0, step: 0.05, label: 'max dist' });
    fxSSR.addBinding(conf, 'ssrThickness', { min: 0.01, max: 1.0, step: 0.01, label: 'thickness' });
    fxSSR.addBinding(conf, 'ssrResolutionScale', { min: 0.25, max: 1.0, step: 0.05, label: 'res scale' });
    fxSSR.addBinding(conf, 'ssrMetalness', { min: 0.0, max: 1.0, step: 0.01, label: 'metalness' });

    /*settings.addBinding(conf, "roughness", { min: 0.0, max: 1, step: 0.01 });
    settings.addBinding(conf, "metalness", { min: 0.0, max: 1, step: 0.01 });*/

    // Presets
    const presets = gui.addFolder({
        title: 'presets',
        expanded: false,
    });
    // Built-in presets
    conf._builtinPresetName = 'Photo Mode';
    presets.addBlade({
        view: 'list',
        label: 'builtin',
        options: [
            { text: 'Photo Mode', value: 'Photo Mode' },
            { text: 'Glass Dodeca', value: 'Glass Dodeca' },
            { text: 'Glyph Motion', value: 'Glyph Motion' },
            { text: 'Points Storm', value: 'Points Storm' },
            { text: 'Sphere Tank', value: 'Sphere Tank' },
            { text: 'Vortex Jet', value: 'Vortex Jet' },
            { text: 'Bass Jet', value: 'Bass Jet' },
            { text: 'Dance Surface', value: 'Dance Surface' },
            { text: 'Audio Showcase', value: 'Audio Showcase' },
            { text: 'Nebula Curl', value: 'Nebula Curl' },
            { text: 'Orbit Dance', value: 'Orbit Dance' },
            { text: 'Beat Waves', value: 'Beat Waves' },
            { text: 'Bass Storm', value: 'Bass Storm' },
            { text: 'Perc Glitch', value: 'Perc Glitch' },
            { text: 'Ambient Wash', value: 'Ambient Wash' },
            { text: 'Chillwave Drift', value: 'Chillwave Drift' },
            { text: 'Trance Swirl', value: 'Trance Swirl' },
        ],
        value: conf._builtinPresetName,
    }).on('change', (ev) => {
        conf._builtinPresetName = ev.value;
        conf.applyPreset(ev.value);
    });
    presets.addBlade({ view: 'button', label: 'startup', title: 'Save Current as Startup' }).on('click', () => {
        const data = conf._exportPreset();
        try {
            localStorage.setItem('flow.startPreset', JSON.stringify(data));
        } catch {}
    });
    presets.addBlade({ view: 'button', label: 'save', title: 'Save Preset' }).on('click', () => {
        const data = conf._exportPreset();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'flow-preset.json';
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
    presets.addBlade({ view: 'button', label: 'load', title: 'Load Preset' }).on('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async () => {
            const file = input.files && input.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                conf._importPreset(data);
            } catch (e) {
                console.error(e);
            }
        };
        input.click();
    });

    conf.gui = gui;

    // Apply startup preset (localStorage overrides default)
    let start = null;
    try {
        const s = localStorage.getItem('flow.startPreset');
        if (s) start = JSON.parse(s);
    } catch {}
    if (start) {
        conf._importPreset(start);
    } else {
        // Default to Audio Showcase for a compelling sound-reactive startup
        conf.applyPreset('Audio Showcase');
    }
    return conf.gui;
};
