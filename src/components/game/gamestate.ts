import { vec2, vec3 } from 'gl-matrix'
import { Model, circle } from '../models/models'
import { randomColor, randomColorG } from '../../utils/utils';
import { generateScene, Graph } from './mapgenerator';
//import { svgString } from './svg'

const getObjectId = (() => {
  let id = 0;
  return () => {
    return id++
  }
})();

export interface Light {
  id: number
  pos: vec2
  params: LightParameters
}

export interface LightParameters {
  intensity: number
  color: vec3
  // -pi,pi
  angle?: number
  // 0, 2pi
  angularWidth?: number
}

export interface Player  {
  id: number
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

export interface Debug {
  debug_on: boolean
  light_index_in_focus: number
  seed: string
}

export interface Config {
  debug: Debug
}

export interface StaticObject {
  id: number,
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
  graph: Graph

  createDynamicObject(thisPos: vec2, velocity: vec2, model: Model): void

  removeOlderDynamicObjects(delta: number): void

  logDebug(...s: any[]): void
}

const playerDefault = {
  id: getObjectId(),
  pos: vec2.fromValues(0.0, 0.0),
  light: {
    color: randomColor(),
    intensity: 10.9,
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
  constructor(scene: SceneImpl, graph: Graph, seed: string) {
    this.scene = scene;
    this.graph = graph;
    this.config = {debug: {debug_on: false, light_index_in_focus: -1, seed: seed}};
  }

  player: Player = playerDefault;
  camera: Camera = {
        pos: vec2.fromValues(0.0, 0.0),
        velocity: vec2.fromValues(0.0, 0.0),
        fieldOfView: 40.0
      }
  scene: SceneImpl
  config: Config
  gametime: number = 0;
  fps: number = 60.0;
  graph: Graph

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

  logDebug(...s: any[]) {
    if (this.config.debug.debug_on) {
        console.log(...s);
    }
  }
}

export class SceneImpl implements Scene {
  lights: Light[] = []
  staticObjects: StaticObject[] = []
  
  dynamicObjects: DynamicObject[] = []
  
  isInsideObject(pos: vec2): boolean {
     return this.staticObjects.some(item => item.isInside(pos))
  }

  createObject(thisPos: vec2, model: Model): StaticObject {
    return {
      id: getObjectId(),
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

  createLight(pos: vec2, random: () => number) {
    this.lights.push({
        id: getObjectId(),
        pos: pos,
        params: {
          color: randomColorG(random),
          intensity: 0.9
        }
      })
  }
}

/* eslint-disable-next-line */
const getAttribute = (foo: SVGRectElement, name: string) => parseFloat(foo.getAttribute(name)!)*0.5;


export const getGameState = () : GameState => {

  // const scene = new SceneImpl();
  // const count = 4
  // const width = 3
  // const margin = 1
  // for (let i = 0; i < count; i++) {
  //   for (let j = 0; j < count; j++) {
  //     scene.createStaticObject(
  //       vec2.fromValues((i-count/2) * (width + 2*margin) + margin + width*0.5, (j-count/2) *(width + 2*margin) + margin + width*0.5),
  //       rect( width, width, "black")
  //       );
  //   }
  // }

  // for (let i = 0; i < 12; i++) {
  //   const angle = i * 2 * Math.PI / 12;
  //   scene.createStaticObject(
  //     vec2.fromValues(Math.cos(angle) * 60.0 , Math.sin(angle) * 60.0),
  //     circle(10.0, "black")
  //   );
  // }

  // return new GameStateImpl(scene, {nodes: [], edges: [], getNode: (id:number) => {return {id: 0, i:0, j:0}}})


  const seed = Math.round(Math.random()*10000).toString();
  const generated = generateScene(seed);
  return new GameStateImpl(generated.scene, generated.graph, seed);
}