import { vec2, vec3 } from 'gl-matrix'
import { Model, rect, circle } from '../models/models'
import { randomColor } from '../../utils/utils';
//import { svgString } from './svg'

export interface LightParameters {
  intensity: number
  color: vec3
  // -pi,pi
  angle: number | null
  // 0, 2pi
  angularWidth: number | null
}

export interface Player  {
  pos: vec2  
  velocity: vec2
  maxSpeed: number
  acceleration: number
  model: Model
  aimAngle: number
  light: LightParameters
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
  creationTime: number
}

export interface Scene {
  lights: Light[]
  staticObjects: ReadonlyArray<StaticObject>
  dynamicObjects: Array<DynamicObject>
  isInsideObject: (pos: vec2) => boolean
}

export interface GameState {
  player: Player
  camera: Camera
  scene: Scene
  config: Config
  gametime: number
  fps: number

  createDynamicObject(thisPos: vec2, velocity: vec2, model: Model): void

  removeOlderDynamicObjects(delta: number): void
}

const playerDefault = {
  pos: vec2.fromValues(0.0, 0.0),
  light: {
    color: randomColor(),
    intensity: 0.1,
    angle: 0.0,
    angularWidth: 0.2*Math.PI
  },
  velocity: vec2.fromValues(0.0, 0.0),
  model: circle(1.0, "red"),
  maxSpeed: 20.0, // units per second
  acceleration: 50.0, // units per second squared?
  aimAngle: 0.0
}

export class GameStateImpl implements GameState {
  constructor(scene: SceneImpl) {
    this.scene = scene;
  }

  player: Player = playerDefault;
  camera: Camera = {
        pos: vec2.fromValues(0.0, 0.0),
        velocity: vec2.fromValues(0.0, 0.0),
        fieldOfView: 40.0
      }
  scene: SceneImpl
  config: Config = {debug: false}
  gametime: number = 0;
  fps: number = 60.0;
  
  createDynamicObject(thisPos: vec2, velocity: vec2, model: Model): void {
    this.scene.createDynamicObject(thisPos, velocity, model, this.gametime);
  }

  removeOlderDynamicObjects(delta: number) {
    for (let i = this.scene.dynamicObjects.length-1; i >= 0; i--) {
      if (this.scene.dynamicObjects[i].creationTime < this.gametime - delta) {
        this.scene.dynamicObjects.splice(i, 1);
      }
    }
  }
}

export interface Light {
  pos: vec2
  params: LightParameters
}

export class SceneImpl implements Scene {
  lights: Light[] = [
    {
      pos: vec2.fromValues(10.0, 10.0),
      params: {
        color: vec3.fromValues(0.4, 0.4, 0.0),
        intensity: 1.0,
        angle: null,
        angularWidth: null
      }
    },
    {
      pos: vec2.fromValues(100.0, 0.0),
      params: {
        color: vec3.fromValues(0.4, 0.4, 0.0),
        intensity: 1.0,
        angle: null,
        angularWidth: null
      }
    }
  ];
  
  staticObjects: StaticObject[] = []
  
  dynamicObjects: DynamicObject[] = []
  
  isInsideObject(pos: vec2): boolean {
     return this.staticObjects.some(item => item.isInside(pos))
  }

  createObject(thisPos: vec2, model: Model): StaticObject {
    return {
      pos: thisPos,
      model: model,
      isInside: (pos: vec2) => model.isInside(vec2.fromValues(pos[0] - thisPos[0], pos[1] - thisPos[1]))
    }
  }

  createStaticObject(thisPos: vec2, model: Model): void {
    this.staticObjects.push(this.createObject(thisPos, model));
  }

  createDynamicObject(thisPos: vec2, velocity: vec2, model: Model, creationTime: number): void {
    this.dynamicObjects.push({
      ...this.createObject(thisPos, model),
      velocity: velocity,
      creationTime: creationTime
    });
  }
}

const getAttribute = (foo: SVGRectElement, name: string) => parseFloat(foo.getAttribute(name)!)*0.5;


export const getGameState = () : GameState => {
  let scene = new SceneImpl();
  const count = 10
  const width = 3
  const margin = 1
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      scene.createStaticObject(
        vec2.fromValues((i-count/2) * (width + 2*margin) + margin + width*0.5, (j-count/2) *(width + 2*margin) + margin + width*0.5),
        rect( width, width, "black")
        );
    }
  }

  for (let i = 0; i < 12; i++) {
    const angle = i * 2 * Math.PI / 12;
    scene.createStaticObject(
      vec2.fromValues(Math.cos(angle) * 60.0 , Math.sin(angle) * 60.0),
      circle(10.0, "black")
    );
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

  return new GameStateImpl(scene);
}