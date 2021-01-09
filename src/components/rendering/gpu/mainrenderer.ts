import { mainVertexShaderSource, mainFragmentShaderSource } from './shaders';
import * as twgl from 'twgl.js'
import { vec2, vec3 } from 'gl-matrix';
import { GameState } from '../../game/gamestate';
import { CanvasHelper } from '../canvashelper';
import { BufferHandler } from './bufferhandler';

export const getMainRenderer = (canvasHelper: CanvasHelper, bufferHandler: BufferHandler, occluderTexture: WebGLTexture, visibilityTexture: WebGLTexture) => {
  const gl = canvasHelper.getWebGLContext();

  const programInfo = twgl.createProgramInfo(gl, [mainVertexShaderSource, mainFragmentShaderSource]);

  const frameBuffer = gl.createFramebuffer();
  if (frameBuffer == null) {
    throw new Error("Could not initialize framebuffer.");
  }

  const renderMain = (gamestate: GameState) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.useProgram(programInfo.program);

    gl.viewport(0, 0, canvasHelper.width(), canvasHelper.height());
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    setMainRenderUniforms(gamestate);

    const bufferInfo = bufferHandler.getRectBuffer();
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.drawBufferInfo(gl, bufferInfo);
  }

  const setMainRenderUniforms = (gamestate: GameState) => {
    const uniforms = {
      uPlayerPositionWorld: gamestate.player.pos,
      uViewMatrix: canvasHelper.world2viewMatrix(),
      uProjectionMatrix: canvasHelper.view2ndcMatrix(),
      uActualNumberOfLights: gamestate.scene.lights.length + 1, // player light
      uVisibilitySampler: visibilityTexture,
      uBackgroundSampler: occluderTexture,
      uResolution: vec2.fromValues(canvasHelper.width(), canvasHelper.height()),
      uPixelSize: canvasHelper.pixelSize()
    }

    twgl.setUniforms(programInfo, uniforms);

    setLightUniforms(gamestate.player.pos, gamestate.player.light.color, gamestate.player.light.intensity, 0);
    for (let i = 0; i < gamestate.scene.lights.length; i++) {
      setLightUniforms(gamestate.scene.lights[i].pos, gamestate.scene.lights[i].params.color, gamestate.scene.lights[i].params.intensity, i + 1);
    }
  }

  const setLightUniforms = (pos: vec2, color: vec3, intensity: number, index: number) => {
    let location = gl.getUniformLocation(programInfo.program, "uLightPositionsWorld[" + index + "]")
    gl.uniform2f(location, pos[0], pos[1]);

    location = gl.getUniformLocation(programInfo.program, "uLightColors[" + index + "]")
    gl.uniform3f(location, color[0], color[1], color[2]);

    location = gl.getUniformLocation(programInfo.program, "uLightIntensities[" + index + "]")
    gl.uniform1f(location, intensity);
  }
  
  return {
    renderMain: renderMain
  }
} 