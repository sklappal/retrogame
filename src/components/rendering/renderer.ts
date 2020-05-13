import { PrimitiveRenderer } from './primitiverenderer'
import { findVisibleRegion } from './visibility'
import { GameState } from '../game/gamestate';

export const getRenderer = (primitiverenderer: PrimitiveRenderer, gamestate: GameState) => {
  
  const drawLighting = () => {
    const lightvolumes = findVisibleRegion(gamestate.player.pos, gamestate.scene.items);
    const ctx = primitiverenderer.getContext()
    ctx.filter = "blur(2px)"
    primitiverenderer.fillPolyRadial(lightvolumes, gamestate.player.pos, 120, "#AAAAAA")
    ctx.filter = "none"
  }

  const drawPlayer = () => {
    const pos = gamestate.player.pos
    primitiverenderer.drawCircle(pos, 1.0, "red")
  }

  const drawWorld = () => {
    gamestate.scene.items.forEach(el => primitiverenderer.drawModel(el.pos, el.model))
  }

  return {
    draw: () => {

      const dims = primitiverenderer.canvasDimensionsWorld();
      primitiverenderer.clearCanvas();
      
      drawLighting();
      drawWorld();
      drawPlayer();
    },
    drawOverlay: () => {
      var text = "FPS: " + gamestate.fps.toFixed(1)   
      primitiverenderer.drawTextCanvas([primitiverenderer.width()-120, primitiverenderer.height()-40], text)
    }
  }
}