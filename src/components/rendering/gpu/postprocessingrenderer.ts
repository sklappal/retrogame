import * as twgl from 'twgl.js'
import { CanvasHelper } from '../canvashelper';
import { BufferHandler } from './bufferhandler';
import { vec2 } from 'gl-matrix';
import { ControlState } from '../../Game';
import { GameState } from '../../game/gamestate';


export const getPostProcessingRenderer = (canvasHelper: CanvasHelper, bufferHandler: BufferHandler, mainTexture: WebGLTexture) => {
  const gl = canvasHelper.getWebGLContext();

  const programInfo = twgl.createProgramInfo(gl, [postProcessingVertexShaderSource, postProcessingFragmentShaderSource], (msg, line) => {
    console.log(msg);
    throw new Error("Failed to compile GL program.")
  });
  
  const renderPostProcess = (gamestate: GameState, controlstate: ControlState) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.useProgram(programInfo.program);


    gl.viewport(0, 0, canvasHelper.width(), canvasHelper.height());
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    setPostProcessingUniforms(gamestate, controlstate);

    const bufferInfo = bufferHandler.getRectBuffer();
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.drawBufferInfo(gl, bufferInfo);

  }

  const setPostProcessingUniforms = (gamestate: GameState, controlstate: ControlState) => {
    const uniforms = {
      uViewMatrix: canvasHelper.world2viewMatrix(),
      uProjectionMatrix: canvasHelper.view2ndcMatrix(),
      uBackgroundSampler: mainTexture,
      uResolution: vec2.fromValues(canvasHelper.width(), canvasHelper.height()),
      uIsPaused: !controlstate.mouse.isCaptured,
      uGametime: gamestate.gametime,
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
  uniform float uGametime;

  out vec4 fragmentColor;

  vec3 getPixel(int samplingradius) {
    vec3 pixel;
    float scaler = 0.0;
    for (int x = -samplingradius; x < samplingradius + 1; x++) {
      for (int y = -samplingradius; y < samplingradius + 1; y++) {
        pixel += texture(uBackgroundSampler, (gl_FragCoord.xy + vec2(x, y))/ uResolution).rgb;
        scaler += 1.0;
      }
    }
    return pixel / scaler;
  }

  void main(void) {
    vec3 color;
    if (uIsPaused) {
      color = getPixel(4);
      color = vec3(0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b);
    } 
    else {
      color = getPixel(0);
    }
    
    // Vignette-like effect
    float distance = distance(gl_FragCoord.xy / uResolution, vec2(0.5, 0.5));
    color = color * clamp(1.0 - 5.*(distance-0.35), 0.0, 1.0);


    fragmentColor = vec4(color, 1.0);
    
  }

  /////////////////////`;