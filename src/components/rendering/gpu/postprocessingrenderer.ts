import * as twgl from 'twgl.js'
import { CanvasHelper } from '../canvashelper';
import { BufferHandler } from './bufferhandler';
import { vec2 } from 'gl-matrix';
import { ControlState } from '../../Game';


export const getPostProcessingRenderer = (canvasHelper: CanvasHelper, bufferHandler: BufferHandler, mainTexture: WebGLTexture) => {
  const gl = canvasHelper.getWebGLContext();

  const programInfo = twgl.createProgramInfo(gl, [postProcessingVertexShaderSource, postProcessingFragmentShaderSource]);

  const renderPostProcess = (controlstate: ControlState) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.useProgram(programInfo.program);


    gl.viewport(0, 0, canvasHelper.width(), canvasHelper.height());
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    setPostProcessingUniforms(controlstate);

    const bufferInfo = bufferHandler.getRectBuffer();
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.drawBufferInfo(gl, bufferInfo);

  }

  const setPostProcessingUniforms = (controlstate: ControlState) => {
    const uniforms = {
      uViewMatrix: canvasHelper.world2viewMatrix(),
      uProjectionMatrix: canvasHelper.view2ndcMatrix(),
      uBackgroundSampler: mainTexture,
      uResolution: vec2.fromValues(canvasHelper.width(), canvasHelper.height()),
      uIsPaused: !controlstate.mouse.isCaptured
    }
    twgl.setUniforms(programInfo, uniforms);
  }

  return {
    renderPostProcess: renderPostProcess
  }
}

const postProcessingVertexShaderSource = `#version 300 es
  ///////////////////
  // Vertex Shader //
  ///////////////////

  uniform mat3 uViewMatrix; // world coordinates to view
  uniform mat3 uProjectionMatrix; // view coordinates to NDC

  in vec3 position;
  out vec2 posWorld;
  out vec2 posVertex;

  void main(void) {
    gl_Position = vec4(position, 1.0);
    posVertex = position.xy;
    posWorld =  (inverse(uProjectionMatrix * uViewMatrix) * position).xy;
    
  }

  ///////////////////`;


const postProcessingFragmentShaderSource = `#version 300 es
  /////////////////////
  // Fragment Shader //
  /////////////////////
  precision highp float;

  #define M_PI 3.1415926535897932384626433832795

  in vec2 posWorld;
  in vec2 posVertex;
  
  uniform vec2 uResolution;
  uniform sampler2D uBackgroundSampler;
  uniform bool uIsPaused;

  out vec4 fragmentColor;

  void main(void) {

    vec3 bg = texture(uBackgroundSampler, gl_FragCoord.xy / uResolution).rgb;
    if (uIsPaused) {
      float color = 0.2126 * bg.r + 0.7152 * bg.g + 0.0722 * bg.b;
      fragmentColor = vec4(color, color, color, 1.0);
    } else {
      fragmentColor = vec4(bg, 1.0);
    }
    
  }

  /////////////////////`;