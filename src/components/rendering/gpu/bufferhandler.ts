import * as twgl from 'twgl.js'


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