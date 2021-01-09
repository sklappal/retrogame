import { vertexShaderSource, firstPassFragmentShaderSource } from './shaders';
import * as twgl from 'twgl.js'
import { vec4 } from 'gl-matrix';
import { GameState } from '../../game/gamestate';
import { CanvasHelper } from '../canvashelper';
import { BufferHandler, getBufferRenderer } from './bufferhandler';


export const getOccluderRenderer = (canvasHelper: CanvasHelper, bufferHandler: BufferHandler, frameBuffer: WebGLFramebuffer) => {
  const gl = canvasHelper.getWebGLContext();

  const programInfo = twgl.createProgramInfo(gl, [vertexShaderSource, firstPassFragmentShaderSource]);

  const bufferRenderer = getBufferRenderer(gl, bufferHandler, programInfo);

  const occluderTexture = gl.createTexture();
  if (occluderTexture === null) {
    throw new Error("Could not initialize occluder texture.");
  }
  
  const renderOccluders = (gamestate: GameState) => {
    gl.useProgram(programInfo.program);

    gl.viewport(0, 0, canvasHelper.width(), canvasHelper.height());

    updateOccluderTexture();

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    // attach the texture as the first color attachment
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, occluderTexture, /*level*/ 0);

    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    setOccluderUniforms();

    drawStaticObjects(gamestate);
  }


  const setOccluderUniforms = () => {
    const uniforms = {
      uViewMatrix: canvasHelper.world2viewMatrix(),
      uProjectionMatrix: canvasHelper.view2ndcMatrix(),
    }

    twgl.setUniforms(programInfo, uniforms);
  }

  let occluderTextureWidth = -1;
  let occluderTextureHeight = -1;
  const updateOccluderTexture = () => {
    if (occluderTextureWidth !== canvasHelper.width() || occluderTextureHeight !== canvasHelper.height()) {
      gl.bindTexture(gl.TEXTURE_2D, occluderTexture);

      const level = 0;
      const internalFormat = gl.RGBA;
      const border = 0;
      const srcFormat = gl.RGBA;
      const srcType = gl.UNSIGNED_BYTE;

      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        canvasHelper.width(), canvasHelper.height(), border, srcFormat, srcType, null);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      occluderTextureWidth = canvasHelper.width();
      occluderTextureHeight = canvasHelper.height();
    }
  }

  const staticObjectsColor = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
  const drawStaticObjects = (gamestate: GameState) => {
    gamestate.scene.staticObjects.forEach(so => {
      bufferRenderer.drawShape(so.model, so.pos, staticObjectsColor);
    });
  }

  return {
    renderOccluders: renderOccluders,
    getTexture: () => occluderTexture
  }
} 