import { Vector2 } from 'three/webgpu';
import { updateParticleParams, type FlowConfig } from '../config';
import { setupScenery } from './scenery';
import { setupPostFX } from './postfx';
import { setupPhysics } from './physics';
import { setupRenderers, ParticleRenderMode } from './renderers';
import { setupAudio } from './audio';
import type {
  EngineContext,
  EngineState,
  EngineModules,
  EngineUpdateParams,
  SceneGraphHooks,
} from './types';
import type { AudioData } from '../AUDIO/soundreactivity';

export interface PipelineInitOptions {
  renderer: THREE.WebGPURenderer;
  config: FlowConfig;
  hooks?: SceneGraphHooks;
  state?: Partial<EngineState>;
}

export async function init(context: EngineContext, options: PipelineInitOptions): Promise<void> {
  const { renderer, config, hooks = {}, state } = options;

  context.renderer = renderer;
  context.config = config;
  context.hooks = hooks;
  const initialSize = renderer.getSize(new Vector2());
  context.state.viewport = state?.viewport ?? { width: initialSize.x, height: initialSize.y };
  context.state.lastAudioData = state?.lastAudioData ?? null;
  context.state.preferredRenderMode =
    state?.preferredRenderMode ?? (config.rendering.points ? ParticleRenderMode.POINT : ParticleRenderMode.MESH);

  updateParticleParams(config);

  const scenery = await setupScenery({ renderer, config, hooks });
  context.modules.scenery = scenery;

  const postfx = await setupPostFX({ renderer, config, scenery });
  context.modules.postfx = postfx;

  const physics = await setupPhysics({ renderer, config, scenery });
  context.modules.physics = physics;

  const renderers = await setupRenderers({ config, physics, scenery });
  context.modules.renderers = renderers;
  context.state.preferredRenderMode = renderers.preferredMode;

  physics.updateViewport(context.state.viewport.width, context.state.viewport.height);
  renderers.manager.setSimulationTransform(physics.boundaries.getSimulationTransform());

  if (config.audio.enabled || config.audioReactive.enabled) {
    const audio = await setupAudio({ renderer, config, gridSize: physics.viewportGridSize });
    context.modules.audio = audio;
    physics.simulator.setAudioVisualizationMode(config.audioReactive.mode);
  }
}

export async function update(context: EngineContext, params: EngineUpdateParams): Promise<void> {
  const modules = requireModules(context.modules);
  modules.scenery.update(params.delta, params.elapsed);

  const audioData = updateAudio(context, modules, params);
  updateRenderer(context, modules, audioData);
  await updateSimulation(context, modules, params, audioData);
  await modules.postfx.render();
}

export async function dispose(context: EngineContext): Promise<void> {
  const modules = context.modules;
  modules.audio?.dispose();
  modules.renderers?.dispose();
  modules.physics?.dispose();
  modules.postfx?.dispose();
  modules.scenery?.dispose();

  context.modules = {};
  context.state.lastAudioData = null;
}

function requireModules(modules: Partial<EngineModules>): EngineModules {
  if (!modules.scenery || !modules.postfx || !modules.physics || !modules.renderers) {
    throw new Error('Engine not initialized');
  }
  return modules as EngineModules;
}

function updateAudio(
  context: EngineContext,
  modules: EngineModules,
  params: EngineUpdateParams,
): AudioData | null {
  const { config } = context;
  const { audio } = modules;
  const { boundaries } = modules.physics;

  const audioReady = Boolean(audio) && (config.audio.enabled || config.audioReactive.enabled);
  const audioData = audioReady ? audio?.getAudioData() ?? null : null;
  const audioEnabled = config.audio.enabled;
  const reactiveEnabled = config.audioReactive.enabled && audioEnabled;

  if (audioData && reactiveEnabled) {
    boundaries.update(params.elapsed, {
      bass: audioData.smoothBass,
      mid: audioData.smoothMid,
      treble: audioData.smoothTreble,
      beatIntensity: audioData.beatIntensity,
      containment: audioData.modulators.containment,
      flow: audioData.modulators.flow,
      shimmer: audioData.modulators.shimmer,
      sway: audioData.modulators.sway,
    });
  } else {
    boundaries.update(params.elapsed);
  }

  modules.physics.simulator.updateBoundaryUniforms();

  if (audioData && config.audioReactive.enabled && audio) {
    audio.behavior.updateAudioData(audioData);
    audio.behavior.updateBeatEffects(audioData, params.delta, modules.physics.viewportGridSize);
    audio.visualization.update(audioData, params.delta);

    if (config.audioReactive.materialModulation) {
      const modulation = audio.behavior.getMaterialModulation(audioData);
      if (modulation) {
        config.simulation.dynamicViscosity = modulation.viscosity;
        config.simulation.stiffness = modulation.stiffness;
      }
    }
  }

  const postFXInfluence = config.audio.postFXInfluence ?? 0;
  modules.postfx.instance.applyAudioDynamics(audioData, postFXInfluence, params.delta);

  if (audioData) {
    context.state.lastAudioData = audioData;
  } else if (!audioReady) {
    context.state.lastAudioData = null;
  }

  return audioData;
}

