import { conf } from '../../../src/conf.js';

import { EnvironmentModule } from '../modules/EnvironmentModule.js';
import { SimulationModule } from '../modules/SimulationModule.js';
import { AudioModule } from '../modules/AudioModule.js';
import { EffectsModule } from '../modules/EffectsModule.js';
import { InteractionModule } from '../modules/InteractionModule.js';
import { PerformanceGovernor } from '../modules/PerformanceGovernor.js';

export class Application {
  constructor(renderer) {
    this.renderer = renderer;

    this.environment = null;
    this.simulation = null;
    this.audio = null;
    this.effects = null;
    this.interaction = null;
    this.performance = null;

    this._envBase = null;
  }

  async init(progressCallback = () => {}) {
    conf.init();

    this.environment = new EnvironmentModule(this.renderer);
    await this.environment.init(progressCallback);
    this._envBase = this.environment.getEnvironmentBase();

    await progressCallback(0.5);

    this.simulation = new SimulationModule(this.renderer, this.environment.getStage());
    await this.simulation.init();

    this.audio = new AudioModule();
    await this.audio.init();

    this.effects = new EffectsModule(this.renderer);
    await this.effects.init(this.environment.getStage());

    this.interaction = new InteractionModule(
      this.environment.getStage(),
      this.simulation,
      this.effects,
      this.renderer.domElement,
    );
    this.interaction.bind();

    this.performance = new PerformanceGovernor();

    await progressCallback(1.0, 100);
  }

  resize(width, height) {
    this.environment?.resize(width, height);
    this.effects?.resize(width, height);
  }

  async update(delta, elapsed) {
    conf.begin();

    this.environment?.update(delta, elapsed);
    const stage = this.environment?.getStage();

    if (this.simulation) {
      this.simulation.setRenderMode(conf.renderMode || 'surface');
      this.simulation.updateRenderers();
    }

    await this.audio?.update(delta, elapsed, this._envBase);

    await this.simulation?.updateSimulation(delta, elapsed);

    if (this.effects && stage) {
      this.effects.updateFromConfig(conf);
      this.effects.updateMotion(stage);
      await this.effects.render(stage, conf);
    } else if (stage) {
      await this.renderer.renderAsync(stage.scene, stage.camera);
    }

    conf.end();

    this.performance?.update(delta);
  }
}
