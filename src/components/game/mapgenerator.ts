import { getRandomGenerator } from "../../utils/utils"
import { SceneImpl } from "./gamestate";
import { vec2 } from "gl-matrix";
import { rect } from "../models/models";


type Node = {
  id: number
  i: number
  j: number
}

type Edge = {
  from: number
  to: number
}

export type Graph = {
  nodes: Node[]
  edges: Edge[]
  getNode: (id:number) => Node
}

export const generateScene = (seed: string) => {
  const randomGenerator = getRandomGenerator(seed);
  let scene = new SceneImpl();

  


  const count = 20;
  const nodes: Map<number, Node> = new Map();
  const lattice: number[][] = new Array(0);
  const edges: Edge[] = [];

  let id = 1;
  for (let i = 0; i < count; i++) {
    lattice.push(new Array(count));
    for (let j = 0; j < count; j++) {
      if (randomGenerator() > 0.8) {
        const node = {i: i, j: j, id: id++};
        nodes.set(node.id, node);
        lattice[i][j] = node.id;
        
        for (let mi = i-1; mi >= 0; mi--) {
          if (lattice[mi][j] !== undefined) {
            edges.push({from: node.id, to: lattice[mi][j]})
            break;
          }
        }

        for (let mj = j-1; mj >= 0; mj--) {
          if (lattice[i][mj] !== undefined) {
            edges.push({from: node.id, to: lattice[i][mj]})
            break;
          }
        }
      }
    }
  }

  return {scene: scene, graph: {nodes: Array.from(nodes.values()), edges: edges, getNode: (id: number) => nodes.get(id)!}};


}