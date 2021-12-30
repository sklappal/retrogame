
import { CanvasHelper } from './canvashelper';
import { GameState } from '../game/gamestate';
import { getPrimitiveRenderer } from './primitiverenderer'
import { halign, valign } from './primitiverenderer'
import { ControlState } from '../Game';
import { vec2 } from 'gl-matrix';

export const getOverlayRenderer = (canvasHelper: CanvasHelper, gamestate: GameState, controlstate: ControlState) => {

const primitiveRenderer = getPrimitiveRenderer(canvasHelper);

const drawDebugInfo = () => {
  primitiveRenderer.drawTextCanvas(0, `FPS: ${ gamestate.fps.toFixed(1) }`, valign.BOTTOM, halign.RIGHT)
  const text = "Debug (P): " + (gamestate.config.debug.debug_on ? "ON" : "OFF");
  primitiveRenderer.drawTextCanvas(1, text, valign.BOTTOM, halign.RIGHT)
  primitiveRenderer.drawTextCanvas(2, `Seed: ${gamestate.config.debug.seed}`, valign.BOTTOM, halign.RIGHT)
  primitiveRenderer.drawTextCanvas(3, `Pos: ${gamestate.player.pos[0].toFixed(2)} ${gamestate.player.pos[1].toFixed(2)}`, valign.BOTTOM, halign.RIGHT)
}

const drawCursor = () => {

  if (!controlstate.mouse.isCaptured) {
    primitiveRenderer.drawTextCanvas(0, "Please click to capture mouse.", valign.CENTER, halign.CENTER);
    return;
  }

  const color = "rgba(0, 0, 0, 0.5)";

  const pos = controlstate.mouse.posCanvas;

  const ca = Math.cos(gamestate.player.aimAngle);
  const sa = Math.sin(gamestate.player.aimAngle);

  const d = vec2.dist(gamestate.player.pos, controlstate.mouse.pos());

  const s = Math.max(1.0, 0.1 * d);

  const w = 2.0;

  const bigradius = 20.0 * s;
  const smallradius = 5.0 * s;
  
  primitiveRenderer.setTransform(-ca, -sa, sa, -ca, pos[0], pos[1]);

  primitiveRenderer.drawCircleCanvas([0, 0], bigradius, w, color);
  primitiveRenderer.drawCircleCanvas([0, 0], smallradius, w, color);
  
  const lineb = bigradius + 5.0;
  const lines = smallradius;
  primitiveRenderer.drawLineCanvas([lineb, 0.0], [lines, 0.0], w, color);
  primitiveRenderer.drawLineCanvas([-lineb, 0.0], [-lines, 0.0], w, color);
  primitiveRenderer.drawLineCanvas([0.0, lineb], [0.0, lines], w, color);
  primitiveRenderer.drawLineCanvas([0.0, -lineb], [0.0, -lines], w, color);

  primitiveRenderer.resetTransform();
}

const drawGraph = () => {
  const count = 30;
  const scale = 1.0;
  const offset = -count*0.5;

  for (let edge of gamestate.graph.edges) {
    const node1 = gamestate.graph.getNode(edge.from)
    const node2 = gamestate.graph.getNode(edge.to)
    primitiveRenderer.drawLine([(node1.i + offset) * scale, (node1.j + offset) * scale], [(node2.i + offset)*scale, (node2.j + offset)*scale], 1.0, "rgba(0, 0, 0, 0.2)")
  }

  for (let node of gamestate.graph.nodes) {
    primitiveRenderer.drawCircle([(node.i + offset)*scale, (node.j + offset)*scale], scale/10.0, 1.0, "rgba(0, 0, 0, 0.2)")
  }
}


const draw = () => {
  primitiveRenderer.clearCanvas("#00000000");
      
  drawCursor();

  drawDebugInfo();

  drawGraph();

}

return {
  draw: draw
}
}
