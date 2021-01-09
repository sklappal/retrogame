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

  const bufferhandler = getBufferHandler(gl);

  const occluderRenderer = getOccluderRenderer(canvasHelper, bufferhandler, frameBuffer);

  const visibilityRenderer = getVisibilityRenderer(canvasHelper, frameBuffer, occluderRenderer.getTexture());

  const mainRenderer = getMainRenderer(canvasHelper, getBufferHandler(gl), occluderRenderer.getTexture(), visibilityRenderer.getTexture());

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