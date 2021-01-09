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

  const staticObjectsColor = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
  const drawStaticObjects = () => {
    gamestate.scene.staticObjects.forEach(so => {
      gpuHelper.drawShape(so.model, so.pos, staticObjectsColor);
    });
  }

  const dynamicObjectsColor = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
  const drawDynamicObjects = () => {
    gamestate.scene.dynamicObjects.forEach(so => {
      gpuHelper.drawShape(so.model, so.pos, dynamicObjectsColor);
    });
  }

  const lightColor = vec4.fromValues(0.1, 0.1, 0.1, 1.0);
  const drawLights = () => {
    for (let i = 0; i < gamestate.scene.lights.length; i++) {
      gpuHelper.drawCircle(0.2, gamestate.scene.lights[i].pos, lightColor)
    }
  }

  const playerColor = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
  const drawPlayer = () => {
    gpuHelper.drawCircle(0.5, gamestate.player.pos, playerColor)
  }

  const drawScene = () => {

    time(() => gpuHelper.updateVisibilityTexture(gamestate), "updateVisibilityTexture");

    time(() => {
      gpuHelper.startFirstPassRender();

      drawStaticObjects();
    }, "first pass");

    time ( () => gpuHelper.calculateVisibilityOnGPU(gamestate), "calculateVisibilityOnGPU");

    time(() => {
      gpuHelper.startMainRender(gamestate);

      gpuHelper.drawBackground();
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