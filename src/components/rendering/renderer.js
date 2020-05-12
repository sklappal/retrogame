import primitiveRenderer from './primitiverenderer'
import { findLightVolumes } from './lightvolumes'

const renderer = (canvas, gamestate) => {
  const pr = primitiveRenderer(canvas, gamestate.camera);

  const drawLighting = () => {
    const lightvolumes = findLightVolumes(gamestate);
    const ctx = pr.getContext()
    ctx.filter = "blur(2px)"
    pr.fillPolyRadial(lightvolumes, gamestate.player.pos, 120, "#AAAAAA")
    ctx.filter = "none"
    
  //  lightvolumes.forEach(el => pr.drawLine(gamestate.player.pos, el, "white"))

  }

  const drawPlayer = () => {
    const pos = gamestate.player.pos
    pr.drawCircle(pos, 1.0, "red")
    //pr.drawCompositeModel(pos, gamestate.player.compositeModel);
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

export default renderer;