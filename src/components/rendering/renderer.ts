import primitiveRenderer from './primitiverenderer'
import { findVisibleRegion } from './visibility'
import { GameState } from '../game/gamestate';

export const getRenderer = (canvas : HTMLCanvasElement, gamestate: GameState) => {
  const pr = primitiveRenderer(canvas, gamestate);

  const drawLighting = () => {
    const lightvolumes = findVisibleRegion(gamestate.player.pos, gamestate.scene.items);
    const ctx = pr.getContext()
    ctx.filter = "blur(2px)"
    pr.fillPolyRadial(lightvolumes, gamestate.player.pos, 120, "#AAAAAA")
    ctx.filter = "none"
  }

  const drawPlayer = () => {
    const pos = gamestate.player.pos
    pr.drawCircle(pos, 1.0, "red")
  }

  const drawWorld = () => {
    gamestate.scene.items.forEach(el => pr.drawModel(el.pos, el.model))
  }

  return {
    draw: () => {
      pr.clearCanvas();
      
      drawLighting();
      drawWorld();
      drawPlayer();
    },
    drawOverlay: () => {
      var text = "FPS: " + gamestate.fps.toFixed(1)   
      pr.drawTextCanvas([pr.width()-120, pr.height()-40], text)
    }
  }
}