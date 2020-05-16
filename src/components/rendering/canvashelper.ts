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

  // field of view tells how many world units are shown with the default resolution
  // defaultPixelCount tells how many canvas pixels this is

  const fieldOfView = camera.fieldOfview;
  const halffieldOfView = fieldOfView * 0.5;

  const getContext: () => CanvasRenderingContext2D = () => getCanvas().getContext("2d")!;

  const getCanvas = () => canvas;
  
  const width = () => getCanvas().width;

  const height = () => getCanvas().height;

  const defaultPixelCount = () => 800.0;

  const pixelSize = () => defaultPixelCount() / fieldOfView;

  const world2canvas = (pos: vec2) => vec2.fromValues(
    (pos[0] - camera.pos[0] + halffieldOfView) * pixelSize() + (width() - defaultPixelCount()) * 0.5, 
    (pos[1] - camera.pos[1] + halffieldOfView) * pixelSize() + (height() - defaultPixelCount()) * 0.5);

  const world2canvasLength = (length: number) => length * pixelSize();

  const canvas2world = (pos: vec2) => vec2.fromValues(
    (pos[0] - (width() - defaultPixelCount())*0.5) / pixelSize() - halffieldOfView + camera.pos[0],
    (pos[1] - (height() - defaultPixelCount())*0.5) / pixelSize() - halffieldOfView + camera.pos[1]);


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