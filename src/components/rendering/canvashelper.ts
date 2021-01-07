import { vec2, mat3 } from "gl-matrix";
import { Camera } from "../game/gamestate";


export interface CanvasHelper {
  getContext(): CanvasRenderingContext2D
  getWebGLContext(): WebGL2RenderingContext
  width(): number
  height(): number
  widthWorld(): number
  heightWorld(): number
  canvas2world(vec: vec2): vec2
  world2canvasLength(n: number): number
  world2canvas(vec: vec2): vec2
  world2view(vec2: vec2): vec2
  world2canvasMatrix(): mat3
  world2viewMatrix(): mat3
  view2canvasMatrix(): mat3
  view2ndcMatrix(): mat3
  pixelSize(): number
}

export const getCanvasHelper = (canvas: HTMLCanvasElement, camera: Camera) => {

  // field of view tells how many world units are shown with the default resolution
  // defaultPixelCount tells how many canvas pixels this is
  
  const defaultPixelCount = 800.0;

  const getContext: () => CanvasRenderingContext2D = () => getCanvas().getContext("2d")!;

  const getWebGLContext: () => WebGL2RenderingContext = () => {
    const gl = getCanvas().getContext("webgl2")!;
    if (!gl) {
      throw Error("Failed to get gl context.")
    }
    const ext = gl.getExtension("EXT_color_buffer_float");
    if (!ext) {
      throw Error("Can't render to floating point textures.");
    }
    return gl;
  }

  const getCanvas = () => canvas;
  
  const width = () => getCanvas().width;

  const height = () => getCanvas().height;

  const widthWorld = () => width() / pixelSize();

  const heightWorld = () => height() / pixelSize();

  const pixelSize = () => defaultPixelCount / camera.fieldOfView;

  const world2view = (pos: vec2) => vec2.fromValues(pos[0] - camera.pos[0], pos[1] - camera.pos[1])

  const world2viewMatrix = () => mat3.fromTranslation(mat3.create(), vec2.negate(vec2.create(), camera.pos));

  const view2canvasMatrix = () => mat3.fromValues(
      pixelSize(),              0, 0,
                0,    pixelSize(), 0, 
    width() * 0.5, height() * 0.5, 1);

  const world2canvasMatrix = () => mat3.multiply(mat3.create(), view2canvasMatrix(), world2viewMatrix());

  const canvas2ndcMatrix = () => mat3.fromValues(
    2 / width(),             0, 0,
              0, -2 / height(), 0,
             -1,            +1, 1);

  const view2ndcMatrix = () =>  mat3.multiply(mat3.create(), canvas2ndcMatrix(),  view2canvasMatrix());

  const view2canvas = (pos: vec2) => vec2.fromValues(
    pos[0] * pixelSize() + width() * 0.5, 
    pos[1] * pixelSize() + height() * 0.5);

  const world2canvas = (pos: vec2) => view2canvas(world2view(pos));

  const world2canvasLength = (length: number) => length * pixelSize();

  const canvas2view = (pos: vec2) => vec2.fromValues(
    (pos[0] - width() * 0.5) / pixelSize(),
    (pos[1] - height() * 0.5) / pixelSize());

  const view2world = (pos: vec2) => vec2.fromValues(pos[0] + camera.pos[0], pos[1] + camera.pos[1])

  const canvas2world = (pos: vec2) => view2world(canvas2view(pos));


  return {
    getContext: getContext,
    getWebGLContext: getWebGLContext,
    getCanvas: getCanvas,
    width: width,
    height: height,
    widthWorld: widthWorld,
    heightWorld: heightWorld,
    world2canvas: world2canvas,
    world2canvasLength: world2canvasLength,
    canvas2world: canvas2world,
    world2canvasMatrix: world2canvasMatrix,
    world2view: world2view,
    world2viewMatrix: world2viewMatrix,
    view2canvasMatrix: view2canvasMatrix,
    view2ndcMatrix: view2ndcMatrix,
    pixelSize: pixelSize
  }
}