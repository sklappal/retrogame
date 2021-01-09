import { vertexShaderSource, mainFragmentShaderSource } from './shaders';
import * as twgl from 'twgl.js'
import { BufferInfo } from 'twgl.js'
import { vec2, mat3, vec4, vec3 } from 'gl-matrix';
import { GameState } from '../../game/gamestate';
import { CanvasHelper } from '../canvashelper';
import { getOccluderRenderer } from './occluderrenderer';
import { getVisibilityRenderer } from './visibilityrenderer';


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


  const mainGlProgramInfo = twgl.createProgramInfo(gl, [vertexShaderSource, mainFragmentShaderSource]);

  let currentProgram = mainGlProgramInfo;
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

  const visibilityRenderer = getVisibilityRenderer(canvasHelper, frameBuffer, occluderRenderer.getTexture());

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
      uVisibilitySampler: visibilityRenderer.getTexture(),
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




  
  return {
    renderOccluders: occluderRenderer.renderOccluders,
    renderVisibility: visibilityRenderer.renderVisibility,
    renderMain: renderMain
  }
} 