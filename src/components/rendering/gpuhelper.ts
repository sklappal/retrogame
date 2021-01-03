import { vertexShaderSource, mainFragmentShaderSource, firstPassFragmentShaderSource } from './shaders';
import * as twgl from 'twgl.js'
import { BufferInfo } from 'twgl.js'
import { vec2, mat3, vec4, vec3 } from 'gl-matrix';
import { GameState } from '../game/gamestate';
import { CanvasHelper } from './canvashelper';
import { findVisibilityStrip } from './visibility';
import { Model, Rect, Circle } from '../models/models';


const createRectBuffer = (gl: WebGL2RenderingContext) => {
  const verts = [
    -1, -1, 0,
    1, -1, 0,
    1, 1, 0,

    -1, -1, 0,
    1, 1, 0,
    -1, 1, 0,
  ];

  const arrays = {
    position: verts,
  };
  return twgl.createBufferInfoFromArrays(gl, arrays);
}

const createCircleBuffer = (gl: WebGL2RenderingContext) => {
  const verts = [];
  for (let i = 0; i < 256; i++) {

    verts.push([Math.cos((i / 256.0) * Math.PI * 2.0), Math.sin((i / 256.0) * Math.PI * 2.0), 0.0])
    verts.push([Math.cos(((i + 1) / 256.0) * Math.PI * 2.0), Math.sin(((i + 1) / 256.0) * Math.PI * 2.0), 0.0])
    verts.push([0.0, 0.0, 0.0]);
  }
  const arr = new Float32Array(verts.flatMap(v => v));
  const arrays = {
    position: arr,
  };
  return twgl.createBufferInfoFromArrays(gl, arrays);
}


