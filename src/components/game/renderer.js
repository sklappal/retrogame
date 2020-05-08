import canvasUtils from './canvasutils'

const renderer = (canvas) => {

  const cu = canvasUtils(canvas);

  const drawPlayer = gamestate => {
    const pos = gamestate.player.pos
    const x = pos[0]
    const y = pos[1]
    cu.drawCircle(pos, 0.5) // head
    cu.drawCircle([x-0.25, y-0.1], 0.05, "white") // eye
    cu.drawCircle([x+0.25, y-0.1], 0.05, "white") // eye

    cu.drawCircle([x, y+0.5], 0.1, "white") // eye
    
    cu.drawLine([x,y+1.0], [x, y + 4.0]) // torso
    cu.drawLine([x-2.0, y + 2.0], [x+2.0, y + 2.0]) // arms
    cu.drawLine([x-1.0, y + 6.5], [x, y + 4.0]) // left leg
    cu.drawLine([x+1.0, y + 6.5], [x, y + 4.0]) // right leg 

    cu.drawLine([x + 1.8, y + 2.0], [x + 2.0, y + 0.5]) // torch
    cu.drawCircle([x + 2.0, y + 0.5], 0.2, "lightgray") // torch head
  }

  return {
    draw: (gamestate) => {
      cu.drawRadialGradient([gamestate.player.pos[0], gamestate.player.pos[1]+2.0], 20.0 + Math.sin(gamestate.gametime*3)*2.0);
      drawPlayer(gamestate);
    },
    drawOverlay: gamestate => {
      var text = "FPS: " + gamestate.fps.toFixed(1);      
      cu.drawTextCanvas([cu.width()-120, cu.height()-40], text)
    }
  }
}

export default renderer;