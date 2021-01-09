import * as twgl from 'twgl.js'
import { vec4, mat3, vec2 } from 'gl-matrix';
import { Model, Rect, Circle } from '../../models/models';


export interface BufferHandler {
  getRectBuffer: () => twgl.BufferInfo
  getCircleBuffer: () => twgl.BufferInfo
}

export const getBufferHandler = (gl: WebGL2RenderingContext):BufferHandler => {
  const createRectBuffer = () => {
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

  const createCircleBuffer = () => {
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

  const buffers = {
    "rect": createRectBuffer(),
    "circle": createCircleBuffer()
  };

  return {
    getRectBuffer: () => buffers["rect"],
    getCircleBuffer: () => buffers["circle"]
  }

}

export const getBufferRenderer = (gl: WebGL2RenderingContext, bufferHandler: BufferHandler, programInfo: twgl.ProgramInfo) => {

  const drawBuffer = (bufferInfo: twgl.BufferInfo, color: vec4, modelMatrix: mat3) => {
    twgl.setUniforms(programInfo, {
      uModelMatrix: modelMatrix,
      uColor: color
    });

    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.drawBufferInfo(gl, bufferInfo);

    mat3.identity(modelMatrix);
  }

  const drawCircleBuffer = vec2.create();
  const drawCircle = (radius: number, pos: vec2, color: vec4, modelMatrix: mat3) => {
    mat3.translate(modelMatrix, modelMatrix, pos);
    mat3.scale(modelMatrix, modelMatrix, vec2.set(drawCircleBuffer, radius, radius));
    const buffer = bufferHandler.getCircleBuffer();
    drawBuffer(buffer, color, modelMatrix);
  }

  const drawRectBuffer = vec2.create();
  const drawRect = (width: number, height: number, pos: vec2, color: vec4, modelMatrix: mat3) => {
    mat3.translate(modelMatrix, modelMatrix, pos);
    mat3.scale(modelMatrix, modelMatrix, vec2.set(drawRectBuffer, width * 0.5, height * 0.5));
    const buffer = bufferHandler.getRectBuffer();
    drawBuffer(buffer, color, modelMatrix);
  }

  const shapeModel = mat3.create();
  const drawShape = (model: Model, pos: vec2, color: vec4) => {
    if (model.kind === "rect") {
      const shape = model.shape as Rect;
      drawRect(shape.width, shape.height, pos, color, shapeModel);
    } else if (model.kind === "circle") {
      const shape = model.shape as Circle;
      drawCircle(shape.radius, pos, color, shapeModel);
    }
  }

  return {
    drawShape: drawShape,
    drawCircle: drawCircle,
    drawRect: drawRect
  }
}