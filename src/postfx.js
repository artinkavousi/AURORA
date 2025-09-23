import * as THREE from "three/webgpu";
import { float, Fn, mix, pass, uv, vec2, vec3, vec4, texture, uniform, clamp, time, sin, fract, step } from "three/tsl";
import DepthOfFieldNode from "three/examples/jsm/tsl/display/DepthOfFieldNode.js";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";

class PostFX {
  constructor(renderer) {
    this.renderer = renderer;
    this.postProcessing = null;
    this._built = false;
    this._lensResolutionScale = 0.85;
  }

  async init(stage) {
    const scenePass = pass(stage.scene, stage.camera);
    const colorPass = scenePass.getTextureNode();
    const depthNode = scenePass.getViewZNode('depth');

    this.postProcessing = new THREE.PostProcessing(this.renderer);
    this.postProcessing.outputColorTransform = false;

    this._lensEnabled = uniform(0);
    this._lensFocusDist = uniform(1.0);
    this._lensFocusRange = uniform(0.15);
    this._lensBokeh = uniform(1.0);
    this._lensAnamorphic = uniform(0.0);

    this._texel = uniform(new THREE.Vector2(1 / 1024, 1 / 1024));

    this._bloomEnabled = uniform(0);
    this._bloomIntensity = uniform(0.9);
    this._bloomRadius = uniform(0.6);
    this._bloomThreshold = uniform(0.85);

    this._vignetteEnabled = uniform(0);
    this._vignetteAmount = uniform(0.25);

    this._grainEnabled = uniform(0);
    this._grainAmount = uniform(0.06);

    this._chromaticEnabled = uniform(0);
    this._chromaticAmount = uniform(0.0025);

    this._toneSaturation = uniform(1.0);
    this._toneContrast = uniform(1.0);
    this._toneLift = uniform(0.0);

    this._motionBlurEnabled = uniform(0);
    this._motionBlurAmount = uniform(0.35);
    this._motionDirection = uniform(new THREE.Vector2(0, 0));

    this._dofNode = new DepthOfFieldNode(colorPass, depthNode, this._lensFocusDist, this._lensFocusRange, this._lensBokeh);
    const dofTexture = this._dofNode.getTextureNode();

    this._bloomNode = bloom(dofTexture);

    const bloomTexture = this._bloomNode.getTextureNode();

    this.postProcessing.outputNode = Fn(() => {
      const st = uv();
      const baseColor = colorPass.rgb;
      const dofColor = dofTexture.rgb;

      let color = mix(baseColor, dofColor, this._lensEnabled);

      const stretchAmount = this._lensAnamorphic.abs();
      const axisX = step(float(0.0), this._lensAnamorphic);
      const axis = vec2(axisX, float(1.0).sub(axisX));
      const texel = this._texel;
      const offset = axis.mul(texel);
      const s0 = texture(dofTexture, st.add(offset.mul(-2.0))).rgb;
      const s1 = texture(dofTexture, st.add(offset.mul(-1.0))).rgb;
      const s2 = texture(dofTexture, st).rgb;
      const s3 = texture(dofTexture, st.add(offset)).rgb;
      const s4 = texture(dofTexture, st.add(offset.mul(2.0))).rgb;
      const oval = s0.mul(0.06).add(s1.mul(0.16)).add(s2.mul(0.56)).add(s3.mul(0.16)).add(s4.mul(0.06));
      color = mix(color, oval, stretchAmount.mul(this._lensEnabled));

      const bloomCol = bloomTexture.rgb.mul(this._bloomIntensity);
      color = color.add(bloomCol.mul(this._bloomEnabled)).clamp(0, 1);

      const center = vec2(0.5, 0.5);
      const delta = st.sub(center);
      const vig = clamp(float(1.0).sub(delta.length().mul(2.2).pow(2.0).mul(this._vignetteAmount)), 0.0, 1.0);
      color = mix(color, color.mul(vig), this._vignetteEnabled);

      const luminance = color.dot(vec3(0.2126, 0.7152, 0.0722));
      const saturated = mix(vec3(luminance), color, this._toneSaturation);
      color = saturated.sub(vec3(0.5)).mul(this._toneContrast).add(vec3(0.5)).add(vec3(this._toneLift)).clamp(0, 1);

      const caOffset = delta.mul(this._chromaticAmount);
      const caColor = vec3(
        texture(dofTexture, st.add(caOffset)).r,
        texture(dofTexture, st).g,
        texture(dofTexture, st.sub(caOffset)).b,
      );
      color = mix(color, caColor, this._chromaticEnabled);

      const noiseSeed = st.dot(vec2(12.9898, 78.233)).add(time.mul(437.585));
      const noise = fract(sin(noiseSeed).mul(43758.5453));
      const grain = vec3(noise.sub(0.5).mul(this._grainAmount));
      color = mix(color, color.add(grain), this._grainEnabled);

      const blurDir = this._motionDirection.mul(this._texel).mul(this._motionBlurAmount);
      const mb0 = texture(dofTexture, st.add(blurDir.mul(-2.0))).rgb;
      const mb1 = texture(dofTexture, st.add(blurDir.mul(-1.0))).rgb;
      const mb2 = texture(dofTexture, st).rgb;
      const mb3 = texture(dofTexture, st.add(blurDir)).rgb;
      const mb4 = texture(dofTexture, st.add(blurDir.mul(2.0))).rgb;
      const blur = mb0.mul(0.07).add(mb1.mul(0.16)).add(mb2.mul(0.54)).add(mb3.mul(0.16)).add(mb4.mul(0.07));
      color = mix(color, blur, this._motionBlurEnabled.mul(this._motionBlurAmount));

      return vec4(color.clamp(0, 1), 1.0);
    })();

    this._built = true;
  }

