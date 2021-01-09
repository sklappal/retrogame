import { CanvasHelper } from '../canvashelper'
import { GameState } from '../../game/gamestate';
import { vec4 } from 'gl-matrix';
import { PrimitiveRenderer } from '../primitiverenderer';
import { getGpuHelper } from './gpuhelper';


export interface GpuRenderer {
  getContext(): WebGL2RenderingContext;
  width(): number;
  height(): number;

  draw(): void;
}

export const getGpuRenderer = (canvasHelper: CanvasHelper, gamestate: GameState, overlayRenderer: PrimitiveRenderer) => {
  const gpuHelper = getGpuHelper(canvasHelper);





  const drawScene = () => {


    time(() => {
      gpuHelper.renderOccluders(gamestate);
    }, "first pass");


    time(() => gpuHelper.renderVisibility(gamestate), "updateVisibilityTexture");


    time(() => {
      gpuHelper.renderMain(gamestate);
    }, "main render");

    // drawStaticObjects();

    // drawDynamicObjects();

    // drawLights();

    // drawPlayer();
  }



  function time(f: () => void, ctx: string) {
    const start = performance.now();
    f();
    
    gamestate.logDebug(ctx, "took", (performance.now() - start));
  }

  return {
    getContext: canvasHelper.getWebGLContext,
    width: canvasHelper.width,
    height: canvasHelper.height,
    draw: () => {
      time(drawScene, "drawScene");
    }
  }
}