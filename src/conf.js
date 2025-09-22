import {Pane} from 'tweakpane';
import * as EssentialsPlugin from '@tweakpane/plugin-essentials';
import mobile from "is-mobile";
import * as THREE from "three/webgpu";

class Conf {
    gui = null;
    maxParticles = 8192 * 16;
    particles = 8192 * 4;

    bloom = true;
    bloomStrength = 1.2;
    bloomRadius = 1.0;
    bloomThreshold = 0.0005;

    // Depth of Field (approx)
    dofEnabled = true;
    dofAutoFocus = true; // focus distance follows pointer
    dofFocus = 0.8;      // macro default
    dofRange = 0.08;     // shallow macro range
    dofAmount = 1.15;    // larger bokeh
    dofHighQuality = true; // HQ by default

    // World/domain scaling (visual mapping of 64^3 grid to world units)
    worldScale = 2.0; // scale up domain to fill more of the page by default
    autoWorldFit = true; // dynamically fit domain to viewport
    fitMode = 'cover'; // 'contain' | 'cover'
    fitMargin = 0.995; // fraction of viewport to occupy
    zScale = 0.22; // stronger Z compression default

    // Performance governor
    autoPerf = false;
    perfMinFps = 50;   // degrade below
    perfMaxFps = 58;   // upgrade above
    perfStep = 4096;   // particle step

    // Stage/Camera/Environment controls
    fov = 60;
    exposure = 0.66;
    envIntensity = 0.5;
    bgRotY = 2.15;
    envRotY = -2.15;

    // Glass boundary controls
    boundariesEnabled = false;
    glassIor = 1.5;
    glassThickness = 0.3;
    glassRoughness = 0.02;
    glassDispersion = 0.25;
    glassAttenuationDistance = 2.5;
    glassAttenuationColor = { r: 255, g: 255, b: 255 };
    __onBoundaryUpload = null;
    boundaryShape = 'dodeca'; // 'dodeca' | 'cube' | 'sphere'
    collisionShrink = 0.98;
    collisionRestitution = 0.6;
    collisionFriction = 0.2;

    run = true;
    noise = 1.0;
    speed = 1.6;
    stiffness = 3.;
    restDensity = 1.;
    density = 1.4;
    dynamicViscosity = 0.1;
    gravity = 2; // center gravity by default
    gravitySensorReading = new THREE.Vector3();
    accelerometerReading = new THREE.Vector3();
    actualSize = 1;
    size = 1;

    points = false;
    renderMode = 'surface'; // 'points' | 'glyphs' | 'surface'
    colorMode = 'fluid'; // 'fluid' | 'audio' | 'velocity'
    substeps = 2;
    apicBlend = 0.0;
    sdfSphere = false;
    sdfRadius = 12;
    sdfCenterZ = 20;
    // Stability
    physMaxVelocity = 2.5;
    cflSafety = 0.5;
    vorticityEnabled = false;
    vorticityEps = 0.15;
    xsphEnabled = true;
    xsphEps = 0.08;

    // Fields / Emitters
    jetEnabled = false;
    jetStrength = 0.6;
    jetRadius = 6.0;
    jetPos = { x: 32, y: 40, z: 20 };
    jetDir = { x: 0, y: -1, z: 0 };

    vortexEnabled = false;
    vortexStrength = 0.4;
    vortexRadius = 14.0;
    vortexCenter = { x: 32, y: 32 };

    // New volumetric fields
    curlEnabled = false;
    curlStrength = 0.6;
    curlScale = 0.02;      // spatial scale
    curlTime = 0.6;        // time evolution factor

    orbitEnabled = false;
    orbitStrength = 0.5;
    orbitRadius = 22.0;
    orbitAxis = 'z'; // 'x' | 'y' | 'z'

    waveEnabled = false;
    waveAmplitude = 0.35;
    waveScale = 0.12;     // spatial frequency
    waveSpeed = 1.2;
    waveAxis = 'y';       // 'x' | 'y' | 'z'

    // Audio
    audioEnabled = false;
    audioAttack = 0.5;
    audioRelease = 0.2;
    audioSensitivity = 1.0;
    audioBassGain = 1.0;
    audioMidGain = 1.0;
    audioTrebleGain = 1.0;
    audioBeatBoost = 1.0;
    audioSubGain = 1.0;
    audioPresenceGain = 1.0;
    audioAirGain = 1.0;
    audioTextureGain = 1.0;
    audioColorTilt = 1.0;
    audioSource = 'mic'; // 'mic' | 'file'
    __onAudioUpload = null;
    // Runtime audio features (read-only; set by app)
    _audioLevel = 0.0; _audioBeat = 0.0; _audioBass = 0.0; _audioMid = 0.0; _audioTreble = 0.0;
    _audioLowMid = 0.0; _audioHighMid = 0.0;
    _audioSub = 0.0; _audioPresence = 0.0; _audioAir = 0.0;
    _audioTilt = 0.0; _audioRoughness = 0.0; _audioTransient = 0.0; _audioBrightness = 0.0;
    _audioTempoPhase = 0.0; _audioTempoBpm = 0.0; _audioTempoConf = 0.0;

    // Post FX extras
    postFxEnabled = true;
    vignetteEnabled = false;
    vignetteAmount = 0.25;
    grainEnabled = false;
    grainAmount = 0.08;
    chromaEnabled = false;
    chromaAmount = 0.0025;
    // Motion blur (temporal screen direction approx)
    motionBlurEnabled = false;
    motionBlurAmount = 0.35;
    // Color grade controls
    postSaturation = 1.0;
    postContrast = 1.0;
    postLift = 0.0;
    // Anti-aliasing
    aaMode = 'off'; // 'off' | 'fxaa' | 'smaa' | 'traa'
    aaAmount = 1.0;
    // GTAO
    gtaoEnabled = false;
    gtaoRadius = 0.25;
    gtaoThickness = 1.0;
    gtaoDistanceExponent = 1.0;
    gtaoScale = 1.0;
    gtaoSamples = 16;
    gtaoResolutionScale = 1.0;
    // SSGI
    ssgiEnabled = false;
    ssgiSlices = 2;
    ssgiSteps = 8;
    ssgiIntensity = 0.6;
    ssgiResolutionScale = 1.0;
    ssgiDenoise = true;
    // SSR
    ssrEnabled = false;
    ssrOpacity = 0.2;
    ssrMaxDistance = 1.0;
    ssrThickness = 0.1;
    ssrResolutionScale = 0.75;
    ssrMetalness = 0.8;

