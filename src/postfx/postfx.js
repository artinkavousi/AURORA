import * as THREE from "three/webgpu";
import { float, Fn, mrt, output, pass, vec2, vec3, vec4, uv, texture, uniform, sin, fract, dot, clamp, mix, time, normalView, velocity, convertToTexture, step, cos, acos, sign, PI } from "three/tsl";
import DepthOfFieldNode from 'three/examples/jsm/tsl/display/DepthOfFieldNode.js';
import { bloom } from 'three/examples/jsm/tsl/display/BloomNode.js';
import GTAONode from 'three/examples/jsm/tsl/display/GTAONode.js';
import SMAANode from 'three/examples/jsm/tsl/display/SMAANode.js';
import SSRNode from 'three/examples/jsm/tsl/display/SSRNode.js';
import { postFxState } from './state.js';

class PostFX {
  constructor(renderer) {
    this.renderer = renderer;
    this.postProcessing = null;
    this._built = false;
    this.state = postFxState;
    this._stateVersionApplied = -1;
  }

  async init(stage) {
    const scenePass = pass(stage.scene, stage.camera);
    // Include normal buffer for AO and future stages
    scenePass.setMRT( mrt( { output, normal: normalView, velocity: velocity } ) );
    const outputPass = scenePass.getTextureNode();
    const viewZ = scenePass.getViewZNode( 'depth' );
    const normalTex = scenePass.getTextureNode( 'normal' );
    const velocityTex = scenePass.getTextureNode( 'velocity' );

    this.postProcessing = new THREE.PostProcessing(this.renderer);
    this.postProcessing.outputColorTransform = false;

    // DOF
    this._dofEnabled = uniform( 1 );
    this._dofFocusDist = uniform( 1.0 );
    this._dofFocal = uniform( 0.3 );
    this._dofBokeh = uniform( 0.8 );
    // Advanced bokeh controls
    this._dofNearBoost = uniform( 1.0 );
    this._dofFarBoost = uniform( 1.0 );
    this._dofHiThresh = uniform( 0.8 );
    this._dofHiGain = uniform( 0.6 );
    this._apertureBlades = uniform( 7.0 );
    this._apertureRot = uniform( 0.0 );
    this._aperturePetal = uniform( 1.0 );
    this._anamorphic = uniform( 0.0 );
    // Build a dynamic bokehScale node responsive to near/far and highlights
    const uvN = uv();
    const lumW = vec3(0.2126, 0.7152, 0.0722);
    const col = texture( outputPass, uvN ).rgb;
    const lum = col.dot( lumW );
    const hiMask = clamp( lum.sub( this._dofHiThresh ).div( float(1.0).sub( this._dofHiThresh ) ), 0.0, 1.0 );
    const isFar = step( float(0.0), viewZ.sub( this._dofFocusDist ) );
    const nearFar = mix( this._dofNearBoost, this._dofFarBoost, isFar );
    // Aperture polygon weighting (approx)
    const d = uvN.sub( vec2(0.5,0.5) ).normalize();
    const ang = acos( clamp( d.x, -1.0, 1.0 ) ).mul( sign( d.y ).max(0.0).mul(2.0).sub(1.0) ).add( this._apertureRot );
    const blades = this._apertureBlades;
    const poly = cos( ang.mul( blades ) ).abs().pow( this._aperturePetal ).clamp(0.0,1.0);
    const bokehScaleDynamic = this._dofBokeh.mul( nearFar ).mul( hiMask.mul( this._dofHiGain ).add(1.0) ).mul( poly.mul(0.5).add(0.75) );
    this._dofNode = new DepthOfFieldNode( outputPass, viewZ, this._dofFocusDist, this._dofFocal, bokehScaleDynamic );
    const dofOut = this._dofNode.getTextureNode();

    // Bloom
    const bloomPass = bloom( outputPass );
    this.bloomPass = bloomPass;
    this._bloomMix = uniform( 1.0 );

    // GTAO (optional)
    this._aoEnabled = uniform( 0 );
    this._gtao = new GTAONode( scenePass.getTextureNode('depth'), normalTex, stage.camera );
    // SSGI (optional) — not available in this three version; placeholder flags only
    this._ssgiEnabled = uniform( 0 );
    // SSR (optional)
    this._ssrEnabled = uniform( 0 );
    // Metalness/Roughness fallbacks via uniforms when MRT not provided
    this._ssrMetalness = uniform( 0.0 );
    this._ssr = new SSRNode( outputPass, scenePass.getTextureNode('depth'), normalTex, this._ssrMetalness, null, stage.camera );

    // FX uniforms
    this._vigEnabled = uniform( 0 );
    this._vigAmount = uniform( 0.25 );
    this._grainEnabled = uniform( 0 );
    this._grainAmount = uniform( 0.08 );
    this._chromaCenter = uniform( new THREE.Vector2(0.5, 0.5) );
    this._chromaScale = uniform( 1.0 );
    this._chromaEnabled = uniform( 0 );
    this._chromaAmount = uniform( 0.0025 );
    this._mbEnabled = uniform( 0 );
    this._mbAmount = uniform( 0.35 );
    this._mbDir = uniform( new THREE.Vector2(0,0) );
    this._texel = uniform( new THREE.Vector2(1/1024, 1/1024) );
    this._sat = uniform( 1.0 );
    this._contrast = uniform( 1.0 );
    this._lift = uniform( 0.0 );
    this._aaMode = uniform( 0 ); // 0 off, 1 fxaa-lite
    this._aaAmount = uniform( 1.0 );
    this._dofQualityU = uniform( 1.0 );

    this.postProcessing.outputNode = Fn( () => {
      // Apply AO and GI before DOF/Bloom
      const aoTex = this._gtao.getTextureNode();
      let beauty = outputPass.rgb.mul( mix( float(1.0), aoTex, this._aoEnabled ).clamp(0,1) ).clamp(0,1).toVar();
      // Placeholder: SSGI disabled in this build

      // Unified DOF: always use DepthOfFieldNode output, blend by enable
      const dofBlend = this._dofEnabled.clamp(0.0, 1.0);
      let outCol = beauty.mul( dofBlend.oneMinus() ).add( dofOut.rgb.mul( dofBlend ) ).clamp(0,1).toVar();

      // SSR blend (pre-bloom)
      const ssrTex = this._ssr.getTextureNode();
      beauty = mix( beauty, ssrTex.rgb, this._ssrEnabled.mul( this._ssr.opacity ) ).clamp(0,1);

      // Optional anamorphic stretch applied where out-of-focus
      const depthDiff = viewZ.abs().sub(this._dofFocusDist.abs()).abs();
      const oof = clamp( depthDiff.div( this._dofFocal.add(1e-4) ).mul( this._dofBokeh ), 0.0, 1.0 );
      const stretch = this._anamorphic.abs();
      const dir = vec2( step(0.0, this._anamorphic), 1.0 ).toVar(); // x when positive, y when negative
      dir.x = step( float(0.0), this._anamorphic );
      dir.y = float(1.0).sub( dir.x );
      const st2 = uv();
      const texel = this._texel;
      const s0 = texture( dofOut, st2.add( dir.mul( texel.mul( -2.0 ) ) ) ).rgb;
      const s1 = texture( dofOut, st2.add( dir.mul( texel.mul( -1.0 ) ) ) ).rgb;
      const s2 = texture( dofOut, st2 ).rgb;
      const s3 = texture( dofOut, st2.add( dir.mul( texel.mul( 1.0 ) ) ) ).rgb;
      const s4 = texture( dofOut, st2.add( dir.mul( texel.mul( 2.0 ) ) ) ).rgb;
      const oval = s0.mul(0.07).add( s1.mul(0.16) ).add( s2.mul(0.54) ).add( s3.mul(0.16) ).add( s4.mul(0.07) );
      outCol = mix( outCol, oval, stretch.mul( oof ) );

      // DOF internal quality blend (cheap upsample smoothing)
      const q = float(1.0).sub( this._dofQualityU ).clamp(0.0, 1.0);
      const qTex = dofOut; // smooth directly on DOF result
      const stq = uv();
      const tA = texture( qTex, stq.add( texel.mul( vec2( 1.0, 1.0 ) ) ) ).rgb;
      const tB = texture( qTex, stq.add( texel.mul( vec2( -1.0, -1.0 ) ) ) ).rgb;
      const tC = texture( qTex, stq.add( texel.mul( vec2( -1.0, 1.0 ) ) ) ).rgb;
      const tD = texture( qTex, stq.add( texel.mul( vec2( 1.0, -1.0 ) ) ) ).rgb;
      const smooth = tA.add(tB).add(tC).add(tD).div(4.0);
      outCol = mix( outCol, smooth, q.mul(0.65) );

      // Bloom
      outCol = outCol.add( bloomPass.rgb.clamp(0,1).mul( this._bloomMix ) ).clamp(0,1);

      // Vignette
      const st = uv();
      const v = st.sub(0.5);
      const dV = v.length();
      const vig = clamp( float(1.0).sub( dV.mul(2.0).pow(2.0).mul(this._vigAmount) ), 0.0, 1.0 );
      outCol = mix( outCol, outCol.mul(vig), this._vigEnabled );

      // Chromatic aberration & film grain will be applied after this Fn via nodes

      // Motion blur (5-tap directional)
      const mbd = this._mbDir.mul( this._mbAmount ).mul( this._texel );
      const t0 = texture( outputPass, st.add( mbd.mul( -2.0 ) ) ).rgb;
      const t1 = texture( outputPass, st.add( mbd.mul( -1.0 ) ) ).rgb;
      const t2 = texture( outputPass, st ).rgb;
      const t3 = texture( outputPass, st.add( mbd.mul( 1.0 ) ) ).rgb;
      const t4 = texture( outputPass, st.add( mbd.mul( 2.0 ) ) ).rgb;
      const blur = t0.mul(0.07).add( t1.mul(0.16) ).add( t2.mul(0.54) ).add( t3.mul(0.16) ).add( t4.mul(0.07) );
      outCol = mix( outCol, blur, this._mbEnabled );

      // Grade
      const luminance = outCol.dot( vec3(0.2126, 0.7152, 0.0722) );
      const satCol = mix( vec3(luminance), outCol, this._sat );
      const ctrCol = satCol.sub( vec3(0.5) ).mul( this._contrast ).add( vec3(0.5) );
      let postCol = ctrCol.add( this._lift ).clamp(0,1).toVar();

      // Simple FXAA-like edge blend (lightweight fallback)
      const uvp = uv();
      const tex = outputPass;
      const t = this._texel;
      const cN = texture(tex, uvp.add( vec2(0.0, t.y) ) ).rgb;
      const cS = texture(tex, uvp.sub( vec2(0.0, t.y) ) ).rgb;
      const cE = texture(tex, uvp.add( vec2(t.x, 0.0) ) ).rgb;
      const cW = texture(tex, uvp.sub( vec2(t.x, 0.0) ) ).rgb;
      const w = vec3(0.299, 0.587, 0.114);
      const lumN = cN.dot(w);
      const lumS = cS.dot(w);
      const lumE = cE.dot(w);
      const lumW = cW.dot(w);
      const lumC = texture(tex, uvp).rgb.dot(w);
      const edge = lumN.add(lumS).add(lumE).add(lumW).div(4.0).sub( lumC ).abs();
      const avg = cN.add(cS).add(cE).add(cW).div(4.0);
      const aaCol = mix( postCol, avg, edge.mul( this._aaAmount ).clamp(0.0, 1.0) );
      // Build a float mask for FXAA when mode == 1
      const m01 = step( float(0.5), this._aaMode );
      const m15 = step( float(1.5), this._aaMode );
      const fxaaMask = m01.sub( m15 );
      const fxaaOut = mix( postCol, aaCol, fxaaMask ).toVar();
      // SMAA/TRA A handled outside with convertToTexture
      return vec4(fxaaOut.xyz, 1.0);
    })();

    // Build CA/Grain/SMAA chain over the composed output
    this._finalNodeTex = convertToTexture( this.postProcessing.outputNode );
    // We'll create CA/Film on demand in renderAsync to ensure correct ordering
    this._smaa = null;

    this._applyState();
    this._built = true;
  }