export const getGpuHelper = (canvasHelper: CanvasHelper) => {

  const gl = canvasHelper.getWebGLContext();

  const firstPassGlProgramInfo = twgl.createProgramInfo(gl, [vertexShaderSource, firstPassFragmentShaderSource]);
  const mainGlProgramInfo = twgl.createProgramInfo(gl, [vertexShaderSource, mainFragmentShaderSource]);

  const buffers = {
    "rect": createRectBuffer(gl),
    "circle": createCircleBuffer(gl)
  };
  
  const modelMatrix = mat3.create();


  // RENDERING

  const startMainRender = (gamestate: GameState) => {
    gl.useProgram(mainGlProgramInfo.program);
    gl.viewport(0, 0, canvasHelper.width(), canvasHelper.height());
    gl.clear(gl.COLOR_BUFFER_BIT);
    setUniforms(gamestate);
  }
 
  const setUniforms = (gamestate: GameState) => {
    const uniforms = {
      uPlayerPositionWorld: gamestate.player.pos,
      uViewMatrix: canvasHelper.world2viewMatrix(),
      uProjectionMatrix: canvasHelper.view2ndcMatrix(),
      uActualNumberOfLights: gamestate.scene.lights.length + 1, // player light
      uVisibilitySampler: visibilityTexture
    }

    twgl.setUniforms(mainGlProgramInfo, uniforms);

    setLightUniforms(gamestate.player.pos, gamestate.player.light.color, gamestate.player.light.intensity, 0);
    for (let i = 0; i < gamestate.scene.lights.length; i++) {
      setLightUniforms(gamestate.scene.lights[i].pos, gamestate.scene.lights[i].params.color, gamestate.scene.lights[i].params.intensity, i + 1);
    }
  }


  const drawBuffer = (bufferInfo: BufferInfo, color: vec4) => {
    twgl.setUniforms(mainGlProgramInfo, {
      uModelMatrix: modelMatrix,
      uColor: color
    });

    twgl.setBuffersAndAttributes(gl, mainGlProgramInfo, bufferInfo);
    twgl.drawBufferInfo(gl, bufferInfo);

    mat3.identity(modelMatrix);
  }


  const backgroundColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
  const drawBackground = () => {
    const buffer = buffers["rect"];

    mat3.invert(
      modelMatrix,
      mat3.multiply(
        modelMatrix, canvasHelper.view2ndcMatrix(), canvasHelper.world2viewMatrix())
    );

    drawBuffer(buffer, backgroundColor);
  }

  const drawCircleBuffer = vec2.create();
  const drawCircle = (radius: number, pos: vec2, color: vec4) => {
    mat3.translate(modelMatrix, modelMatrix, pos);
    mat3.scale(modelMatrix, modelMatrix, vec2.set(drawCircleBuffer, radius, radius));
    const buffer = buffers["circle"];
    drawBuffer(buffer, color);
  }

  const drawRectBuffer = vec2.create();
  const drawRect = (width: number, height: number, pos: vec2, color: vec4) => {
    mat3.translate(modelMatrix, modelMatrix, pos);
    mat3.scale(modelMatrix, modelMatrix, vec2.set(drawRectBuffer, width * 0.5, height * 0.5));
    const buffer = buffers["rect"];
    drawBuffer(buffer, color);
  }

  const drawShape = (model: Model, pos: vec2, color: vec4) => {
    if (model.kind === "rect") {
      const shape = model.shape as Rect;
      drawRect(shape.width, shape.height, pos, color);
    } else if (model.kind === "circle") {
      const shape = model.shape as Circle;
      drawCircle(shape.radius, pos, color);
    }
  }

  const setLightUniforms = (pos: vec2, color: vec3, intensity: number, index: number) => {
    let location = gl.getUniformLocation(mainGlProgramInfo.program, "uLightPositionsWorld[" + index + "]")
    gl.uniform2f(location, pos[0], pos[1]);

    location = gl.getUniformLocation(mainGlProgramInfo.program, "uLightColors[" + index + "]")
    gl.uniform3f(location, color[0], color[1], color[2]);

    location = gl.getUniformLocation(mainGlProgramInfo.program, "uLightIntensities[" + index + "]")
    gl.uniform1f(location, intensity);
  }


  const initTexture = (width: number, height: number) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.R32F;
    const border = 0;
    const srcFormat = gl.RED;
    const srcType = gl.FLOAT;

    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
      width, height, border, srcFormat, srcType, null);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return texture;
  };

  
  
  // VISIBILITY TEXTURE STUFF

  const visibilityTextureWidth = 1024;
  const visibilityTextureHeight = 50; // player visibility 1 player light 1 other lights n
  const visibilityPixels = new Float32Array(visibilityTextureWidth * visibilityTextureHeight);
  const visibilityTexture = initTexture(visibilityTextureWidth, visibilityTextureHeight);

  const getSubArray = (index: number) => visibilityPixels.subarray(index * visibilityTextureWidth, (index + 1) * visibilityTextureWidth)

  const updateVisibilityTexture = (gamestate: GameState) => {
    // this one is used for visibility
    // here we fake the intensity to a canvas size dependent intensity so that the visibility calculation works correctly
    const intensity = Math.max(canvasHelper.widthWorld(), canvasHelper.heightWorld());

    if (findVisibilityStrip(-1, gamestate.player.pos, { ...gamestate.player.light, intensity: intensity * intensity / 1000.0, angle: undefined, angularWidth: undefined }, gamestate.scene.staticObjects, getSubArray(0))) {
      updateVisibilityTextureOnGpu(0);
    }

    // this one is used for player light
    if (findVisibilityStrip(gamestate.player.id, gamestate.player.pos, gamestate.player.light, gamestate.scene.staticObjects, getSubArray(1))) {
      updateVisibilityTextureOnGpu(1);
    }

    for (let i = 0; i < gamestate.scene.lights.length; i++) {
      const light = gamestate.scene.lights[i];
      if (findVisibilityStrip(light.id, light.pos, light.params, gamestate.scene.staticObjects, getSubArray(i + 2))) {
        updateVisibilityTextureOnGpu(i + 2);
      }
    }
  }

  const updateVisibilityTextureOnGpu = (index: number) => {
    gl.bindTexture(gl.TEXTURE_2D, visibilityTexture);

    const xOffset = 0;
    const yOffset = index;
    const height = 1;
    gl.texSubImage2D(gl.TEXTURE_2D, 0, xOffset, yOffset, visibilityTextureWidth, height, gl.RED, gl.FLOAT, getSubArray(index));
  }

  return {
    drawShape: drawShape,
    drawCircle: drawCircle,
    drawRect: drawRect,
    drawBackground: drawBackground,
    startMainRender: startMainRender,
    updateVisibilityTexture: updateVisibilityTexture,
  }
} 