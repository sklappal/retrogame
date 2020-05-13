import { vec2 } from 'gl-matrix'
import { Model, rect, circle } from '../models/models'

export interface ControlState {
    mouse: {
      pos: vec2,
      posCanvas: vec2,
      buttons: Set<number>
    }

    keyboard: {
      buttons: Set<number>
    }

    isKeyPressed: (keyCode: number) => boolean
}

export interface Player  {
  pos: vec2
  velocity: vec2
  maxSpeed: number
  acceleration: number
  model: Model
  aimAngle: number
}

export interface Camera   {
  pos: vec2
  velocity: vec2

  // number of world units visible on the smaller dimension of camera
  fieldOfview: number
}

export interface Config {
  debug: boolean
}

export interface SceneObject {
  model: Model
  pos: vec2
  isInside: (v: vec2) => boolean
}

export interface Scene {
  light: vec2,
  items: ReadonlyArray<SceneObject>
  isInsideObject: (pos: vec2) => boolean
  ambientColor: string
}

export interface GameState {
  player: Player
  camera: Camera
  scene: Scene
  config: Config
  gametime: number
  fps: number
}

const player = {
  pos: vec2.fromValues(0.0, 0.0),
  velocity: vec2.fromValues(0.0, 0.0),
  model: circle(1.0, "red"),
  maxSpeed: 0.5,
  acceleration: 0.5,
  aimAngle: 0.0
}

const createObject  = (thisPos: vec2, model: Model) => {
  return {
    pos: thisPos,
    model: model,
    isInside: (pos: vec2) => model.isInside(vec2.fromValues(pos[0] - thisPos[0], pos[1] - thisPos[1]))
  }
}

export const getGameState = () : GameState => {
  var items: SceneObject[] = []
  const count = 10
  const width = 3
  const margin = 1
  for (var i = 0; i < count; i++) {
    for (var j = 0; j < count; j++) {
      items.push(createObject(
        vec2.fromValues((i-count/2) * (width + 2*margin) + margin + width*0.5, (j-count/2) *(width + 2*margin) + margin + width*0.5),
        rect( width, width, "black")));
    }
  }

  for (var i = 0; i < 12; i++) {
    const angle = i * 2 * Math.PI / 12;
    items.push(createObject(
      vec2.fromValues(Math.cos(angle) * 60.0 , Math.sin(angle) * 60.0),
      circle(10.0, "black")
    ));
  }

  return  {
    config: {debug: false},
    player: player,
    camera: {
      pos: vec2.fromValues(0.0, 0.0),
      velocity: vec2.fromValues(0.0, 0.0),
      fieldOfview: 100.0
    },
    scene: {
      light: vec2.fromValues(10.0, 10.0),
      items: items,
      isInsideObject: (pos: vec2) => items.some(item => item.isInside(pos)),
      ambientColor: "#080808"
     },
    gametime: 0.0,
    fps: 0.0
  }
}