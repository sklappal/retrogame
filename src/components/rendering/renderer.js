import primitiveRenderer from './primitiverenderer'
import findShadowVolumes from './shadowvolumes'

const renderer = (canvas, gamestate) => {
  const pr = primitiveRenderer(canvas, gamestate.camera);

  const drawPlayer = () => {
    const pos = gamestate.player.pos
    pr.drawModel(pos, gamestate.player.model);
  }

  const renderShadowVolumes = () => {
    const shadowVolumes = findShadowVolumes(gamestate)
    shadowVolumes.forEach(el => pr.fillPoly(el))
  }

  return {
    draw: () => {
      pr.drawRadialGradient([gamestate.player.pos[0], gamestate.player.pos[1]+2.0], 140.0 + Math.sin(gamestate.gametime*3)*2.0)
      drawPlayer(gamestate);
      gamestate.scene.items.forEach(el => pr.drawModel(el.pos, el.model))
      renderShadowVolumes(gamestate)
    },
    drawOverlay: () => {
      var text = "FPS: " + gamestate.fps.toFixed(1)   
      pr.drawTextCanvas([pr.width()-120, pr.height()-40], text)
    }
  }
}

export default renderer;