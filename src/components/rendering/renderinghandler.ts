import { getPrimitiveRenderer } from './primitiverenderer'
import { GameState } from '../game/gamestate';
import { GpuRenderer } from './gpu/gpurenderer';
import { halign, valign } from './primitiverenderer'
import { ControlState } from '../Game';
import { vec2 } from 'gl-matrix';
import { CanvasHelper } from './canvashelper';

export interface RenderingHandler {
  draw(): void;
}

export const getRenderingHandler = (
    gpuRenderer: GpuRenderer,
    canvasHelper: CanvasHelper,
    gamestate: GameState,
    controlstate: ControlState) => {

  const overlayRenderer = getPrimitiveRenderer(canvasHelper);

  const drawGpu = () => {
    gpuRenderer.draw();
  }

  const drawDebugInfo = () => {
    overlayRenderer.drawTextCanvas(0, `FPS: ${ gamestate.fps.toFixed(1) }`, valign.BOTTOM, halign.RIGHT)
    const text = "Debug (P): " + (gamestate.config.debug.debug_on ? "ON" : "OFF");
    overlayRenderer.drawTextCanvas(1, text, valign.BOTTOM, halign.RIGHT)
    overlayRenderer.drawTextCanvas(2, `Seed: ${gamestate.config.debug.seed}`, valign.BOTTOM, halign.RIGHT)
    overlayRenderer.drawTextCanvas(3, `Pos: ${gamestate.player.pos[0].toFixed(2)} ${gamestate.player.pos[1].toFixed(2)}`, valign.BOTTOM, halign.RIGHT)
  }

  const drawCursor = () => {

    const color = "rgba(0, 0, 0, 0.5)";

    const pos = controlstate.mouse.posCanvas;

    const ca = Math.cos(gamestate.player.aimAngle);
    const sa = Math.sin(gamestate.player.aimAngle);

    const d = vec2.dist(gamestate.player.pos, controlstate.mouse.pos());

    const s = Math.max(1.0, 0.1 * d);

    const w = 2.0;

    const bigradius = 20.0 * s;
    const smallradius = 5.0 * s;
    
    overlayRenderer.setTransform(-ca, -sa, sa, -ca, pos[0], pos[1]);

    overlayRenderer.drawCircleCanvas([0, 0], bigradius, w, color);
    overlayRenderer.drawCircleCanvas([0, 0], smallradius, w, color);
    
    const lineb = bigradius + 5.0;
    const lines = smallradius;
    overlayRenderer.drawLineCanvas([lineb, 0.0], [lines, 0.0], w, color);
    overlayRenderer.drawLineCanvas([-lineb, 0.0], [-lines, 0.0], w, color);
    overlayRenderer.drawLineCanvas([0.0, lineb], [0.0, lines], w, color);
    overlayRenderer.drawLineCanvas([0.0, -lineb], [0.0, -lines], w, color);

    overlayRenderer.resetTransform();
  }
  
  const drawGraph = () => {
    const count = 30;
    const scale = 1.0;
    const offset = -count*0.5;

    for (let edge of gamestate.graph.edges) {
      const node1 = gamestate.graph.getNode(edge.from)
      const node2 = gamestate.graph.getNode(edge.to)
      overlayRenderer.drawLine([(node1.i + offset) * scale, (node1.j + offset) * scale], [(node2.i + offset)*scale, (node2.j + offset)*scale], 1.0, "rgba(0, 0, 0, 0.2)")
    }

    for (let node of gamestate.graph.nodes) {
      overlayRenderer.drawCircle([(node.i + offset)*scale, (node.j + offset)*scale], scale/10.0, 1.0, "rgba(0, 0, 0, 0.2)")
    }
  }


  return {
    draw: () => {
      drawGpu();

      overlayRenderer.clearCanvas("#00000000");
      
      drawCursor();

      drawDebugInfo();

      drawGraph();

    }
  }
}