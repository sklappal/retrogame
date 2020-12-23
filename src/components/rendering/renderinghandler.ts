import { PrimitiveRenderer } from './primitiverenderer'
import { GameState } from '../game/gamestate';
import { GpuRenderer } from './gpurenderer';
import { vec2 } from 'gl-matrix';
import { findVisibilityStripNoCache } from './visibility';

export interface RenderingHandler {
  draw(): void;
}

export const getRenderingHandler = (
    gpuRenderer: GpuRenderer,
    overlayRenderer: PrimitiveRenderer,
    gamestate: GameState) => {

  const drawGpu = () => {
    gpuRenderer.draw();
  }

  const drawOverlay = () => {
    overlayRenderer.clearCanvas("#00000000");
    var text = "FPS: " + gamestate.fps.toFixed(1)   
    overlayRenderer.drawTextCanvas([overlayRenderer.width()-120, overlayRenderer.height()-40], text)
  }
    
/* eslint-disable-next-line */
  const drawGraph = () => {
    const count = 20;
    const scale = 2.0;
    const offset = -count*0.5;

    const subdivisions = 5;
    
    for (let i = 0; i <= 20 * subdivisions; i++) {
      overlayRenderer.drawLine([offset * scale, (i/subdivisions + offset) * scale], [-offset*scale, (i/subdivisions + offset) * scale], "#222222")
      overlayRenderer.drawLine([(i/subdivisions + offset) * scale, offset * scale], [(i/subdivisions + offset) * scale, -offset*scale, ], "#222222")
    }


    for (let edge of gamestate.graph.edges) {
      const node1 = gamestate.graph.getNode(edge.from)
      const node2 = gamestate.graph.getNode(edge.to)
      overlayRenderer.drawLine([(node1.i + offset) * scale, (node1.j + offset) * scale], [(node2.i + offset)*scale, (node2.j + offset)*scale], "green")
    }

    for (let node of gamestate.graph.nodes) {
      overlayRenderer.drawCircle([(node.i + offset)*scale, (node.j + offset)*scale], scale/10.0, "green")
    }
  }

  const drawDebug = () => {
    if (gamestate.config.debug.debug_on) {
      if (gamestate.config.debug.light_index_in_focus !== -1) {
        let light = gamestate.scene.lights.filter(x => x.id === gamestate.config.debug.light_index_in_focus)[0];
  
        overlayRenderer.drawCircle(light.pos, 2.0, "red");
  
        for (let i = 0; i < gamestate.scene.staticObjects.length; i++) {
          let o = gamestate.scene.staticObjects[i];
          if (vec2.distance(o.pos, light.pos) < 50.0) {
            overlayRenderer.drawLine(light.pos, o.pos, "white");
          }
  
        }
        const buf = new Float32Array(1024);
        findVisibilityStripNoCache(light.pos, light.params, gamestate.scene.staticObjects, buf);
        const getAngle = (i:number) => ((i) / buf.length) * (2*Math.PI) - Math.PI;
        for (let i = 0; i < 1024; i+=4) {
          const angle = getAngle(i);
  
          overlayRenderer.drawLine(light.pos, vec2.add(vec2.create(), light.pos, vec2.fromValues(buf[i] * Math.cos(angle), buf[i] * Math.sin(angle) )), "cyan")
        }

      }
    }
  }

  return {
    draw: () => {
      drawGpu();

      drawOverlay();

      drawDebug();
     



   //   drawGraph();

    }
  }
}