  setFocusDistance(d, smooth = 0) {
    if (!this._built) return;
    if (!this._dofFocusDist) return;
    let next = d;
    if (smooth > 0) {
      next = this._dofFocusDist.value * (1 - smooth) + d * smooth;
    }
    this._dofFocusDist.value = next;
    this.state.set(['dof', 'focus'], next, { notify: true });
  }

  resize(width, height) {
    if (this._texel) {
      this._texel.value.set(1/Math.max(1,width), 1/Math.max(1,height));
    }
    if (this._gtao) this._gtao.setSize(width, height);
  }

  _applyState() {
    if (!this._built) return;
    const state = this.state.value;

    const { bloom: bloomState, dof, vignette, grain, chroma, motion, color, aa, ao, ssr } = state;

    if (this.bloomPass) {
      this.bloomPass.threshold.value = bloomState.threshold;
      this.bloomPass.radius.value = bloomState.radius;
      this.bloomPass.strength.value = bloomState.strength;
    }
    this._bloomMix.value = bloomState.enabled ? bloomState.strength : 0.0;

    this._dofEnabled.value = dof.enabled ? 1 : 0;
    if (!dof.autoFocus) this._dofFocusDist.value = dof.focus;
    this._dofFocal.value = dof.range;
    this._dofBokeh.value = dof.amount;
    this._dofNearBoost.value = dof.nearBoost;
    this._dofFarBoost.value = dof.farBoost;
    this._dofHiThresh.value = dof.highlightThreshold;
    this._dofHiGain.value = dof.highlightGain;
    this._apertureBlades.value = dof.apertureBlades;
    this._apertureRot.value = dof.apertureRotation;
    this._aperturePetal.value = dof.aperturePetal;
    this._anamorphic.value = dof.anamorphic;
    const dofQuality = typeof dof.quality === 'number' ? dof.quality : (dof.highQuality ? 1.0 : 0.6);
    this._dofQualityU.value = dofQuality;

    this._vigEnabled.value = vignette.enabled ? 1 : 0;
    this._vigAmount.value = vignette.amount;
    this._grainEnabled.value = grain.enabled ? 1 : 0;
    this._grainAmount.value = grain.amount;
    this._chromaEnabled.value = chroma.enabled ? 1 : 0;
    this._chromaAmount.value = chroma.amount;
    if (chroma.center) this._chromaCenter.value.set(chroma.center.x, chroma.center.y);
    this._chromaScale.value = chroma.scale;
    this._mbEnabled.value = motion.enabled ? 1 : 0;
    this._mbAmount.value = motion.amount;
    this._sat.value = color.saturation;
    this._contrast.value = color.contrast;
    this._lift.value = color.lift;

    let aaMode = 0;
    if (aa.mode === 'fxaa') aaMode = 1;
    else if (aa.mode === 'smaa') aaMode = 2;
    else if (aa.mode === 'traa') aaMode = 1;
    this._aaMode.value = aaMode;
    this._aaAmount.value = aa.amount;

    this._aoEnabled.value = ao.enabled ? 1 : 0;
    if (this._gtao) {
      this._gtao.radius.value = ao.radius;
      this._gtao.thickness.value = ao.thickness;
      this._gtao.distanceExponent.value = ao.distanceExponent;
      this._gtao.scale.value = ao.scale;
      this._gtao.samples.value = ao.samples;
      this._gtao.resolutionScale = ao.resolutionScale;
    }

    this._ssgiEnabled.value = 0;
    this._ssrEnabled.value = ssr.enabled ? 1 : 0;
    if (this._ssr) {
      this._ssr.opacity.value = ssr.opacity;
      this._ssr.maxDistance.value = ssr.maxDistance;
      this._ssr.thickness.value = ssr.thickness;
      this._ssr.resolutionScale = ssr.resolutionScale;
      this._ssrMetalness.value = ssr.metalness;
    }

    this._stateVersionApplied = this.state.version;
  }

