import * as twgl from 'twgl.js'
import { vec4 } from 'gl-matrix';
import { GameState } from '../../game/gamestate';
import { CanvasHelper } from '../canvashelper';
import { BufferHandler, getBufferRenderer } from './bufferhandler';


export const getOccluderRenderer = (canvasHelper: CanvasHelper, bufferHandler: BufferHandler, frameBuffer: WebGLFramebuffer) => {
  const gl = canvasHelper.getWebGLContext();

  const programInfo = twgl.createProgramInfo(gl, [occluderVertexShaderSource, occluderFragmentShaderSource], (msg, line) => {
    console.log(msg);
    throw new Error("Failed to compile GL program.")
  });

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
    const width = canvasHelper.width();
    const height = canvasHelper.height();

    gamestate.scene.staticObjects.forEach(so => {
      // Culling
      const viewPos = canvasHelper.world2canvas(so.pos);
      const boudingBoxWidthCanvas = canvasHelper.world2canvasLength(so.model.halfBoundingBox[0]);
      const boudingBoxHeightCanvas = canvasHelper.world2canvasLength(so.model.halfBoundingBox[1]);

      if (viewPos[0] + boudingBoxWidthCanvas < 0 || viewPos[0] - boudingBoxWidthCanvas > width)
      {
        return;
      }

      if (viewPos[1] + boudingBoxHeightCanvas < 0 || viewPos[1] - boudingBoxHeightCanvas > height)
      {
        return;
      }

      bufferRenderer.drawShape(so.model, so.pos, staticObjectsColor);
    });
  }

  return {
    renderOccluders: renderOccluders,
    getTexture: () => occluderTexture
  }
} 

const occluderVertexShaderSource = `#version 300 es
  ///////////////////
  // Vertex Shader //
  ///////////////////
  
  uniform mat3 uModelMatrix; // model coordinates to world coordinates
  uniform mat3 uViewMatrix; // world coordinates to view
  uniform mat3 uProjectionMatrix; // view coordinates to NDC
  
  in vec3 position;
  out vec2 posWorld;
  out vec2 posVertex;

  void main(void) {
    vec3 positionWorld = uModelMatrix * position;
    posWorld = positionWorld.xy;
    posVertex = position.xy;
    gl_Position = vec4((uProjectionMatrix * uViewMatrix) * positionWorld, 1.0);
  }

  ///////////////////`;

  const occluderFragmentShaderSource = `#version 300 es
  /////////////////////
  // Fragment Shader //
  /////////////////////
  precision highp float;

  out vec4 fragmentColor;

  void main(void) {
    fragmentColor = vec4(0.0, 0.0, 0.0, 1.0);
  }

  /////////////////////`;