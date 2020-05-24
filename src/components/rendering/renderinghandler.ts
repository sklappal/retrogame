import { PrimitiveRenderer } from './primitiverenderer'
import { GameState } from '../game/gamestate';
import { GpuRenderer } from './gpurenderer';

export interface RenderingHandler {
  draw(): void;
}

export const getRenderingHandler = (
    gpuRenderer: GpuRenderer,
    overlayRenderer: PrimitiveRenderer,
    gamestate: GameState) => {

  const drawGpu = () => {
    gpuRenderer.draw();
  }

  const drawOverlay = () => {
    overlayRenderer.clearCanvas("#00000000");
    var text = "FPS: " + gamestate.fps.toFixed(1)   
    overlayRenderer.drawTextCanvas([overlayRenderer.width()-120, overlayRenderer.height()-40], text)
  }
  
  return {
    draw: () => {
      drawGpu();

      drawOverlay();
    }
  }
}