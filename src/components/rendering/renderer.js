import primitiveRenderer from './primitiverenderer'
import { findShadowVolumes, findLightVolumes, findLightVolume2 } from './shadowvolumes'

const renderer = (canvas, gamestate) => {
  const pr = primitiveRenderer(canvas, gamestate.camera);

  const drawLighting = () => {
    pr.drawRadialGradient([gamestate.player.pos[0], gamestate.player.pos[1]+2.0], 140.0 + Math.sin(gamestate.gametime*3)*2.0, "#FFFFFFFF")

  }

  const drawPlayer = () => {
    const pos = gamestate.player.pos
    pr.drawCompositeModel(pos, gamestate.player.compositeModel);
  }

  const drawWorld = () => {
    gamestate.scene.items.forEach(el => pr.drawModel(el.pos, el.model))
  }

  const drawShadows = () => {
    const shadowVolumes = findShadowVolumes(gamestate)
    shadowVolumes.forEach(el => pr.fillPoly(el))
  }

  return {
    draw: () => {
      const ctx = pr.getContext();
      ctx.globalCompositeOperation = "source-over";
      pr.clearCanvas();
      drawLighting();
      drawPlayer();
      drawWorld();
      drawShadows();
    },
    drawOverlay: () => {
      var text = "FPS: " + gamestate.fps.toFixed(1)   
      pr.drawTextCanvas([pr.width()-120, pr.height()-40], text)
    }
  }
}

export default renderer;