import { vec2 } from 'gl-matrix'
import { Model, rect, circle } from '../models/models'
import { svgString } from './svg'

export interface ControlState {
    mouse: {
      pos: vec2,
      posCanvas: vec2,
      // Actively being pressed
      buttonsPressed: Set<number>,
      // Clicked before this frame
      buttonsClicked: Set<number>
    }

    keyboard: {
      // Actively being pressed
      buttonsPressed: Set<number>,
      // Clicked before this frame
      buttonsClicked: Set<number>
    }

    isKeyPressed: (keyCode: number) => boolean

    clearClickedButtons(): void
}

export interface Player  {
  pos: vec2
  velocity: vec2
  lightradius: number
  maxSpeed: number
  acceleration: number
  model: Model
  aimAngle: number
}

export interface Camera   {
  pos: vec2
  velocity: vec2
  fieldOfView: number
}

export interface Config {
  debug: boolean
}

export interface StaticObject {
  model: Model
  pos: vec2
  isInside: (v: vec2) => boolean
}

export interface DynamicObject extends StaticObject {
  velocity: vec2
}

export interface Scene {
  light: {
    pos:vec2
    radius:number
  }
  staticObjects: ReadonlyArray<StaticObject>
  dynamicObjects: Array<DynamicObject>
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
  lightradius: 35.0,
  velocity: vec2.fromValues(0.0, 0.0),
  model: circle(1.0, "red"),
  maxSpeed: 20.0, // units per second
  acceleration: 50.0, // units per second squared?
  aimAngle: 0.0
}

export const createObject = (thisPos: vec2, model: Model) => {
  return {
    pos: thisPos,
    model: model,
    isInside: (pos: vec2) => model.isInside(vec2.fromValues(pos[0] - thisPos[0], pos[1] - thisPos[1]))
  }
}

export const createDynamicObject  = (thisPos: vec2, velocity: vec2, model: Model) => {
  return {
    ...createObject(thisPos, model),
    velocity: velocity
  }
}

const getAttribute = (foo: SVGRectElement, name: string) => parseFloat(foo.getAttribute(name)!)*0.5;

export const getGameState = () : GameState => {
  var items: StaticObject[] = []
  const count = 10
  const width = 3
  const margin = 1
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      items.push(createObject(
        vec2.fromValues((i-count/2) * (width + 2*margin) + margin + width*0.5, (j-count/2) *(width + 2*margin) + margin + width*0.5),
        rect( width, width, "black")));
    }
  }

  for (let i = 0; i < 12; i++) {
    const angle = i * 2 * Math.PI / 12;
    items.push(createObject(
      vec2.fromValues(Math.cos(angle) * 60.0 , Math.sin(angle) * 60.0),
      circle(10.0, "black")
    ));
  }

  /*const svg = document.createElement('svg');
  svg.innerHTML = svgString;
  
  // <rect id="svg_5" height="117" width="23" y="137.450012" x="110.5" fill-opacity="null" stroke-opacity="null" stroke-width="1.5" stroke="#000" fill="#fff"/>
  const items = Array.from(svg.getElementsByTagName('rect')).map(r => {
    const w = getAttribute(r, "width")
    const h = getAttribute(r, "height")
    return createObject(
      vec2.fromValues(getAttribute(r, "x") + w*0.5, getAttribute(r, "y") + h*0.5),
      rect(w, h, "black") )
  });*/

  return  {
    config: {debug: false},
    player: player,
    camera: {
      pos: vec2.fromValues(0.0, 0.0),
      velocity: vec2.fromValues(0.0, 0.0),
      fieldOfView: 30.0
    },
    scene: {
      light: {pos: vec2.fromValues(10.0, 10.0), radius: 30.0},
      staticObjects: items,
      dynamicObjects: [],
      isInsideObject: (pos: vec2) => items.some(item => item.isInside(pos)),
      ambientColor: "white"
     },
    gametime: 0.0,
    fps: 0.0
  }
}