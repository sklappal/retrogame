import { PrimitiveRenderer } from './primitiverenderer'
import { findVisibleRegion } from './visibility'
import { GameState } from '../game/gamestate';
import { vec2 } from 'gl-matrix';

export const getRenderer = (primitiverenderer: PrimitiveRenderer, gamestate: GameState) => {
  
  const drawLighting = () => {
    const ctx = primitiverenderer.getContext()
    ctx.filter = "blur(2px)"
    
    
    
    const lightvolumes2 = findVisibleRegion(gamestate.scene.light, 40.0, gamestate.scene.staticObjects);
    primitiverenderer.fillPolyRadial(lightvolumes2, gamestate.scene.light, 40, "#808080")
    
    const lightvolumes = findVisibleRegion(gamestate.player.pos, 120.0, gamestate.scene.staticObjects);
    primitiverenderer.fillPolyRadial(lightvolumes, gamestate.player.pos, 120, "#808080")

    ctx.filter = "none"
  }

  const drawPlayer = () => {
    const pos = gamestate.player.pos
    primitiverenderer.drawCircle(pos, 1.0, "red")

    const aimAngle = gamestate.player.aimAngle;
    primitiverenderer.drawLine(pos, vec2.add(vec2.create(), gamestate.player.pos, vec2.fromValues(Math.cos(aimAngle), Math.sin(aimAngle))), "black");
  }

  const drawWorld = () => {
    gamestate.scene.staticObjects.forEach(el => primitiverenderer.drawModel(el.pos, el.model))
    gamestate.scene.dynamicObjects.forEach(el => primitiverenderer.drawModel(el.pos, el.model))

    primitiverenderer.drawCircle(gamestate.scene.light, 0.5, "white")
  }

  return {
    draw: () => {
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