    constructor(info) {
        if (mobile()) {
            this.maxParticles = 8192 * 8;
            this.particles = 4096;
        }
        this.updateParams();

    }

    updateParams() {
        const level = Math.max(this.particles / 8192,1);
        const size = 1.6/Math.pow(level, 1/3);
        this.actualSize = size * this.size;
        this.restDensity = 0.25 * level * this.density;
    }

    setupGravitySensor() {
        if (this.gravitySensor) { return; }
        this.gravitySensor = new GravitySensor({ frequency: 60 });
        this.gravitySensor.addEventListener("reading", (e) => {
            this.gravitySensorReading.copy(this.gravitySensor).divideScalar(50);
            this.gravitySensorReading.setY(this.gravitySensorReading.y * -1);
        });
        this.gravitySensor.start();
    }

    init() {
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
        this.fpsGraph = stats.addBlade({
            view: 'fpsgraph',
            label: 'fps',
            rows: 2,
        });

        const settings = gui.addFolder({
            title: "settings",
            expanded: false,
        });
        settings.addBinding(this, "particles", { min: 4096, max: this.maxParticles, step: 4096 }).on('change', () => { this.updateParams(); });
        settings.addBinding(this, "size", { min: 0.5, max: 2, step: 0.1 }).on('change', () => { this.updateParams(); });
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
            value: this.renderMode,
        }).on('change', (ev) => { this.renderMode = ev.value; });
        rendering.addBlade({
            view: 'list',
            label: 'color',
            options: [
                { text: 'fluid', value: 'fluid' },
                { text: 'audio', value: 'audio' },
                { text: 'velocity', value: 'velocity' },
            ],
            value: this.colorMode,
        }).on('change', (ev) => { this.colorMode = ev.value; });
        // Bloom controls moved to Post FX panel
        rendering.addBinding(this, "points");
        rendering.addBinding(this, "worldScale", { min: 0.5, max: 3.0, step: 0.01, label: 'world scale' });
        rendering.addBinding(this, "autoWorldFit", { label: 'auto fit world' });
        rendering.addBlade({
            view: 'list',
            label: 'fit',
            options: [
                { text: 'contain', value: 'contain' },
                { text: 'cover', value: 'cover' },
            ],
            value: this.fitMode,
        }).on('change', (ev) => { this.fitMode = ev.value; });
        rendering.addBinding(this, "zScale", { min: 0.05, max: 2.0, step: 0.01, label: 'z compress' });
        rendering.addBinding(this, "fitMargin", { min: 0.90, max: 1.0, step: 0.005, label: 'fit margin' });

        // World border behavior when boundaries are disabled
        rendering.addBlade({
            view: 'list',
            label: 'world border',
            options: [
                { text: 'bounce', value: 'bounce' },
                { text: 'wrap', value: 'wrap' },
            ],
            value: this.borderMode || 'bounce',
        }).on('change', (ev) => { this.borderMode = ev.value; });

        // DOF controls moved under Post FX
        const dofMacro = () => {
            this.zScale = 0.18;
            this.dofEnabled = true;
            this.dofHighQuality = true;
            this.dofAutoFocus = true;
            this.dofRange = 0.06;
            this.dofAmount = 1.30;
            this.fov = Math.max(60, this.fov);
            this.updateParams();
            if (this.gui) this.gui.refresh();
        };

        const perf = settings.addFolder({ title: 'performance', expanded: false });
        perf.addBinding(this, 'autoPerf', { label: 'auto adjust' });
        perf.addBinding(this, 'perfMinFps', { min: 20, max: 80, step: 1, label: 'min fps' });
        perf.addBinding(this, 'perfMaxFps', { min: 30, max: 120, step: 1, label: 'max fps' });
        perf.addBinding(this, 'perfStep', { min: 1024, max: 16384, step: 1024, label: 'step' });

        const camera = settings.addFolder({
            title: "camera",
            expanded: false,
        });
        camera.addBinding(this, "fov", { min: 30, max: 100, step: 1 });
        // Lens controls (approximate mapping to DOF params)
        const lens = settings.addFolder({ title: 'lens & dof', expanded: false });
        this.lensEnabled = false;
        this.sensorWidth = 36.0; // mm (full-frame)
        this.focalLength = 24.0; // mm
        this.fStop = 1.8;
        this.lensDriveFov = true;
        this.focusSmooth = 0.2;
        lens.addBinding(this, 'lensEnabled', { label: 'enable' });
        lens.addBinding(this, 'sensorWidth', { min: 12.0, max: 70.0, step: 0.1, label: 'sensor (mm)' });
        lens.addBinding(this, 'focalLength', { min: 8.0, max: 120.0, step: 0.1, label: 'focal (mm)' });
        lens.addBinding(this, 'fStop', { min: 0.7, max: 16.0, step: 0.1, label: 'f‑stop' });
        lens.addBinding(this, 'lensDriveFov', { label: 'drive FOV' });
        lens.addBinding(this, 'focusSmooth', { min: 0.0, max: 0.9, step: 0.01, label: 'focus smooth' });
        // DOF controls (moved here)
        lens.addBinding(this, 'dofEnabled', { label: 'dof enable' });
        lens.addBinding(this, 'dofAutoFocus', { label: 'auto focus (pointer)' });
        lens.addBinding(this, 'dofHighQuality', { label: 'high quality' });
        lens.addBinding(this, 'dofFocus', { min: 0.1, max: 3.0, step: 0.01 });
        lens.addBinding(this, 'dofRange', { min: 0.02, max: 2.0, step: 0.01 });
        lens.addBinding(this, 'dofAmount', { min: 0.0, max: 2.0, step: 0.01 });
        // DOF quality (0.25..1.0)
        this.dofQuality = 1.0;
        lens.addBinding(this, 'dofQuality', { min: 0.25, max: 1.0, step: 0.01, label: 'dof quality' });
        lens.addBlade({ view: 'button', label: 'macro', title: 'Macro Shot' }).on('click', dofMacro);
        // Advanced bokeh controls
        this.dofNearBoost = this.dofNearBoost ?? 1.0;
        this.dofFarBoost = this.dofFarBoost ?? 1.0;
        this.dofHighlightThreshold = this.dofHighlightThreshold ?? 0.8;
        this.dofHighlightGain = this.dofHighlightGain ?? 0.6;
        lens.addBinding(this, 'dofNearBoost', { min: 0.5, max: 3.0, step: 0.01, label: 'near boost' });
        lens.addBinding(this, 'dofFarBoost', { min: 0.5, max: 3.0, step: 0.01, label: 'far boost' });
        lens.addBinding(this, 'dofHighlightThreshold', { min: 0.0, max: 1.0, step: 0.01, label: 'hi thresh' });
        lens.addBinding(this, 'dofHighlightGain', { min: 0.0, max: 2.0, step: 0.01, label: 'hi gain' });
        // Aperture & anamorphic
        this.apertureBlades = 7; // polygon blades
        this.apertureRotation = 0.0; // radians
        this.aperturePetal = 1.0; // sharpness of polygon weighting
        this.anamorphic = 0.0; // -1..1 (negative vertical, positive horizontal)
        lens.addBinding(this, 'apertureBlades', { min: 3, max: 12, step: 1, label: 'blades' });
        lens.addBinding(this, 'apertureRotation', { min: -3.1416, max: 3.1416, step: 0.01, label: 'apert rot' });
        lens.addBinding(this, 'aperturePetal', { min: 0.2, max: 2.5, step: 0.01, label: 'apert petal' });
        lens.addBinding(this, 'anamorphic', { min: -1.0, max: 1.0, step: 0.01, label: 'anamorphic' });
        // Creative presets
        lens.addBlade({ view: 'button', label: 'preset', title: 'Creamy Wide' }).on('click', () => {
            this.lensEnabled = true; this.lensDriveFov = true;
            this.sensorWidth = 36.0; this.focalLength = 24.0; this.fStop = 1.4;
            this.dofEnabled = true; this.dofAutoFocus = true; this.dofHighQuality = true;
            this.dofRange = 0.06; this.dofAmount = 1.4; this.dofFarBoost = 2.2; this.dofNearBoost = 1.2;
            this.dofHighlightThreshold = 0.8; this.dofHighlightGain = 1.1; this.focusSmooth = 0.25;
            if (this.gui) this.gui.refresh();
        });

        const environment = settings.addFolder({
            title: "environment",
            expanded: false,
        });
        environment.addBinding(this, "envIntensity", { min: 0.0, max: 5.0, step: 0.05 });
        environment.addBinding(this, "exposure", { min: 0.0, max: 2.0, step: 0.01 });
        environment.addBinding(this, "bgRotY", { label: 'bg rot Y', min: -Math.PI, max: Math.PI, step: 0.01 });
        environment.addBinding(this, "envRotY", { label: 'env rot Y', min: -Math.PI, max: Math.PI, step: 0.01 });

        const boundary = settings.addFolder({
            title: "boundary",
            expanded: false,
        });
        boundary.addBinding(this, 'boundariesEnabled', { label: 'enable' });
        boundary.addBlade({
            view: 'list',
            label: 'shape',
            options: [
                { text: 'dodecahedron', value: 'dodeca' },
                { text: 'cube', value: 'cube' },
                { text: 'sphere', value: 'sphere' },
            ],
            value: this.boundaryShape,
        }).on('change', (ev) => { this.boundaryShape = ev.value; });
        boundary.addBinding(this, "glassIor", { min: 1.0, max: 2.6, step: 0.01 });
        boundary.addBinding(this, "glassThickness", { min: 0.0, max: 2.0, step: 0.01 });
        boundary.addBinding(this, "glassRoughness", { min: 0.0, max: 0.5, step: 0.005 });
        boundary.addBinding(this, "glassDispersion", { min: 0.0, max: 1.0, step: 0.01 });
        boundary.addBinding(this, "glassAttenuationDistance", { min: 0.1, max: 10.0, step: 0.1 });
        boundary.addBinding(this, "glassAttenuationColor", { view: 'color' });
        boundary.addBinding(this, "collisionShrink", { min: 0.90, max: 1.00, step: 0.001, label: 'collision shrink' });
        boundary.addBinding(this, "collisionRestitution", { min: 0.0, max: 1.5, step: 0.01, label: 'restitution' });
        boundary.addBinding(this, "collisionFriction", { min: 0.0, max: 1.0, step: 0.01, label: 'friction' });
        boundary.addBlade({ view: 'button', label: 'upload', title: 'Choose Model' }).on('click', () => {
            if (this.__onBoundaryUpload) this.__onBoundaryUpload();
        });

        const simulation = settings.addFolder({
            title: "simulation",
            expanded: false,
        });
        simulation.addBinding(this, "run");
        simulation.addBinding(this, "noise", { min: 0, max: 2, step: 0.01 });
        simulation.addBinding(this, "speed", { min: 0.1, max: 2, step: 0.1 });
        simulation.addBinding(this, "substeps", { min: 1, max: 8, step: 1 });
        simulation.addBinding(this, "apicBlend", { min: 0, max: 1, step: 0.05 });
        simulation.addBinding(this, "physMaxVelocity", { min: 0.5, max: 6.0, step: 0.1, label: 'max velocity' });
        simulation.addBinding(this, "cflSafety", { min: 0.05, max: 1.0, step: 0.01, label: 'dt safety' });
        simulation.addBinding(this, "vorticityEnabled", { label: 'vorticity' });
        simulation.addBinding(this, "vorticityEps", { min: 0.0, max: 0.8, step: 0.01, label: 'vort strength' });
        simulation.addBinding(this, "xsphEnabled", { label: 'xsph smooth' });
        simulation.addBinding(this, "xsphEps", { min: 0.0, max: 0.5, step: 0.01, label: 'xsph strength' });
        simulation.addBinding(this, "sdfSphere", { label: 'sphere collision' });
        simulation.addBinding(this, "sdfCenterZ", { min: 4, max: 60, step: 1 });
        simulation.addBinding(this, "sdfRadius", { min: 4, max: 30, step: 1 });
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
                this.setupGravitySensor();
            }
            this.gravity = ev.value;
        });
        simulation.addBinding(this, "density", { min: 0.4, max: 2, step: 0.1 }).on('change', () => { this.updateParams(); });;
        simulation.addBinding(this, "stiffness", { min: 0.5, max: 10, step: 0.1 });
        simulation.addBinding(this, "dynamicViscosity", { min: 0.01, max: 0.5, step: 0.01 });

        const fields = settings.addFolder({ title: 'fields', expanded: false });
        const jet = fields.addFolder({ title: 'jet', expanded: false });
        jet.addBinding(this, 'jetEnabled', { label: 'enable' });
        jet.addBinding(this, 'jetStrength', { min: 0.0, max: 3.0, step: 0.01 });
        jet.addBinding(this, 'jetRadius', { min: 1.0, max: 32.0, step: 0.1 });
        jet.addBinding(this, 'jetPos', { x: { min: 0, max: 64, step: 1 }, y: { min: 0, max: 64, step: 1 }, z: { min: 0, max: 64, step: 1 } });
        jet.addBinding(this, 'jetDir', { x: { min: -1, max: 1, step: 0.01 }, y: { min: -1, max: 1, step: 0.01 }, z: { min: -1, max: 1, step: 0.01 } });

        const vortex = fields.addFolder({ title: 'vortex', expanded: false });
        vortex.addBinding(this, 'vortexEnabled', { label: 'enable' });
        vortex.addBinding(this, 'vortexStrength', { min: 0.0, max: 3.0, step: 0.01 });
        vortex.addBinding(this, 'vortexRadius', { min: 1.0, max: 64.0, step: 0.1 });
        vortex.addBinding(this, 'vortexCenter', { x: { min: 0, max: 64, step: 1 }, y: { min: 0, max: 64, step: 1 } });

        const turb = fields.addFolder({ title: 'curl turbulence', expanded: false });
        turb.addBinding(this, 'curlEnabled', { label: 'enable' });
        turb.addBinding(this, 'curlStrength', { min: 0.0, max: 3.0, step: 0.01, label: 'strength' });
        turb.addBinding(this, 'curlScale', { min: 0.002, max: 0.08, step: 0.001, label: 'scale' });
        turb.addBinding(this, 'curlTime', { min: 0.05, max: 3.0, step: 0.01, label: 'time' });

        const orbit = fields.addFolder({ title: 'orbit', expanded: false });
        orbit.addBinding(this, 'orbitEnabled', { label: 'enable' });
        orbit.addBinding(this, 'orbitStrength', { min: 0.0, max: 3.0, step: 0.01, label: 'strength' });
        orbit.addBinding(this, 'orbitRadius', { min: 4.0, max: 64.0, step: 0.1, label: 'radius' });
        orbit.addBlade({
            view: 'list',
            label: 'axis',
            options: [
                { text: 'x', value: 'x' },
                { text: 'y', value: 'y' },
                { text: 'z', value: 'z' },
            ],
            value: this.orbitAxis,
        }).on('change', (ev) => { this.orbitAxis = ev.value; });

        const wave = fields.addFolder({ title: 'wave', expanded: false });
        wave.addBinding(this, 'waveEnabled', { label: 'enable' });
        wave.addBinding(this, 'waveAmplitude', { min: 0.0, max: 2.0, step: 0.01, label: 'amplitude' });
        wave.addBinding(this, 'waveScale', { min: 0.02, max: 1.0, step: 0.01, label: 'scale' });
        wave.addBinding(this, 'waveSpeed', { min: 0.1, max: 4.0, step: 0.01, label: 'speed' });
        wave.addBlade({
            view: 'list',
            label: 'axis',
            options: [
                { text: 'x', value: 'x' },
                { text: 'y', value: 'y' },
                { text: 'z', value: 'z' },
            ],
            value: this.waveAxis,
        }).on('change', (ev) => { this.waveAxis = ev.value; });

        // Audio controls moved to dedicated AudioPanel (src/ui/audioPanel.js)

        // Post FX unified panel
        const fx = settings.addFolder({ title: 'post fx', expanded: false });
        // Master toggle
        fx.addBinding(this, 'postFxEnabled', { label: 'enable all' });
        // Bloom
        const fxBloom = fx.addFolder({ title: 'bloom', expanded: false });
        fxBloom.addBinding(this, "bloom", { label: 'enable' });
        fxBloom.addBinding(this, "bloomStrength", { min: 0, max: 2, step: 0.01 });
        fxBloom.addBinding(this, "bloomRadius", { min: 0, max: 1.2, step: 0.01 });
        fxBloom.addBinding(this, "bloomThreshold", { min: 0, max: 1, step: 0.001 });
        // Depth of field
        // DOF controls moved into Lens panel for cohesion
        // Vignette
        const fxVig = fx.addFolder({ title: 'vignette', expanded: false });
        fxVig.addBinding(this, 'vignetteEnabled', { label: 'enable' });
        fxVig.addBinding(this, 'vignetteAmount', { min: 0.0, max: 1.0, step: 0.01, label: 'amount' });
        // Grain
        const fxGrain = fx.addFolder({ title: 'grain', expanded: false });
        fxGrain.addBinding(this, 'grainEnabled', { label: 'enable' });
        fxGrain.addBinding(this, 'grainAmount', { min: 0.0, max: 0.5, step: 0.01, label: 'amount' });
        // Chromatic aberration
        const fxCA = fx.addFolder({ title: 'chroma ab', expanded: false });
        fxCA.addBinding(this, 'chromaEnabled', { label: 'enable' });
        fxCA.addBinding(this, 'chromaAmount', { min: 0.0, max: 0.01, step: 0.0001, label: 'amount' });
        this.chromaCenter = this.chromaCenter || { x: 0.5, y: 0.5 };
        this.chromaScale = this.chromaScale || 1.0;
        fxCA.addBinding(this, 'chromaCenter', { x: { min: 0.0, max: 1.0, step: 0.001 }, y: { min: 0.0, max: 1.0, step: 0.001 } });
        fxCA.addBinding(this, 'chromaScale', { min: 0.2, max: 3.0, step: 0.01, label: 'scale' });
        // Motion blur
        const fxMB = fx.addFolder({ title: 'motion blur', expanded: false });
        fxMB.addBinding(this, 'motionBlurEnabled', { label: 'enable' });
        fxMB.addBinding(this, 'motionBlurAmount', { min: 0.0, max: 1.0, step: 0.01, label: 'amount' });
        // Grading
        const fxGrade = fx.addFolder({ title: 'grading', expanded: false });
        fxGrade.addBinding(this, 'postSaturation', { min: 0.0, max: 2.0, step: 0.01, label: 'saturation' });
        fxGrade.addBinding(this, 'postContrast', { min: 0.5, max: 2.0, step: 0.01, label: 'contrast' });
        fxGrade.addBinding(this, 'postLift', { min: -0.3, max: 0.3, step: 0.005, label: 'lift' });
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
            value: this.aaMode,
        }).on('change', (ev) => { this.aaMode = ev.value; });
        fxAA.addBinding(this, 'aaAmount', { min: 0.2, max: 2.0, step: 0.05, label: 'amount' });
        // Ambient Occlusion (GTAO)
        const fxAO = fx.addFolder({ title: 'ambient occlusion', expanded: false });
        fxAO.addBinding(this, 'gtaoEnabled', { label: 'enable' });
        fxAO.addBinding(this, 'gtaoRadius', { min: 0.05, max: 2.0, step: 0.01, label: 'radius' });
        fxAO.addBinding(this, 'gtaoThickness', { min: 0.1, max: 4.0, step: 0.1, label: 'thickness' });
        fxAO.addBinding(this, 'gtaoDistanceExponent', { min: 0.5, max: 3.0, step: 0.05, label: 'distance exp' });
        fxAO.addBinding(this, 'gtaoScale', { min: 0.1, max: 2.0, step: 0.05, label: 'scale' });
        fxAO.addBinding(this, 'gtaoSamples', { min: 4, max: 32, step: 1, label: 'samples' });
        fxAO.addBinding(this, 'gtaoResolutionScale', { min: 0.25, max: 1.0, step: 0.05, label: 'res scale' });
        // Global Illumination (SSGI)
        const fxGI = fx.addFolder({ title: 'global illumination', expanded: false });
        fxGI.addBinding(this, 'ssgiEnabled', { label: 'enable' });
        fxGI.addBinding(this, 'ssgiSlices', { min: 1, max: 4, step: 1, label: 'slices' });
        fxGI.addBinding(this, 'ssgiSteps', { min: 1, max: 32, step: 1, label: 'steps' });
        fxGI.addBinding(this, 'ssgiIntensity', { min: 0.0, max: 2.0, step: 0.01, label: 'intensity' });
        fxGI.addBinding(this, 'ssgiResolutionScale', { min: 0.25, max: 1.0, step: 0.05, label: 'res scale' });
        fxGI.addBinding(this, 'ssgiDenoise', { label: 'denoise' });
        // Reflections (SSR)
        const fxSSR = fx.addFolder({ title: 'reflections', expanded: false });
        fxSSR.addBinding(this, 'ssrEnabled', { label: 'enable' });
        fxSSR.addBinding(this, 'ssrOpacity', { min: 0.0, max: 1.0, step: 0.01, label: 'opacity' });
        fxSSR.addBinding(this, 'ssrMaxDistance', { min: 0.1, max: 4.0, step: 0.05, label: 'max dist' });
        fxSSR.addBinding(this, 'ssrThickness', { min: 0.01, max: 1.0, step: 0.01, label: 'thickness' });
        fxSSR.addBinding(this, 'ssrResolutionScale', { min: 0.25, max: 1.0, step: 0.05, label: 'res scale' });
        fxSSR.addBinding(this, 'ssrMetalness', { min: 0.0, max: 1.0, step: 0.01, label: 'metalness' });

        /*settings.addBinding(this, "roughness", { min: 0.0, max: 1, step: 0.01 });
        settings.addBinding(this, "metalness", { min: 0.0, max: 1, step: 0.01 });*/

        // Presets
        const presets = gui.addFolder({
            title: 'presets',
            expanded: false,
        });
        // Built-in presets
        this._builtinPresetName = 'Photo Mode';
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
            value: this._builtinPresetName,
        }).on('change', (ev) => {
            this._builtinPresetName = ev.value;
            this.applyPreset(ev.value);
        });
        presets.addBlade({ view: 'button', label: 'startup', title: 'Save Current as Startup' }).on('click', () => {
            const data = this._exportPreset();
            try {
                localStorage.setItem('flow.startPreset', JSON.stringify(data));
            } catch {}
        });
        presets.addBlade({ view: 'button', label: 'save', title: 'Save Preset' }).on('click', () => {
            const data = this._exportPreset();
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
                    this._importPreset(data);
                } catch (e) {
                    console.error(e);
                }
            };
            input.click();
        });

        this.gui = gui;

        // Apply startup preset (localStorage overrides default)
        let start = null;
        try {
            const s = localStorage.getItem('flow.startPreset');
            if (s) start = JSON.parse(s);
        } catch {}
        if (start) {
            this._importPreset(start);
        } else {
            // Default to Audio Showcase for a compelling sound-reactive startup
            this.applyPreset('Audio Showcase');
        }
    }

    registerBoundaryUpload(handler) {
        this.__onBoundaryUpload = handler;
    }

    registerAudioUpload(handler) {
        this.__onAudioUpload = handler;
    }

    registerRouter(router) {
        this.__router = router;
        // Apply any pending routing preset captured during early preset load
        if (this.__routerPreset) {
            try { this.__router.fromJSON(this.__routerPreset); } catch {}
            this.__routerPreset = null;
        }
    }

    update() {
    }

    begin() {
        this.fpsGraph.begin();
    }
    end() {
        this.fpsGraph.end();
    }

    _exportPreset() {
        // Whitelist of presettable fields
        const keys = [
            'particles','size','points','bloom','bloomStrength','bloomRadius','bloomThreshold',
            'worldScale','autoWorldFit','fitMode','fitMargin','zScale','borderMode','dofEnabled','dofHighQuality','dofFocus','dofRange','dofAmount','dofNearBoost','dofFarBoost','dofHighlightThreshold','dofHighlightGain','colorMode',
            'fov','envIntensity','exposure','bgRotY','envRotY',
            'boundariesEnabled','boundaryShape','glassIor','glassThickness','glassRoughness','glassDispersion','glassAttenuationDistance','glassAttenuationColor','collisionShrink','collisionRestitution','collisionFriction',
            'run','noise','speed','substeps','apicBlend','physMaxVelocity','cflSafety','vorticityEnabled','vorticityEps','xsphEnabled','xsphEps','sdfSphere','sdfCenterZ','sdfRadius','gravity','density','stiffness','dynamicViscosity',
            'jetEnabled','jetStrength','jetRadius','jetPos','jetDir','vortexEnabled','vortexStrength','vortexRadius','vortexCenter',
            'curlEnabled','curlStrength','curlScale','curlTime',
            'orbitEnabled','orbitStrength','orbitRadius','orbitAxis',
            'waveEnabled','waveAmplitude','waveScale','waveSpeed','waveAxis',
            'audioEnabled','audioSource','audioSensitivity','audioAttack','audioRelease','audioBassGain','audioMidGain','audioTrebleGain','audioBeatBoost',
            'audioSubGain','audioPresenceGain','audioAirGain','audioTextureGain','audioColorTilt',
            'vignetteEnabled','vignetteAmount','grainEnabled','grainAmount','chromaEnabled','chromaAmount','motionBlurEnabled','motionBlurAmount','postSaturation','postContrast','postLift','aaMode','aaAmount','gtaoEnabled','gtaoRadius','gtaoThickness','gtaoDistanceExponent','gtaoScale','gtaoSamples','gtaoResolutionScale','ssgiEnabled','ssgiSlices','ssgiSteps','ssgiIntensity','ssgiResolutionScale','ssgiDenoise','ssrEnabled','ssrOpacity','ssrMaxDistance','ssrThickness','ssrResolutionScale','ssrMetalness','lensEnabled','sensorWidth','focalLength','fStop','lensDriveFov','focusSmooth','dofQuality','apertureBlades','apertureRotation','aperturePetal','anamorphic'
        ];
        const out = {};
        keys.forEach(k => { out[k] = this[k]; });
        // Include audio routing config if present
        try {
            const r = this.__router ? this.__router.toJSON() : (this.__routerPreset || null);
            if (r) out.audioRouting = r;
        } catch {}
        return out;
    }

    _importPreset(data) {
        if (!data || typeof data !== 'object') return;
        const apply = (k, v) => {
            if (v === undefined) return;
            if (k === 'glassAttenuationColor' && v && typeof v === 'object') {
                const r = Math.max(0, Math.min(255, v.r|0));
                const g = Math.max(0, Math.min(255, v.g|0));
                const b = Math.max(0, Math.min(255, v.b|0));
                this[k] = { r, g, b };
            } else {
                this[k] = v;
            }
        };
        Object.keys(data).forEach(k => apply(k, data[k]));
        // Apply router config if provided
        if (data.audioRouting) {
            if (this.__router && this.__router.fromJSON) {
                try { this.__router.fromJSON(data.audioRouting); } catch {}
            } else {
                // Store for later when router is registered
                this.__routerPreset = data.audioRouting;
            }
        }
        this.updateParams();
        if (this.gui) this.gui.refresh();
    }

    applyPreset(name) {
        const p = this._builtinPresets()[name];
        if (!p) return;
        this._importPreset(p);
    }

    // Lens mapping moved into LensPipeline

    _builtinPresets() {
        // Carefully chosen combos for varied visuals
        return {
            'Photo Mode': {
                worldScale: 2.0,
                boundariesEnabled: false,
                renderMode: 'surface',
                bloom: true, bloomStrength: 1.2, bloomRadius: 1.0, bloomThreshold: 0.0005,
                dofEnabled: true, dofFocus: 1.1, dofRange: 0.25, dofAmount: 0.85,
                fov: 60, exposure: 0.66, envIntensity: 0.9,
                gravity: 2, speed: 1.6, density: 1.4, substeps: 2, apicBlend: 0.2,
                particles: 8192 * 4,
            },
            'Glass Dodeca': {
                boundariesEnabled: true, boundaryShape: 'dodeca',
                glassIor: 1.52, glassThickness: 0.38, glassRoughness: 0.04, glassDispersion: 0.28,
                bloom: true, bloomStrength: 0.9, bloomRadius: 0.9, bloomThreshold: 0.001,
                dofEnabled: true, dofFocus: 1.2, dofRange: 0.35, dofAmount: 0.7,
                worldScale: 1.3, renderMode: 'surface', gravity: 1, speed: 1.2, density: 1.0,
            },
            'Glyph Motion': {
                renderMode: 'glyphs', worldScale: 1.8,
                bloom: true, bloomStrength: 0.8, bloomRadius: 0.8, bloomThreshold: 0.002,
                dofEnabled: true, dofFocus: 1.0, dofRange: 0.2, dofAmount: 0.8,
                boundariesEnabled: false, gravity: 0, speed: 1.4, density: 1.1, apicBlend: 0.35,
            },
            'Points Storm': {
                renderMode: 'points', particles: 8192 * 8, size: 0.9,
                bloom: false, dofEnabled: false,
                worldScale: 2.2, boundariesEnabled: false, gravity: 3, speed: 1.5, density: 0.9,
            },
            'Sphere Tank': {
                boundariesEnabled: true, boundaryShape: 'sphere', sdfSphere: true, sdfRadius: 18, sdfCenterZ: 20,
                worldScale: 1.2, renderMode: 'surface',
                bloom: true, bloomStrength: 0.7, bloomRadius: 0.6, bloomThreshold: 0.002,
                dofEnabled: false, gravity: 1, speed: 1.0, density: 1.2,
            },
            'Vortex Jet': {
                boundariesEnabled: false, worldScale: 1.8,
                jetEnabled: true, jetStrength: 1.0, jetRadius: 10.0, jetPos: { x: 20, y: 54, z: 28 }, jetDir: { x: 0, y: -1, z: 0 },
                vortexEnabled: true, vortexStrength: 0.8, vortexRadius: 22.0, vortexCenter: { x: 32, y: 32 },
                bloom: true, bloomStrength: 1.1, bloomRadius: 0.9, bloomThreshold: 0.001,
                dofEnabled: true, dofFocus: 1.05, dofRange: 0.3, dofAmount: 0.75,
                gravity: 0, speed: 1.8, density: 1.1,
            },
            'Bass Jet': {
                audioEnabled: true, audioSource: 'mic', audioSensitivity: 1.3,
                audioBassGain: 1.6, audioMidGain: 0.9, audioTrebleGain: 0.6, audioBeatBoost: 1.2,
                boundariesEnabled: false, worldScale: 1.7,
                jetEnabled: true, jetStrength: 0.9, jetRadius: 12.0, jetPos: { x: 32, y: 58, z: 28 }, jetDir: { x: 0, y: -1, z: 0 },
                vortexEnabled: false,
                apicBlend: 0.25, physMaxVelocity: 2.6, cflSafety: 0.5,
                bloom: true, bloomStrength: 1.0, bloomRadius: 0.9, bloomThreshold: 0.0015,
                dofEnabled: true, dofFocus: 1.0, dofRange: 0.22, dofAmount: 0.85,
                gravity: 0, speed: 1.7, density: 1.2,
            },
            'Dance Surface': {
                audioEnabled: true, audioSource: 'mic', audioSensitivity: 1.1,
                audioBassGain: 1.2, audioMidGain: 1.4, audioTrebleGain: 1.0, audioBeatBoost: 1.1,
                boundariesEnabled: false, renderMode: 'surface', worldScale: 2.0,
                jetEnabled: false, vortexEnabled: true, vortexStrength: 0.9, vortexRadius: 20.0, vortexCenter: { x: 32, y: 32 },
                apicBlend: 0.35, physMaxVelocity: 2.8, cflSafety: 0.5,
                bloom: true, bloomStrength: 0.9, bloomRadius: 0.9, bloomThreshold: 0.002,
                dofEnabled: true, dofFocus: 1.0, dofRange: 0.25, dofAmount: 0.8,
                gravity: 0, speed: 1.8, density: 1.1,
            },
            'Audio Showcase': {
                audioEnabled: true, audioSource: 'mic', audioSensitivity: 1.2,
                // Volumetric fields
                curlEnabled: true, curlStrength: 0.9, curlScale: 0.026, curlTime: 0.8,
                orbitEnabled: true, orbitAxis: 'z', orbitRadius: 22.0, orbitStrength: 0.8,
                waveEnabled: true, waveAxis: 'y', waveAmplitude: 0.45, waveScale: 0.12, waveSpeed: 1.2,
                // Classic fields
                jetEnabled: true, jetStrength: 0.8, jetRadius: 12.0, jetPos: { x: 32, y: 58, z: 28 }, jetDir: { x: 0, y: -1, z: 0 },
                vortexEnabled: true, vortexStrength: 0.7, vortexRadius: 20.0, vortexCenter: { x: 32, y: 32 },
                // Visuals
                renderMode: 'surface', worldScale: 2.0,
                bloom: true, bloomStrength: 1.0, bloomRadius: 0.9, bloomThreshold: 0.0013,
                dofEnabled: true, dofFocus: 1.05, dofRange: 0.24, dofAmount: 0.85,
                gravity: 0, speed: 1.7, density: 1.2,
            },
            'Nebula Curl': {
                audioEnabled: true, audioSource: 'mic', audioSensitivity: 1.2,
                curlEnabled: true, curlStrength: 1.0, curlScale: 0.028, curlTime: 0.8,
                orbitEnabled: false,
                waveEnabled: false,
                renderMode: 'surface', worldScale: 1.9,
                vorticityEnabled: true, vorticityEps: 0.18, xsphEnabled: true, xsphEps: 0.06,
                bloom: true, bloomStrength: 1.0, bloomRadius: 0.9, bloomThreshold: 0.0015,
                dofEnabled: true, dofFocus: 1.1, dofRange: 0.22, dofAmount: 0.85,
                gravity: 0, speed: 1.6, density: 1.2,
            },
            'Orbit Dance': {
                audioEnabled: true, audioSource: 'mic', audioSensitivity: 1.1,
                orbitEnabled: true, orbitAxis: 'z', orbitRadius: 24.0, orbitStrength: 0.9,
                curlEnabled: true, curlStrength: 0.6, curlScale: 0.02, curlTime: 0.7,
                waveEnabled: false,
                renderMode: 'glyphs', worldScale: 1.8,
                bloom: true, bloomStrength: 0.9, bloomRadius: 0.9, bloomThreshold: 0.001,
                dofEnabled: true, dofFocus: 1.0, dofRange: 0.25, dofAmount: 0.8,
                gravity: 0, speed: 1.7, density: 1.1,
            },
            'Beat Waves': {
                audioEnabled: true, audioSource: 'mic', audioSensitivity: 1.2,
                waveEnabled: true, waveAxis: 'y', waveAmplitude: 0.5, waveScale: 0.14, waveSpeed: 1.2,
                orbitEnabled: true, orbitAxis: 'y', orbitRadius: 18.0, orbitStrength: 0.6,
                curlEnabled: false,
                renderMode: 'surface', worldScale: 2.0,
                bloom: true, bloomStrength: 0.95, bloomRadius: 0.9, bloomThreshold: 0.001,
                dofEnabled: true, dofFocus: 1.0, dofRange: 0.22, dofAmount: 0.8,
                gravity: 0, speed: 1.6, density: 1.2,
            },
            'Bass Storm': {
                audioEnabled: true, audioSource: 'mic', audioSensitivity: 1.3,
                jetEnabled: true, jetStrength: 1.0, jetRadius: 14.0, jetPos: { x: 32, y: 56, z: 28 }, jetDir: { x: 0, y: -1, z: 0 },
                vortexEnabled: true, vortexStrength: 0.6, vortexRadius: 18.0, vortexCenter: { x: 32, y: 32 },
                curlEnabled: true, curlStrength: 0.7, curlScale: 0.024, curlTime: 0.8,
                waveEnabled: false,
                renderMode: 'surface', worldScale: 1.9,
                bloom: true, bloomStrength: 1.1, bloomRadius: 0.95, bloomThreshold: 0.001,
                dofEnabled: true, dofFocus: 1.05, dofRange: 0.2, dofAmount: 0.85,
                gravity: 0, speed: 1.8, density: 1.25,
            },
            'Perc Glitch': {
                audioEnabled: true, audioSource: 'mic', audioSensitivity: 1.0,
                waveEnabled: true, waveAxis: 'x', waveAmplitude: 0.65, waveScale: 0.18, waveSpeed: 1.4,
                curlEnabled: true, curlStrength: 0.5, curlScale: 0.03, curlTime: 1.2,
                orbitEnabled: false,
                renderMode: 'glyphs', worldScale: 1.7,
                bloom: true, bloomStrength: 0.9, bloomRadius: 0.85, bloomThreshold: 0.0015,
                dofEnabled: false,
                gravity: 0, speed: 1.9, density: 1.1,
            },
            'Ambient Wash': {
                audioEnabled: true, audioSource: 'mic', audioSensitivity: 0.9,
                curlEnabled: true, curlStrength: 0.5, curlScale: 0.022, curlTime: 0.6,
                orbitEnabled: true, orbitAxis: 'y', orbitRadius: 28.0, orbitStrength: 0.5,
                waveEnabled: true, waveAxis: 'z', waveAmplitude: 0.25, waveScale: 0.09, waveSpeed: 0.9,
                renderMode: 'surface', worldScale: 2.0,
                bloom: true, bloomStrength: 0.8, bloomRadius: 0.8, bloomThreshold: 0.002,
                dofEnabled: true, dofFocus: 1.2, dofRange: 0.3, dofAmount: 0.7,
                gravity: 0, speed: 1.4, density: 1.1,
            },
            'Chillwave Drift': {
                audioEnabled: true, audioSource: 'mic', audioSensitivity: 1.0,
                orbitEnabled: true, orbitAxis: 'z', orbitRadius: 26.0, orbitStrength: 0.6,
                curlEnabled: true, curlStrength: 0.6, curlScale: 0.024, curlTime: 0.7,
                waveEnabled: true, waveAxis: 'y', waveAmplitude: 0.35, waveScale: 0.12, waveSpeed: 1.0,
                renderMode: 'surface', worldScale: 2.1,
                bloom: true, bloomStrength: 0.9, bloomRadius: 0.9, bloomThreshold: 0.001,
                dofEnabled: true, dofFocus: 1.1, dofRange: 0.28, dofAmount: 0.75,
                gravity: 0, speed: 1.6, density: 1.15,
            },
            'Trance Swirl': {
                audioEnabled: true, audioSource: 'mic', audioSensitivity: 1.15,
                vortexEnabled: true, vortexStrength: 1.0, vortexRadius: 22.0, vortexCenter: { x: 32, y: 32 },
                orbitEnabled: true, orbitAxis: 'z', orbitRadius: 24.0, orbitStrength: 0.8,
                curlEnabled: false,
                waveEnabled: true, waveAxis: 'y', waveAmplitude: 0.4, waveScale: 0.12, waveSpeed: 1.4,
                renderMode: 'surface', worldScale: 2.0,
                bloom: true, bloomStrength: 1.0, bloomRadius: 0.95, bloomThreshold: 0.0012,
                dofEnabled: true, dofFocus: 1.0, dofRange: 0.22, dofAmount: 0.8,
                gravity: 0, speed: 1.8, density: 1.2,
            },
        };
    }
}
export const conf = new Conf();
