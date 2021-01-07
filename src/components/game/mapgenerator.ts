import { getRandomGenerator } from "../../utils/utils"
import { SceneImpl } from "./gamestate";
import {Delaunay} from "d3-delaunay";
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
  
  const count = 30;
  
  const delaunay = getDelaunay(count, randomGenerator);

  const graph = getGraph(delaunay, randomGenerator);

  const minSpanningTree = getSpanningTree(graph, randomGenerator);

  const subdivisions = 5;

  const grid = getGrid(minSpanningTree, count, subdivisions)

  const rects = findRects(grid, subdivisions)

  const scale = 40.0;
  const offset = vec2.fromValues(-graph.nodes[0].i, -graph.nodes[0].j)

  const gridToWorld = (i:number, j:number) => {
    return vec2.fromValues(scale * (i + offset[0]), scale * (j + offset[1]));
  }

  let scene = new SceneImpl();
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    const pos = gridToWorld(r.i + r.side * 0.5, r.j + r.side*0.5)
    
    scene.createStaticObject(pos, rect(scale * r.side + randomGenerator()*2.0, scale * r.side + randomGenerator()*2.0));
    //scene.createStaticObject(pos, circle(scale * r.side*0.5)); for inspiration
  }

  let lightCount = 0;
  for (let node of graph.nodes) {
    lightCount++;
    if (lightCount > 45)
      break;
    scene.createLight(gridToWorld(node.i, node.j), () => randomGenerator())
  }

  return {scene: scene, graph: minSpanningTree};

}

const getDelaunay = (count: number, rand: () => number) => {
  const points = [];
  
  for (let i = 1; i < count-1; i++) {
    for (let j = 1; j < count-1; j++) {
      if (rand() > 0.9) {
        points.push(vec2.fromValues(i, j));
      }
    }
  }
  return Delaunay.from(points.map(v => [v[0], v[1]]));
}

const getGraph = (delaunay: Delaunay<number[]>, rand: () => number) => {
  let {points, halfedges, triangles} = delaunay;


  let nodes = new Map<number, Node>();

  const randomOffset = () => (rand() - 0.5)*0.8

  for (let i = 0; i < points.length; i+=2) {
    const node = {
      id: i/2,
      i: points[i] + randomOffset(),
      j: points[i+1] + randomOffset()
    };
    nodes.set(node.id, node);
  }

  let edges = [];
  for (let i = 0; i < halfedges.length; i++) {
    const j = halfedges[i];    
    if (j < i) continue;
    const ti = triangles[i];
    const tj = triangles[j];
    edges.push({from: ti, to: tj})
  }

  return {nodes: Array.from(nodes.values()), edges: edges, getNode: (id: number) => nodes.get(id)!};
}

const getSpanningTree = (graph: Graph, rand: () => number) => {
  const nodesInTree = new Map<number, Node>();
  const nodesNotInTree = new Map<number, Node>(graph.nodes.map(node => [node.id, node]));

  const firstNode = graph.nodes[0];
  nodesInTree.set(firstNode.id, firstNode);
  nodesNotInTree.delete(firstNode.id);
  const edges = [];
  while (nodesInTree.size < graph.nodes.length) {
    const candidateEdges = graph.edges.filter(edge => {
      return (nodesInTree.has(edge.from) && nodesNotInTree.has(edge.to)) || (nodesNotInTree.has(edge.from) && nodesInTree.has(edge.to))
    });
    if (candidateEdges.length === 0) {
     // the algorithm should always find candidate edges but it doesn't?? annoying.
      break;
    }
    const randomEdge = candidateEdges[Math.floor(rand() * candidateEdges.length)];
    edges.push(randomEdge);
    const index = graph.edges.indexOf(randomEdge);
    graph.edges.splice(index, 1);
    if (nodesInTree.has(randomEdge.from)) {
      nodesInTree.set(randomEdge.to, graph.getNode(randomEdge.to))
      nodesNotInTree.delete(randomEdge.to)
    } else {
      nodesInTree.set(randomEdge.from, graph.getNode(randomEdge.from))
      nodesNotInTree.delete(randomEdge.from)
    }
  }

  const edgeCount = edges.length;
  for (let i = 0; i < 0.4 * edgeCount; i++) {
    const randomEdge = graph.edges[Math.floor(rand() * graph.edges.length)];
    edges.push(randomEdge);
  }
 


  return {nodes: Array.from(nodesInTree.values()), edges: edges, getNode: (id: number) => nodesInTree.get(id)!};

}

