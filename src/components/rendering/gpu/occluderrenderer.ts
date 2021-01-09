import { vertexShaderSource, firstPassFragmentShaderSource } from './shaders';
import * as twgl from 'twgl.js'
import { BufferInfo } from 'twgl.js'
import { vec2, mat3, vec4 } from 'gl-matrix';
import { GameState } from '../../game/gamestate';
import { CanvasHelper } from '../canvashelper';
import { Model, Rect, Circle } from '../../models/models';


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


export const getOccluderRenderer = (canvasHelper: CanvasHelper, frameBuffer: WebGLFramebuffer) => {

  const gl = canvasHelper.getWebGLContext();

  const program = twgl.createProgramInfo(gl, [vertexShaderSource, firstPassFragmentShaderSource]);
  
  let currentProgram = program;
  const setCurrentProgram = (p: twgl.ProgramInfo) => {
    currentProgram = p;
    gl.useProgram(p.program);
  }

  const buffers = {
    "rect": createRectBuffer(gl),
    "circle": createCircleBuffer(gl)
  };

  const modelMatrix = mat3.create();


  let occluderTextureWidth = -1;
  let occluderTextureHeight = -1;
  const occluderTexture = gl.createTexture();
  if (occluderTexture === null) {
    throw new Error("Could not initialize occluder texture.");
  }
  

  // OCCLUDER RENDERING

  const renderOccluders = (gamestate: GameState) => {
    setCurrentProgram(program);

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

    twgl.setUniforms(program, uniforms);
  }

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

  const staticObjectsColor = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
  const drawStaticObjects = (gamestate: GameState) => {
    gamestate.scene.staticObjects.forEach(so => {
      drawShape(so.model, so.pos, staticObjectsColor);
    });
  }

  return {
    renderOccluders: renderOccluders,
    getTexture: () => occluderTexture
  }
} 