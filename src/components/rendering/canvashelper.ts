import { vec2 } from "gl-matrix";
import { Camera } from "../game/gamestate";


export interface CanvasHelper {
  getContext(): CanvasRenderingContext2D
  width(): number
  height(): number
  canvas2world(vec: vec2): vec2
  world2canvasLength(n: number): number
  world2canvas(vec: vec2): vec2
}

export const getCanvasHelper = (canvas: HTMLCanvasElement, camera: Camera) => {
  

  // FOV says how many pixels we want to see _if_ the view port width is 800
  // if width is more 

  // const canvasWidth = 800;
  // const multiplier = 1.0 // when width = 800
  // const multiplier = 0.0 // when width = 0.0
  // const multiplier = width() / 800.0;

  const sizeScaler = camera.fieldOfview;
  const halfsizeScaler = sizeScaler * 0.5;

  const getContext: () => CanvasRenderingContext2D = () => getCanvas().getContext("2d")!;

  const getCanvas = () => canvas;
  
  const width = () => getCanvas().width;

  const height = () => getCanvas().height;

  const minExtent = () => Math.min(width(), height());

  const pixelSize = () => minExtent() * (1.0 / sizeScaler);

  const world2canvas = (pos: vec2) => vec2.fromValues(
    (pos[0] - camera.pos[0] + halfsizeScaler) * pixelSize() + (width() - minExtent()) * 0.5, 
    (pos[1] - camera.pos[1] + halfsizeScaler) * pixelSize() + (height() - minExtent()) * 0.5);

  const world2canvasLength = (length: number) => length * pixelSize();

  const canvas2world = (pos: vec2) => vec2.fromValues(
    (pos[0] - (width() - minExtent())*0.5) / pixelSize() - halfsizeScaler + camera.pos[0],
    (pos[1] - (height() - minExtent())*0.5) / pixelSize() - halfsizeScaler + camera.pos[1]);


  return {
    getContext: getContext,
    getCanvas: getCanvas,
    width: width,
    height: height,
    world2canvas: world2canvas,
      world2canvasLength: world2canvasLength,
    canvas2world: canvas2world
  }
}