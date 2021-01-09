import { CanvasHelper } from '../canvashelper'
import { GameState } from '../../game/gamestate';
import { getBufferHandler } from './bufferhandler';
import { getOccluderRenderer } from './occluderrenderer';
import { getVisibilityRenderer } from './visibilityrenderer';
import { getMainRenderer } from './mainrenderer';


export interface GpuRenderer {
  draw(): void;
}

export const getGpuRenderer = (canvasHelper: CanvasHelper, gamestate: GameState) => {
  const gl = canvasHelper.getWebGLContext();

  const frameBuffer = gl.createFramebuffer();
  if (frameBuffer == null) {
    throw new Error("Could not initialize framebuffer.");
  }

  const bufferhandler = getBufferHandler(gl);

  const occluderRenderer = getOccluderRenderer(canvasHelper, bufferhandler, frameBuffer);

  const visibilityRenderer = getVisibilityRenderer(canvasHelper, bufferhandler, frameBuffer, occluderRenderer.getTexture());

  const mainRenderer = getMainRenderer(canvasHelper, getBufferHandler(gl), occluderRenderer.getTexture(), visibilityRenderer.getTexture());

  const draw = () => {
    time(() => occluderRenderer.renderOccluders(gamestate), "occluderRenderer");

    time(() => visibilityRenderer.renderVisibility(gamestate), "visibilityRenderer");

    time(() => mainRenderer.renderMain(gamestate), "mainRenderer");
  }

  function time(f: () => void, ctx: string) {
    const start = performance.now();
    f();
    
    gamestate.logDebug(ctx, "took", (performance.now() - start));
  }

  return {
    draw: () => {
      time(draw, "drawScene");
    }
  }
}