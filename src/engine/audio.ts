import type * as THREE from 'three/webgpu';
import { SoundReactivity, type AudioData } from '../AUDIO/soundreactivity';
import { AudioReactiveBehavior } from '../AUDIO/audioreactive';
import { AudioVisualizationManager } from '../AUDIO/audiovisual';
import type { FlowConfig } from '../config';

export interface AudioSystem {
  sound?: SoundReactivity;
  behavior: AudioReactiveBehavior;
  visualization: AudioVisualizationManager;
  getAudioData: () => AudioData | null;
  dispose: () => void;
}

export interface AudioSetupOptions {
  renderer: THREE.WebGPURenderer;
  config: FlowConfig;
  gridSize: THREE.Vector3;
}

export async function setupAudio({ renderer, config, gridSize }: AudioSetupOptions): Promise<AudioSystem> {
  let sound: SoundReactivity | undefined;

  if (config.audio.enabled || config.audioReactive.enabled) {
    sound = new SoundReactivity(config.audio);
    if (config.audio.enabled) {
      try {
        await sound.init();
      } catch (error) {
        console.warn('Sound system initialization failed:', error);
      }
    }
  }

  const behavior = new AudioReactiveBehavior(renderer, config.audioReactive);
  const visualization = new AudioVisualizationManager(renderer, gridSize.clone());
  visualization.setMode(config.audioReactive.mode);

  const getAudioData = (): AudioData | null => {
    if (!sound || !config.audio.enabled) {
      return null;
    }
    return sound.getAudioData();
  };

  return {
    sound,
    behavior,
    visualization,
    getAudioData,
    dispose: () => {
      sound?.dispose();
      behavior.dispose();
      visualization.dispose();
    },
  };
}
