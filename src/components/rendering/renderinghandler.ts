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
  
  const drawGraph = () => {
    const scale = 2.0;
    const offset = -10;
    for (let edge of gamestate.graph.edges) {
      const node1 = gamestate.graph.getNode(edge.from)
      const node2 = gamestate.graph.getNode(edge.to)
      overlayRenderer.drawLine([(node1.i + offset) * scale, (node1.j + offset) * scale], [(node2.i + offset)*scale, (node2.j + offset)*scale], "green")
    }

    for (let node of gamestate.graph.nodes) {
      overlayRenderer.drawCircle([(node.i + offset)*scale, (node.j + offset)*scale], scale/10.0, "green")
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