function distToSegmentSquared(p:vec2, v:vec2, w:vec2) {
  var l2 = vec2.squaredDistance(v, w);
  if (l2 === 0) return vec2.squaredDistance(p, v);
  var t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return vec2.squaredDistance(p, [v[0] + t * (w[0] - v[0]), v[1] + t * (w[1] - v[1])]);
}

const getGrid = (graph: Graph, count: number, subdivisions: number) => {
  const sideLength = count * subdivisions;

  const ijToGrid = (i: number, j: number) => vec2.fromValues((i + 0.5)*subdivisions, (j + 0.5)*subdivisions)

  let grid = new Uint8Array(sideLength * sideLength);

  const gridPointSize = 4 / subdivisions;

  for (let j = 0; j < sideLength; j++) {
    for (let i = 0; i < sideLength; i++) {
      const gridIndex = j * sideLength + i;
      grid[gridIndex] = 1;
      for (let e = 0; e < graph.edges.length; e++) {
        const edge = graph.edges[e];
        const from = graph.getNode(edge.from);
        const to = graph.getNode(edge.to);
        const fromGrid = ijToGrid(from.i, from.j)
        const toGrid = ijToGrid(to.i, to.j)
        
        const curPos = vec2.fromValues(i+0.5,j+0.5);
        const distanceSquared = distToSegmentSquared(curPos, fromGrid, toGrid)

        if (distanceSquared < gridPointSize * gridPointSize) {
          grid[gridIndex] = 0;
          break;
        }

        if (vec2.squaredDistance(curPos, fromGrid) < 10 || vec2.squaredDistance(curPos, toGrid) < 10) {
          grid[gridIndex] = 0;
          break;
        }
      }
    }
  }

  return grid;
}

const findRects = (grid: Uint8Array, subdivisions: number) => {

  const sideLength = Math.sqrt(grid.length);

  const forEveryPoint = (fromi:number, fromj:number, count:number, func:((i:number, j:number) => boolean)) => {
    for (let j = fromj; j < fromj+count; j++) {
      for (let i = fromi; i < fromi+count; i++) {
        if (!func(i, j)) {
          return false;
        }
      }
    }
    return true;
  }

  const fitsSquare = (i: number, j: number, squareSide: number) => {
    const result = forEveryPoint(i, j, squareSide, (ii:number, jj:number) => {
      if (ii >= sideLength || jj >= sideLength) {
        return false;
      }
      const gridIndex = jj * sideLength + ii;
      if (grid[gridIndex] !== 1) {
        return false;
      }
      return true;
    })

    return result;
  }

  const renderSquare = (i:number, j:number, squareSide: number) => {
    forEveryPoint(i, j, squareSide, (ii:number, jj:number) => {
        const gridIndex = jj * sideLength + ii;
        grid[gridIndex] = 2;
        return true;
      }
    );
  }

  const squareSides = [10, 5, 2, 1];
  const rects = [];

  for (let squareSide of squareSides) {
    for (let j = 0; j < sideLength; j++) {
      for (let i = 0; i < sideLength; i++) {
        if (fitsSquare(i, j, squareSide)) {
          renderSquare(i, j, squareSide)
          rects.push({i: (1.0 * i)/subdivisions - 0.5, j: (1.0*j)/subdivisions - 0.5, side: (1.0*squareSide)/subdivisions})
        }
      }
    }
  }
  return rects;
}

