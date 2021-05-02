import { VISIBILITY_TEXTURE_WIDTH, MAX_NUM_LIGHTS } from './constants';
import * as twgl from 'twgl.js'
import { GameState } from '../../game/gamestate';
import { CanvasHelper } from '../canvashelper';
import { findVisibilityStrip } from '../visibility';
import { BufferHandler } from './bufferhandler';
import { vec2 } from 'gl-matrix';

export const getVisibilityRenderer = (canvasHelper: CanvasHelper, bufferHandler: BufferHandler, frameBuffer: WebGLFramebuffer, occluderTexture: WebGLTexture) => {
  const gl = canvasHelper.getWebGLContext();

  const programInfo = twgl.createProgramInfo(gl, [visibilityVertexShaderSource, visibilityFragmentShaderSource], (msg, line) => {
    console.log(msg);
    throw new Error("Failed to compile GL program.")
  });
  // This is a 1024 * 1 texture which is used to calculate the visibility for one light
  const visibilityCalculationTexture = initVisibilityCalculationTexture();

  const visibilityTextureHeight = MAX_NUM_LIGHTS; // player visibility 1 player light 1 other lights n
  const visibilityPixels = new Float32Array(VISIBILITY_TEXTURE_WIDTH * visibilityTextureHeight);
  
  // This is a 1024 * 50 texture where each row is a light
  const visibilityTexture = initVisibilityTexture();
  if (visibilityTexture === null) {
    throw new Error("Could not initialize visibility texture.")
  }

  function initVisibilityCalculationTexture() {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.R32F;
    const border = 0;
    const srcFormat = gl.RED;
    const srcType = gl.FLOAT;

    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
      VISIBILITY_TEXTURE_WIDTH, 1, border, srcFormat, srcType, null);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return texture;
  };

  function initVisibilityTexture() {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.R32F;
    const border = 0;
    const srcFormat = gl.RED;
    const srcType = gl.FLOAT;

    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
      VISIBILITY_TEXTURE_WIDTH, visibilityTextureHeight, border, srcFormat, srcType, null);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return texture;
  };

  const calculateVisibilityOnGPU = (gamestate: GameState) => {
    gl.useProgram(programInfo.program);
    gl.viewport(0, 0, VISIBILITY_TEXTURE_WIDTH, 1);
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    // attach the texture as the first color attachment
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, visibilityCalculationTexture, /*level*/ 0);

    calculateVisibility(0, gamestate.player.pos);
    calculateVisibility(1, gamestate.player.pos, gamestate.player.light.angle, gamestate.player.light.angularWidth);
  }

  const calculateVisibility = (textureIndex: number, actorPos: vec2, angle:number|null = null, angularWidth:number|null = null) =>  {
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    angle = angle ? angle : 0.0;
    angularWidth = angularWidth ? angularWidth : 2.0 * Math.PI;

    const startAngle = angle - angularWidth * 0.5;
    const stopAngle = angle + angularWidth * 0.5;

    setVisibilityCalculationUniforms(actorPos, startAngle, stopAngle);

    const bufferInfo = bufferHandler.getRectBuffer();
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.drawBufferInfo(gl, bufferInfo);

    gl.bindTexture(gl.TEXTURE_2D, visibilityTexture);

    const level = 0;
    const xOffset = 0;
    const height = 1;
    const x = 0;
    const y = 0;

    gl.copyTexSubImage2D(gl.TEXTURE_2D, level, xOffset, textureIndex, x, y, VISIBILITY_TEXTURE_WIDTH, height);
  }

  const setVisibilityCalculationUniforms = (actorPos: vec2, startAngle: number, stopAngle: number) => {
    const uniforms = {
      uViewMatrix: canvasHelper.world2viewMatrix(),
      uProjectionMatrix: canvasHelper.view2ndcMatrix(),
      uBackgroundSampler: occluderTexture,
      uActorPosWorld: actorPos,
      uLightParameters: vec2.fromValues(startAngle, stopAngle)
    }

    twgl.setUniforms(programInfo, uniforms);
  }


  const getSubArray = (index: number) => visibilityPixels.subarray(index * VISIBILITY_TEXTURE_WIDTH, (index + 1) * VISIBILITY_TEXTURE_WIDTH)

  const renderVisibility = (gamestate: GameState) => {

    // These are currently static lights which are evaluated only once. They should also be moved to GPU at some point.
    for (let i = 0; i < gamestate.scene.lights.length; i++) {
      const light = gamestate.scene.lights[i];
      if (findVisibilityStrip(light.id, light.pos, light.params, gamestate.scene.staticObjects, getSubArray(i + 2))) {
        updateVisibilityTextureOnGpu(i + 2);
      }
    }

    calculateVisibilityOnGPU(gamestate);
  }

  const updateVisibilityTextureOnGpu = (index: number) => {
    gl.bindTexture(gl.TEXTURE_2D, visibilityTexture);

    const xOffset = 0;
    const yOffset = index;
    const height = 1;
    gl.texSubImage2D(gl.TEXTURE_2D, 0, xOffset, yOffset, VISIBILITY_TEXTURE_WIDTH, height, gl.RED, gl.FLOAT, getSubArray(index));
  }

  return {
    renderVisibility: renderVisibility,
    getTexture: () => visibilityTexture
  }
} 


const visibilityVertexShaderSource = `#version 300 es
  ///////////////////
  // Vertex Shader //
  ///////////////////
  
  in vec3 position;
  
  void main(void) {
    gl_Position = vec4(position, 1.0);
  }

  ///////////////////`;

const visibilityFragmentShaderSource = `#version 300 es
  /////////////////////
  // Fragment Shader //
  /////////////////////
  precision highp float;

  #define M_PI 3.1415926535897932384626433832795
  #define MAX_SAMPLING_DISTANCE 1000.0;
  #define SAMPLING_STEP 0.1;
  #define VISIBILITY_TEXTURE_WIDTH ${VISIBILITY_TEXTURE_WIDTH}

  uniform sampler2D uBackgroundSampler;
  uniform mat3 uViewMatrix; // world coordinates to view
  uniform mat3 uProjectionMatrix; // view coordinates to NDC
  uniform vec2 uActorPosWorld;
  uniform vec2 uLightParameters; // startAngle, stopAngle

  out float fragmentDepth;

  void main(void) {    
    float angle = (gl_FragCoord.x / float(VISIBILITY_TEXTURE_WIDTH)) * 2.0 * M_PI - M_PI;

    float r_out = 0.0;

    float end = uLightParameters[1] - uLightParameters[0];
    float test_angle = angle - uLightParameters[0];    
    if (test_angle < 0.0) {
      test_angle += 2. * M_PI;
    }
    if (test_angle > 2. * M_PI) {
      test_angle -= 2. * M_PI;
    }
    
    if (test_angle <= end) {
      vec2 dir = vec2(cos(angle), sin(angle));
      r_out = 1000.0;
      for (float r = 0.2; r < 1000.0; r += 0.1) {
        vec2 pos = uActorPosWorld + r * dir;
        vec3 ndcPos = (uProjectionMatrix * uViewMatrix) * vec3(pos, 1.0);
        vec2 sampling = (ndcPos.xy + vec2(1.0)) * 0.5;      
        vec3 backgroundColor = texture(uBackgroundSampler, sampling).rgb;
        if (backgroundColor != vec3(1.0, 1.0, 1.0))
        {
          r_out = r;
          break;
        }
      }
    }

    fragmentDepth = r_out;
  }

  /////////////////////`;