  setLensState({ enabled, focusDistance, focusRange, bokehScale, anamorphic, resolutionScale }) {
    if (!this._built) return;
    if (enabled !== undefined) this._lensEnabled.value = enabled ? 1 : 0;
    if (focusDistance !== undefined) this._lensFocusDist.value = focusDistance;
    if (focusRange !== undefined) this._lensFocusRange.value = Math.max(0.01, focusRange);
    if (bokehScale !== undefined) this._lensBokeh.value = Math.max(0.0, bokehScale);
    if (anamorphic !== undefined) this._lensAnamorphic.value = anamorphic;
    if (resolutionScale !== undefined) {
      this._lensResolutionScale = THREE.MathUtils.clamp(resolutionScale, 0.3, 1.0);
    }
  }

  resize(width, height) {
    if (this._texel) {
      this._texel.value.set(1 / Math.max(1, width), 1 / Math.max(1, height));
    }
  }

  updateFromConf(conf) {
    if (!this._built) return;
    this._bloomEnabled.value = conf.postBloomEnabled ? 1 : 0;
    this._bloomNode.strength.value = conf.postBloomIntensity;
    this._bloomNode.radius.value = conf.postBloomRadius;
    this._bloomNode.threshold.value = conf.postBloomThreshold;

    this._vignetteEnabled.value = conf.postVignetteEnabled ? 1 : 0;
    this._vignetteAmount.value = conf.postVignetteAmount;

    this._grainEnabled.value = conf.postGrainEnabled ? 1 : 0;
    this._grainAmount.value = conf.postGrainAmount;

    this._chromaticEnabled.value = conf.postChromaticEnabled ? 1 : 0;
    this._chromaticAmount.value = conf.postChromaticAmount;

    this._toneSaturation.value = conf.postToneSaturation;
    this._toneContrast.value = conf.postToneContrast;
    this._toneLift.value = conf.postToneLift;

    this._motionBlurEnabled.value = conf.postMotionBlurEnabled ? 1 : 0;
    this._motionBlurAmount.value = conf.postMotionBlurAmount;

    this._lensResolutionScale = THREE.MathUtils.clamp(conf.lensResolutionScale || this._lensResolutionScale, 0.3, 1.0);
  }

  updateMotionDirection(camera, prevCamPos) {
    if (!camera || !prevCamPos || !this._motionDirection) return;
    const deltaCam = new THREE.Vector3().copy(camera.position).sub(prevCamPos);
    const viewDelta = deltaCam.clone().applyMatrix4(camera.matrixWorldInverse);
    const len = Math.hypot(viewDelta.x, viewDelta.y);
    if (len > 1e-6) {
      this._motionDirection.value.set(viewDelta.x / len, viewDelta.y / len);
    } else {
      this._motionDirection.value.set(0, 0);
    }
  }

  async renderAsync() {
    if (!this.postProcessing) return;
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    const scale = Math.max(0.3, Math.min(1.0, this._lensResolutionScale));
    if (this._dofNode?.setSize) this._dofNode.setSize(size.width * scale, size.height * scale);
    await this.postProcessing.renderAsync();
  }
}

export default PostFX;
