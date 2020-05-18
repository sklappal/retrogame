import { PrimitiveRenderer } from './primitiverenderer'
import { findVisibleRegion } from './visibility'
import { GameState } from '../game/gamestate';
import { vec2 } from 'gl-matrix';

export const getRenderingHandler = (mainRenderer: PrimitiveRenderer, gamestate: GameState) => {
  
  const drawLighting = () => {
    const ctx = mainRenderer.getContext()
    ctx.filter = "blur(2px)"
    
    const lightvolumes2 = findVisibleRegion(gamestate.scene.light, 40.0, gamestate.scene.staticObjects);
    mainRenderer.fillPolyRadial(lightvolumes2, gamestate.scene.light, 40, "#808080")
    
    const lightvolumes = findVisibleRegion(gamestate.player.pos, 120.0, gamestate.scene.staticObjects);
    mainRenderer.fillPolyRadial(lightvolumes, gamestate.player.pos, 120, "#808080")

    ctx.filter = "none"
  }

  const drawPlayer = () => {
    const pos = gamestate.player.pos
    mainRenderer.drawCircle(pos, 1.0, "red")

    const aimAngle = gamestate.player.aimAngle;
    mainRenderer.drawLine(pos, vec2.add(vec2.create(), gamestate.player.pos, vec2.fromValues(Math.cos(aimAngle), Math.sin(aimAngle))), "black");
  }

  const drawDynamicObjects = () => {
    gamestate.scene.dynamicObjects.forEach(el => mainRenderer.drawModel(el.pos, el.model))
  }

  const drawStaticObjects = () => {
    gamestate.scene.staticObjects.forEach(el => mainRenderer.drawModel(el.pos, el.model))
  }

  const drawLights = () => {
    mainRenderer.drawCircle(gamestate.scene.light, 0.5, "white")
  }

  const drawOverlay = () => {
    var text = "FPS: " + gamestate.fps.toFixed(1)   
    mainRenderer.drawTextCanvas([mainRenderer.width()-120, mainRenderer.height()-40], text)
  }
  
  return {
    draw: () => {
      mainRenderer.clearCanvas(gamestate.scene.ambientColor);
      
      drawStaticObjects();
      drawPlayer();
      drawDynamicObjects();
      drawLights();
      drawOverlay();
    }
  }
}

export const getOverlayRenderingHandler = (overlayRenderer: PrimitiveRenderer, gamestate: GameState) => {
  return {
    drawOverlay: () =>  {
      overlayRenderer.clearCanvas("#00000000");
      var text = "FPS: " + gamestate.fps.toFixed(1)   
      overlayRenderer.drawTextCanvas([overlayRenderer.width()-120, overlayRenderer.height()-40], text)
    }
  }
}