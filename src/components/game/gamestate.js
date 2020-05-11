import { vec2 } from 'gl-matrix'
import { playerModel, rect } from '../models/models'

const player = {
  pos: vec2.fromValues(0.0, 0.0),
  compositeModel: playerModel
}

export const gamestate = {
  player: player,
  camera: vec2.fromValues(0.0, 0.0),
  scene: {
    light: vec2.fromValues(5.0, 5.0),
    items: [
      {
        pos: vec2.fromValues(20.0, -15.0),
        model: rect(5, 30)
      },
      {
        pos: vec2.fromValues(-30.0, 10.0),
        model: rect()
      },
      {
        pos: vec2.fromValues(10.0, -2.5),
        model: rect(5, 5)
      },
      {
        pos: vec2.fromValues(-30.0, -30.0),
        model: rect()
      }
    ]
  }
}