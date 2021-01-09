import { CanvasHelper } from '../canvashelper';
import { getOccluderRenderer } from './occluderrenderer';
import { getVisibilityRenderer } from './visibilityrenderer';
import { getMainRenderer } from './mainrenderer';
import { getBufferHandler } from './bufferhandler';


export const getGpuHelper = (canvasHelper: CanvasHelper) => {

  const gl = canvasHelper.getWebGLContext();

  const frameBuffer = gl.createFramebuffer();
  if (frameBuffer == null) {
    throw new Error("Could not initialize framebuffer.");
  }

  const occluderRenderer = getOccluderRenderer(canvasHelper, frameBuffer);

  const visibilityRenderer = getVisibilityRenderer(canvasHelper, frameBuffer, occluderRenderer.getTexture());

  const mainRenderer = getMainRenderer(canvasHelper, getBufferHandler(gl), occluderRenderer.getTexture(), visibilityRenderer.getTexture());


  // const drawCircleBuffer = vec2.create();
  // const drawCircle = (radius: number, pos: vec2, color: vec4) => {
  //   mat3.translate(modelMatrix, modelMatrix, pos);
  //   mat3.scale(modelMatrix, modelMatrix, vec2.set(drawCircleBuffer, radius, radius));
  //   const buffer = buffers["circle"];
  //   drawBuffer(buffer, color);
  // }

  // const drawRectBuffer = vec2.create();
  // const drawRect = (width: number, height: number, pos: vec2, color: vec4) => {
  //   mat3.translate(modelMatrix, modelMatrix, pos);
  //   mat3.scale(modelMatrix, modelMatrix, vec2.set(drawRectBuffer, width * 0.5, height * 0.5));
  //   const buffer = buffers["rect"];
  //   drawBuffer(buffer, color);
  // }

  // const drawShape = (model: Model, pos: vec2, color: vec4) => {
  //   if (model.kind === "rect") {
  //     const shape = model.shape as Rect;
  //     drawRect(shape.width, shape.height, pos, color);
  //   } else if (model.kind === "circle") {
  //     const shape = model.shape as Circle;
  //     drawCircle(shape.radius, pos, color);
  //   }
  // }

  // const staticObjectsColor = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
  // const drawStaticObjects = (gamestate: GameState) => {
  //   gamestate.scene.staticObjects.forEach(so => {
  //     drawShape(so.model, so.pos, staticObjectsColor);
  //   });
  // }

  // const dynamicObjectsColor = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
  // const drawDynamicObjects = (gamestate: GameState) => {
  //   gamestate.scene.dynamicObjects.forEach(so => {
  //     drawShape(so.model, so.pos, dynamicObjectsColor);
  //   });
  // }

  // const lightColor = vec4.fromValues(0.1, 0.1, 0.1, 1.0);
  // const drawLights = (gamestate: GameState) => {
  //   for (let i = 0; i < gamestate.scene.lights.length; i++) {
  //     drawCircle(0.2, gamestate.scene.lights[i].pos, lightColor)
  //   }
  // }

  // const playerColor = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
  // const drawPlayer = (gamestate: GameState) => {
  //   drawCircle(0.5, gamestate.player.pos, playerColor)
  // }

  return {
    renderOccluders: occluderRenderer.renderOccluders,
    renderVisibility: visibilityRenderer.renderVisibility,
    renderMain: mainRenderer.renderMain
  }
} 