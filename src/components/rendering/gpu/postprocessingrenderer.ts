import { postProcessingVertexShaderSource, postProcessingFragmentShaderSource } from './shaders';
import * as twgl from 'twgl.js'
import { GameState } from '../../game/gamestate';
import { CanvasHelper } from '../canvashelper';
import { BufferHandler } from './bufferhandler';
import { vec2 } from 'gl-matrix';


export const getPostProcessingRenderer = (canvasHelper: CanvasHelper, bufferHandler: BufferHandler, mainTexture: WebGLTexture) => {
  const gl = canvasHelper.getWebGLContext();

  const programInfo = twgl.createProgramInfo(gl, [postProcessingVertexShaderSource, postProcessingFragmentShaderSource]);

  const renderPostProcess = (gamestate: GameState) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
    gl.useProgram(programInfo.program);
    

    gl.viewport(0, 0, canvasHelper.width(), canvasHelper.height());
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    setPostProcessingUniforms();

    const bufferInfo = bufferHandler.getRectBuffer();
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.drawBufferInfo(gl, bufferInfo);
    
  }

  const setPostProcessingUniforms = () => {
    const uniforms = {
      uViewMatrix: canvasHelper.world2viewMatrix(),
      uProjectionMatrix: canvasHelper.view2ndcMatrix(),
      uBackgroundSampler: mainTexture,
      uResolution: vec2.fromValues(canvasHelper.width(), canvasHelper.height()),
    }
    twgl.setUniforms(programInfo, uniforms);
  }

  return {
    renderPostProcess: renderPostProcess
  }
}