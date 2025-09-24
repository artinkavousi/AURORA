import AudioEngine from '../../../src/audio/audioEngine.js';
import { AudioRouter } from '../../../src/audio/router.js';
import AudioPanel from '../../../src/ui/audioPanel.js';
import { conf } from '../../../src/conf.js';

import { clamp01 } from '../utils/math.js';

export class AudioModule {
  constructor() {
    this.engine = new AudioEngine();
    this.router = new AudioRouter();
    this.panel = null;
    this._started = false;

    if (conf.registerRouter) {
      conf.registerRouter(this.router);
    }
  }

  async init() {
    this.panel = new AudioPanel(this.engine, conf, this.router);
    this.panel.init('bottom-right');
  }

  async update(delta, elapsed, environmentBase) {
    if (!conf.audioEnabled) {
      this._resetState(environmentBase);
      return;
    }

    try {
      await this._ensureSource();
      this.engine.setSmoothing(conf.audioAttack, conf.audioRelease);
      const features = this.engine.update(delta);
      const mapped = this._mapFeatures(features);
      this._writeBack(mapped);
      this.router.apply(this._routerPayload(features, mapped), conf, elapsed, environmentBase);
    } catch (error) {
      // The legacy application silently swallowed audio exceptions.
      // Keeping the behaviour avoids interrupting rendering on transient mic failures.
    }
  }

  async _ensureSource() {
    if (this._started) return;
    if (conf.audioSource === 'mic') {
      await this.engine.connectMic();
    }
    this._started = true;
  }

  _mapFeatures(features) {
    const sens = conf.audioSensitivity || 1;
    const bassGain = conf.audioBassGain * sens;
    const midGain = conf.audioMidGain * sens;
    const trebleGain = conf.audioTrebleGain * sens;

    return {
      level: clamp01(features.level * sens),
      beat: clamp01(features.beat * conf.audioBeatBoost),
      bass: clamp01(features.bass * bassGain),
      mid: clamp01(features.mid * midGain),
      treble: clamp01(features.treble * trebleGain),
      sub: clamp01((features.sub ?? features.bass) * bassGain),
      lowMid: clamp01((features.lowMid ?? features.mid) * midGain),
      highMid: clamp01((features.highMid ?? features.mid) * midGain),
      presence: clamp01((features.presence ?? features.treble) * trebleGain),
      air: clamp01((features.air ?? features.treble) * trebleGain),
      flux: Math.max(0, features.flux || 0),
      fluxNorm: clamp01(features.fluxNorm ?? 0),
      dynamics: clamp01(features.dynamics ?? 0),
      crest: clamp01(features.crest ?? 0),
      rms: clamp01(features.rms ?? 0),
      loudness: clamp01(features.loudness ?? features.level ?? 0),
      tilt: clamp01(features.tilt ?? 0.5),
      stereo: clamp01(features.stereo ?? 0.5),
      stereoSigned: Math.max(-1, Math.min(1, features.stereoSigned ?? 0)),
      stereoWidth: clamp01(features.stereoWidth ?? 0),
      dominant: clamp01(features.dominant ?? 0),
      beatConfidence: clamp01(features.beatConfidence ?? 0),
      tempoPhase: features.tempoPhase01 || 0,
      tempoBpm: features.tempoBpm || 0,
      tempoConf: features.tempoConf || 0,
      tempoNorm: clamp01(features.tempoNorm ?? 0),
    };
  }

  _writeBack(mapped) {
    conf._audioLevel = mapped.level;
    conf._audioBeat = mapped.beat;
    conf._audioBass = mapped.bass;
    conf._audioMid = mapped.mid;
    conf._audioTreble = mapped.treble;
    conf._audioSub = mapped.sub;
    conf._audioLowMid = mapped.lowMid;
    conf._audioHighMid = mapped.highMid;
    conf._audioPresence = mapped.presence;
    conf._audioAir = mapped.air;
    conf._audioFlux = mapped.flux;
    conf._audioFluxNorm = mapped.fluxNorm;
    conf._audioDynamics = mapped.dynamics;
    conf._audioCrest = mapped.crest;
    conf._audioRms = mapped.rms;
    conf._audioLoudness = mapped.loudness;
    conf._audioTilt = mapped.tilt;
    conf._audioStereo = mapped.stereo;
    conf._audioStereoSigned = mapped.stereoSigned;
    conf._audioStereoWidth = mapped.stereoWidth;
    conf._audioDominant = mapped.dominant;
    conf._audioBeatConfidence = mapped.beatConfidence;
    conf._audioTempoPhase = mapped.tempoPhase;
    conf._audioTempoBpm = mapped.tempoBpm;
    conf._audioTempoConf = mapped.tempoConf;
    conf._audioTempoNorm = mapped.tempoNorm;
  }

  _routerPayload(features, mapped) {
    return {
      level: mapped.level,
      beat: mapped.beat,
      bass: mapped.bass,
      mid: mapped.mid,
      treble: mapped.treble,
      sub: mapped.sub,
      lowMid: mapped.lowMid,
      highMid: mapped.highMid,
      presence: mapped.presence,
      air: mapped.air,
      centroid: features.centroid,
      tilt: features.tilt,
      tiltSigned: features.tiltSigned,
      flux: features.flux,
      fluxNorm: features.fluxNorm,
      fluxBass: features.fluxBass,
      fluxMid: features.fluxMid,
      fluxTreble: features.fluxTreble,
      beatConfidence: features.beatConfidence,
      rms: features.rms,
      loudness: features.loudness,
      crest: features.crest,
      dynamics: features.dynamics,
      stereo: features.stereo,
      stereoSigned: features.stereoSigned,
      stereoWidth: features.stereoWidth,
      dominant: features.dominant,
      tempoBpm: features.tempoBpm,
      tempoPhase01: features.tempoPhase01,
      tempoConf: features.tempoConf,
      tempoNorm: features.tempoNorm,
      tempoPulse: features.tempoPulse,
      bandEnergies: features.bandEnergies,
    };
  }

  _resetState(environmentBase) {
    conf._audioLevel = 0;
    conf._audioBeat = 0;
    conf._audioBass = 0;
    conf._audioMid = 0;
    conf._audioTreble = 0;
    conf._audioSub = 0;
    conf._audioLowMid = 0;
    conf._audioHighMid = 0;
    conf._audioPresence = 0;
    conf._audioAir = 0;
    conf._audioFlux = 0;
    conf._audioFluxNorm = 0;
    conf._audioDynamics = 0;
    conf._audioCrest = 0;
    conf._audioRms = 0;
    conf._audioLoudness = 0;
    conf._audioTilt = 0.5;
    conf._audioStereo = 0.5;
    conf._audioStereoSigned = 0;
    conf._audioStereoWidth = 0;
    conf._audioDominant = 0;
    conf._audioBeatConfidence = 0;
    conf._audioTempoPhase = 0;
    conf._audioTempoBpm = 0;
    conf._audioTempoConf = 0;
    conf._audioTempoNorm = 0;

    if (environmentBase) {
      conf.bgRotY = environmentBase.bg;
      conf.envRotY = environmentBase.env;
    }
  }
}