  _ensureStateApplied() {
    if (this._stateVersionApplied !== this.state.version) {
      this._applyState();
    }
  }

  // Provide simple direction vector from camera motion
  updateMotionDirection(camera, prevCamPos) {
    const deltaCam = new THREE.Vector3().copy(camera.position).sub(prevCamPos);
    const viewDelta = deltaCam.clone().applyMatrix4(camera.matrixWorldInverse);
    const len = Math.hypot(viewDelta.x, viewDelta.y);
    if (len > 1e-6) this._mbDir.value.set(viewDelta.x/len, viewDelta.y/len);
    else this._mbDir.value.set(0,0);
  }

  async renderAsync() {
    if (!this.postProcessing) return;
    this._ensureStateApplied();
    // Build CA/Film chain on top of composed tex
    let node = this._finalNodeTex;
    // Chromatic aberration
    if (this._chromaEnabled.value > 0.5) {
      const { vec2, float } = await import('three/tsl'); // dynamic import for literal nodes
      const caNodeMod = await import('three/examples/jsm/tsl/display/ChromaticAberrationNode.js');
      const CAClass = caNodeMod.default;
      node = new CAClass( node, this._chromaAmount, vec2(this._chromaCenter.value.x, this._chromaCenter.value.y), float(this._chromaScale.value) );
    }
    // Film grain
    if (this._grainEnabled.value > 0.5) {
      const filmMod = await import('three/examples/jsm/tsl/display/FilmNode.js');
      const FilmClass = filmMod.default;
      node = new FilmClass( node, this._grainAmount.mul(this._grainEnabled) );
    }
    // DOF internal resolution adjustment
    const size = this.renderer.getDrawingBufferSize( new THREE.Vector2() );
    const scale = Math.max(0.25, Math.min(1.0, this._dofQualityU.value || 1.0));
    if (this._dofNode && this._dofNode.setSize) this._dofNode.setSize( size.width * scale, size.height * scale );

    // SMAA AA at the end (mode 2)
    const aaMode = this._aaMode.value|0;
    if (aaMode === 2) {
      const SMAAMod = await import('three/examples/jsm/tsl/display/SMAANode.js');
      const SMAAClass = SMAAMod.default;
      node = new SMAAClass( node ).getTextureNode();
    }
    this.postProcessing.outputNode = node;
    await this.postProcessing.renderAsync();
  }
}

export default PostFX;
