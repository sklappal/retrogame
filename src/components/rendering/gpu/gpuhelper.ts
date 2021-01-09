import { vertexShaderSource, mainFragmentShaderSource, VISIBILITY_TEXTURE_WIDTH, MAX_NUM_LIGHTS, visibilityFragmentShaderSource, visibilityVertexShaderSource } from './shaders';
import * as twgl from 'twgl.js'
import { BufferInfo } from 'twgl.js'
import { vec2, mat3, vec4, vec3 } from 'gl-matrix';
import { GameState } from '../../game/gamestate';
import { CanvasHelper } from '../canvashelper';
import { findVisibilityStrip } from '../visibility';
import { Model, Rect, Circle } from '../../models/models';
import { getOccluderRenderer } from './occluderrenderer';


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


  const visibilityGlProgramInfo = twgl.createProgramInfo(gl, [visibilityVertexShaderSource, visibilityFragmentShaderSource]);
  const mainGlProgramInfo = twgl.createProgramInfo(gl, [vertexShaderSource, mainFragmentShaderSource]);

  let currentProgram = visibilityGlProgramInfo;
  const setCurrentProgram = (p: twgl.ProgramInfo) => {
    currentProgram = p;
    gl.useProgram(p.program);
  }

  const buffers = {
    "rect": createRectBuffer(gl),
    "circle": createCircleBuffer(gl)
  };

  const modelMatrix = mat3.create();

  
  const frameBuffer = gl.createFramebuffer();
  if (frameBuffer == null) {
    throw new Error("Could not initialize framebuffer.");
  }

  const occluderRenderer = getOccluderRenderer(canvasHelper, frameBuffer);


  const visibilityCalculationTexture = initVisibilityCalculationTexture();

  const visibilityTextureHeight = MAX_NUM_LIGHTS; // player visibility 1 player light 1 other lights n
  const visibilityPixels = new Float32Array(VISIBILITY_TEXTURE_WIDTH * visibilityTextureHeight);
  const visibilityTexture = initVisibilityTexture();




  // VISIBILITY CALCULATION ON GPU

  const calculateVisibilityOnGPU = (gamestate: GameState) => {
    setCurrentProgram(visibilityGlProgramInfo);

    gl.viewport(0, 0, VISIBILITY_TEXTURE_WIDTH, 1);
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    // attach the texture as the first color attachment
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, visibilityCalculationTexture, /*level*/ 0);

    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    setVisibilityCalculationUniforms(gamestate);

    const bufferInfo = buffers["rect"];
    twgl.setBuffersAndAttributes(gl, currentProgram, bufferInfo);
    twgl.drawBufferInfo(gl, bufferInfo);

    gl.bindTexture(gl.TEXTURE_2D, visibilityTexture);

    const xOffset = 0;
    const yOffset = 0;
    const height = 1;

    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, xOffset, yOffset, 0, 0, VISIBILITY_TEXTURE_WIDTH, height);
  }


  const setVisibilityCalculationUniforms = (gamestate: GameState) => {
    const uniforms = {
      uViewMatrix: canvasHelper.world2viewMatrix(),
      uProjectionMatrix: canvasHelper.view2ndcMatrix(),
      uBackgroundSampler: occluderRenderer.getTexture(),
      uActorPosWorld: gamestate.player.pos
    }

    twgl.setUniforms(visibilityGlProgramInfo, uniforms);
  }

  // MAIN RENDER

  const renderMain = (gamestate: GameState) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    setCurrentProgram(mainGlProgramInfo);

    gl.viewport(0, 0, canvasHelper.width(), canvasHelper.height());
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    setMainRenderUniforms(gamestate);

    drawBackground();

  }

  const setMainRenderUniforms = (gamestate: GameState) => {
    const uniforms = {
      uPlayerPositionWorld: gamestate.player.pos,
      uViewMatrix: canvasHelper.world2viewMatrix(),
      uProjectionMatrix: canvasHelper.view2ndcMatrix(),
      uActualNumberOfLights: gamestate.scene.lights.length + 1, // player light
      uVisibilitySampler: visibilityTexture,
      uBackgroundSampler: occluderRenderer.getTexture(),
      uResolution: vec2.fromValues(canvasHelper.width(), canvasHelper.height()),
      uPixelSize: canvasHelper.pixelSize()
    }

    twgl.setUniforms(mainGlProgramInfo, uniforms);

    setLightUniforms(gamestate.player.pos, gamestate.player.light.color, gamestate.player.light.intensity, 0);
    for (let i = 0; i < gamestate.scene.lights.length; i++) {
      setLightUniforms(gamestate.scene.lights[i].pos, gamestate.scene.lights[i].params.color, gamestate.scene.lights[i].params.intensity, i + 1);
    }
  }


  const drawBuffer = (bufferInfo: BufferInfo, color: vec4) => {
    twgl.setUniforms(currentProgram, {
      uModelMatrix: modelMatrix,
      uColor: color
    });

    twgl.setBuffersAndAttributes(gl, currentProgram, bufferInfo);
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



  // const drawCircleBuffer = vec2.create();
  // const drawCircle = (radius: number, pos: vec2, color: vec4) => {
  //   mat3.translate(modelMatrix, modelMatrix, pos);
  //   mat3.scale(modelMatrix, modelMatrix, vec2.set(drawCircleBuffer, radius, radius));
  //   const buffer = buffers["circle"];
  //   drawBuffer(buffer, color);
  // }

  // const drawRectBuffer = vec2.create();
  // const drawRect = (width: number, height: number, pos: vec2, color: vec4) => {
  //   mat3.translate(modelMatrix, modelMatrix, pos);
  //   mat3.scale(modelMatrix, modelMatrix, vec2.set(drawRectBuffer, width * 0.5, height * 0.5));
  //   const buffer = buffers["rect"];
  //   drawBuffer(buffer, color);
  // }

  // const drawShape = (model: Model, pos: vec2, color: vec4) => {
  //   if (model.kind === "rect") {
  //     const shape = model.shape as Rect;
  //     drawRect(shape.width, shape.height, pos, color);
  //   } else if (model.kind === "circle") {
  //     const shape = model.shape as Circle;
  //     drawCircle(shape.radius, pos, color);
  //   }
  // }

  // const staticObjectsColor = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
  // const drawStaticObjects = (gamestate: GameState) => {
  //   gamestate.scene.staticObjects.forEach(so => {
  //     drawShape(so.model, so.pos, staticObjectsColor);
  //   });
  // }

  // const dynamicObjectsColor = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
  // const drawDynamicObjects = (gamestate: GameState) => {
  //   gamestate.scene.dynamicObjects.forEach(so => {
  //     drawShape(so.model, so.pos, dynamicObjectsColor);
  //   });
  // }

  // const lightColor = vec4.fromValues(0.1, 0.1, 0.1, 1.0);
  // const drawLights = (gamestate: GameState) => {
  //   for (let i = 0; i < gamestate.scene.lights.length; i++) {
  //     drawCircle(0.2, gamestate.scene.lights[i].pos, lightColor)
  //   }
  // }

  // const playerColor = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
  // const drawPlayer = (gamestate: GameState) => {
  //   drawCircle(0.5, gamestate.player.pos, playerColor)
  // }

  const setLightUniforms = (pos: vec2, color: vec3, intensity: number, index: number) => {
    let location = gl.getUniformLocation(mainGlProgramInfo.program, "uLightPositionsWorld[" + index + "]")
    gl.uniform2f(location, pos[0], pos[1]);

    location = gl.getUniformLocation(mainGlProgramInfo.program, "uLightColors[" + index + "]")
    gl.uniform3f(location, color[0], color[1], color[2]);

    location = gl.getUniformLocation(mainGlProgramInfo.program, "uLightIntensities[" + index + "]")
    gl.uniform1f(location, intensity);
  }


  // VISIBILITY TEXTURE STUFF

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


  const getSubArray = (index: number) => visibilityPixels.subarray(index * VISIBILITY_TEXTURE_WIDTH, (index + 1) * VISIBILITY_TEXTURE_WIDTH)

  const renderVisibility = (gamestate: GameState) => {
    // this one is used for visibility
    // here we fake the intensity to a canvas size dependent intensity so that the visibility calculation works correctly
    // const intensity = Math.max(canvasHelper.widthWorld(), canvasHelper.heightWorld());

    // TODO: Move all of this to happen on GPU


    // if (findVisibilityStrip(-1, gamestate.player.pos, { ...gamestate.player.light, intensity: intensity * intensity / 1000.0, angle: undefined, angularWidth: undefined }, gamestate.scene.staticObjects, getSubArray(0))) {
    //   updateVisibilityTextureOnGpu(0);
    // }

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
    renderOccluders: occluderRenderer.renderOccluders,
    renderVisibility: renderVisibility,
    renderMain: renderMain
  }
} 