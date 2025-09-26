import mobile from "is-mobile";
import * as THREE from "three/webgpu";

import { buildDashboard } from "./io/dashboard.js";

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
    audioSource = 'mic'; // 'mic' | 'file'
    __onAudioUpload = null;
    // Runtime audio features (read-only; set by app)
    _audioLevel = 0.0; _audioBeat = 0.0; _audioBass = 0.0; _audioMid = 0.0; _audioTreble = 0.0;
    _audioTempoPhase = 0.0; _audioTempoBpm = 0.0;

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
        return buildDashboard(this);
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