function updateRenderer(context: EngineContext, modules: EngineModules, audioData: AudioData | null): void {
  const { config } = context;
  const { renderers, physics } = modules;

  const particleSize = config.particles.actualSize ?? config.particles.size ?? 0.12;
  const particleCount = physics.simulator.numParticles ?? config.particles.count;
  renderers.update(particleCount, particleSize);

  const reactiveSample = audioData ?? context.state.lastAudioData;
  if (
    reactiveSample &&
    config.audio.enabled &&
    config.audioReactive.enabled
  ) {
    const renderer = renderers.manager.getRenderer() as { updateAudioReactivity?: (data: any) => void };
    renderer.updateAudioReactivity?.({
      bass: reactiveSample.smoothBass,
      mid: reactiveSample.smoothMid,
      treble: reactiveSample.smoothTreble,
      beatIntensity: reactiveSample.beatIntensity,
    });
  }
}

async function updateSimulation(
  context: EngineContext,
  modules: EngineModules,
  params: EngineUpdateParams,
  audioData: AudioData | null,
): Promise<void> {
  const { config, internals } = context;

  if (!config.simulation.run) {
    return;
  }

  const gravityType = config.simulation.gravityType;
  internals.tmpGravity.set(0, 0, 0);

  if (gravityType === 0) {
    internals.tmpGravity.set(0, 0, 0.2);
  } else if (gravityType === 1) {
    internals.tmpGravity.set(0, -0.2, 0);
  } else if (gravityType === 3) {
    internals.tmpGravity
      .copy(config.gravitySensorReading)
      .add(config.accelerometerReading);
  }

  let audioInfluencedSpeed = config.simulation.speed;
  let audioInfluencedNoise = config.simulation.noise;

  if (audioData && config.audio.enabled && config.audio.particleInfluence > 0) {
    const influence = config.audio.particleInfluence;
    audioInfluencedSpeed *= 1.0 + audioData.smoothOverall * influence;
    audioInfluencedNoise *= 1.0 + audioData.smoothBass * influence * 0.5;
  }

  internals.tmpMouseOrigin.set(0, 0, 0);
  internals.tmpMouseDirection.set(0, 0, 0);
  internals.tmpMouseForce.set(0, 0, 0);

  await modules.physics.simulator.update(
    {
      numParticles: config.particles.count,
      dt: audioInfluencedSpeed,
      noise: audioInfluencedNoise,
      stiffness: config.simulation.stiffness,
      restDensity: config.simulation.restDensity,
      dynamicViscosity: config.simulation.dynamicViscosity,
      gravityType: config.simulation.gravityType,
      gravity: internals.tmpGravity,
      mouseRayOrigin: internals.tmpMouseOrigin,
      mouseRayDirection: internals.tmpMouseDirection,
      mouseForce: internals.tmpMouseForce,
      transferMode: config.simulation.transferMode,
      flipRatio: config.simulation.flipRatio,
      vorticityEnabled: config.simulation.vorticityEnabled,
      vorticityEpsilon: config.simulation.vorticityEpsilon,
      surfaceTensionEnabled: config.simulation.surfaceTensionEnabled,
      surfaceTensionCoeff: config.simulation.surfaceTensionCoeff,
      sparseGrid: config.simulation.sparseGrid,
      adaptiveTimestep: config.simulation.adaptiveTimestep,
      cflTarget: config.simulation.cflTarget,
    },
    params.delta,
    params.elapsed,
    config.audioReactive.enabled && audioData ? audioData : undefined,
  );
}
