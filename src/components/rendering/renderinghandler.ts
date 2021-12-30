import { GameState } from '../game/gamestate';
import { getGpuRenderer } from './gpu/gpurenderer';
import { ControlState } from '../Game';
import { CanvasHelper } from './canvashelper';
import { getOverlayRenderer } from './overlayrenderer';

export interface RenderingHandler {
  draw(): void;
}

export const getRenderingHandler = (
    gpuCanvasHelper: CanvasHelper,
    canvasHelper: CanvasHelper,
    gamestate: GameState,
    controlstate: ControlState) => {

  const gpuRenderer = getGpuRenderer(gpuCanvasHelper, gamestate, controlstate);

  const overlayRenderer = getOverlayRenderer(canvasHelper, gamestate, controlstate);

  return {
    draw: () => {
      gpuRenderer.draw();
      overlayRenderer.draw();
    }
  }
}