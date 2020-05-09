import { vec2 } from 'gl-matrix'
import { playerModel, boxModel } from '../models/models'

const player = {
  pos: vec2.fromValues(0.0, 0.0),
  model: playerModel
}

export const gamestate = {
  player: player,
  camera: vec2.fromValues(0.0, 0.0),
  scene: {
    items: [
      {
        pos: vec2.fromValues(10.0, 10.0),
        model: boxModel(200, 20)
      },
      {
        pos: vec2.fromValues(-30.0, 10.0),
        model: boxModel()
      },
      {
        pos: vec2.fromValues(10.0, -30.0),
        model: boxModel()
      },
      {
        pos: vec2.fromValues(-30.0, -30.0),
        model: boxModel()
      }
    ]
  }
}