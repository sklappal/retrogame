import { PrimitiveRenderer } from './primitiverenderer'
import { GameState } from '../game/gamestate';
import { GpuRenderer } from './gpu/gpurenderer';
import { halign, valign } from './primitiverenderer'

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
    overlayRenderer.drawTextCanvas(0, `FPS: ${ gamestate.fps.toFixed(1) }`, valign.BOTTOM, halign.RIGHT)
    const text = "Debug (P): " + (gamestate.config.debug.debug_on ? "ON" : "OFF");
    overlayRenderer.drawTextCanvas(1, text, valign.BOTTOM, halign.RIGHT)
    overlayRenderer.drawTextCanvas(2, `Seed: ${gamestate.config.debug.seed}`, valign.BOTTOM, halign.RIGHT)
    overlayRenderer.drawTextCanvas(3, `Pos: ${gamestate.player.pos[0].toFixed(2)} ${gamestate.player.pos[1].toFixed(2)}`, valign.BOTTOM, halign.RIGHT)
  }
    
/* eslint-disable-next-line */
  const drawGraph = () => {
    const count = 30;
    const scale = 1.0;
    const offset = -count*0.5;

    for (let edge of gamestate.graph.edges) {
      const node1 = gamestate.graph.getNode(edge.from)
      const node2 = gamestate.graph.getNode(edge.to)
      overlayRenderer.drawLine([(node1.i + offset) * scale, (node1.j + offset) * scale], [(node2.i + offset)*scale, (node2.j + offset)*scale], "rgba(0, 0, 0, 0.2)")
    }

    for (let node of gamestate.graph.nodes) {
      overlayRenderer.drawCircle([(node.i + offset)*scale, (node.j + offset)*scale], scale/10.0, "rgba(0, 0, 0, 0.2)")
    }
  }


  return {
    draw: () => {
      drawGpu();

      drawOverlay();

      drawGraph();

    }
  }
}