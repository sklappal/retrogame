import canvasUtils from './canvasutils'
import findShadowVolumes from './shadowvolumes'

const renderer = (canvas) => {
  const cu = canvasUtils(canvas);

  const drawPlayer = gamestate => {
    const pos = gamestate.player.pos
    cu.drawModel(pos, gamestate.player.model);
  }

  const renderShadowVolumes = gamestate => {
    const shadowVolumes = findShadowVolumes(gamestate)
    shadowVolumes.forEach(el => cu.fillPoly(el))
  }

  return {
    draw: (gamestate) => {
      cu.drawRadialGradient([gamestate.player.pos[0], gamestate.player.pos[1]+2.0], 20.0 + Math.sin(gamestate.gametime*3)*2.0)
      drawPlayer(gamestate);
      gamestate.scene.items.forEach(el => cu.drawModel(el.pos, el.model))
      renderShadowVolumes(gamestate)
    },
    drawOverlay: gamestate => {
      var text = "FPS: " + gamestate.fps.toFixed(1)   
      cu.drawTextCanvas([cu.width()-120, cu.height()-40], text)
    }
  }
}

export default renderer;