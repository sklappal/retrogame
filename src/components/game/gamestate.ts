import { vec2 } from 'gl-matrix'
import { Model, rect, circle } from '../models/models'

export interface ControlState {
    mouse: {
      pos: vec2,
      buttons: Set<number>
    }

    keyboard: {
      buttons: Set<number>
    }

    isKeyPressed: (keyCode: number) => boolean
}

export interface Player  {
  pos: vec2,
  speed: number,
  model: Model,
}

export interface Camera   {
  pos: vec2
}

export interface Config {
  debug: boolean
}

export interface SceneObject {
  model: Model,
  pos: vec2
}

export interface Scene {
  items: ReadonlyArray<SceneObject>
}

export interface GameState {
  player: Player,
  camera: Camera,  
  scene: Scene,
  config: Config,
  gametime: number,
  fps: number
}

const player = {
  pos: vec2.fromValues(0.0, 0.0),
  model: circle(1.0, "red"),
  speed: 0.5
}

export const gamestate = () : GameState => {
  var items: SceneObject[] = []
  for (var i = 0; i < 10; i++) {
    for (var j = 0; j < 10; j++) {
      items.push({
        pos: vec2.fromValues((i-5) * 8.0, (j-5) * 8.0),
        model: rect( 4, 4, "#222222")
      });
    }
  }

  return  {
    config: {debug: false},
    player: player,
    camera: {pos: vec2.fromValues(0.0, 0.0)},
    scene: { items },
    gametime: 0.0,
    fps: 0.0
  }
}