import { vec2 } from 'gl-matrix'
import { playerModel, rect } from '../models/models'

const player = {
  pos: vec2.fromValues(0.0, -3.2),
  compositeModel: playerModel,
  speed: 0.5
}

export const gamestate = () => {
  var items = []
  for (var i = 0; i < 10; i++) {
    for (var j = 0; j < 10; j++) {
      items.push({
        pos: vec2.fromValues((i-5) * 8.0, (j-5) * 8.0),
        model: rect(4, 4, "#222222")
      })
    }
  }


  return  {
    debug: false,
    player: player,
    camera: vec2.fromValues(0.0, 0.0),
    scene: {
      light: vec2.fromValues(5.0, 5.0),
      items: items
    }
  }
}