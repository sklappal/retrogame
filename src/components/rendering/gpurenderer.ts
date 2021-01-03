import { CanvasHelper } from './canvashelper'
import { GameState } from '../game/gamestate';
import { vec4 } from 'gl-matrix';
import { PrimitiveRenderer } from './primitiverenderer';
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

    gpuHelper.startRender();

    gpuHelper.copyGameStateToGPU(gamestate);

    gpuHelper.drawBackground();

    drawStaticObjects();

    // drawDynamicObjects();

    // drawLights();

    // drawPlayer();
  }







  // const fb = gl.createFramebuffer();

  // const setRenderToTexture = () => {

  //   const renderTexture = initTexture(512, 512);
  //   gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

  //   // attach the texture as the first color attachment
  //   const attachmentPoint = gl.COLOR_ATTACHMENT0;
  //   gl.framebufferTexture2D(
  //     gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, renderTexture, /*level*/ 0);


  //   gl.bindTexture(gl.TEXTURE_2D, renderTexture);

  //   // Tell WebGL how to convert from clip space to pixels
  //   gl.viewport(0, 0, 512, 512);

  //   // Clear the attachment(s).
  //   gl.clearColor(0, 0, 1, 1);   // clear to blue
  //   gl.clear(gl.COLOR_BUFFER_BIT| gl.DEPTH_BUFFER_BIT);

  // }


  //setRenderToTexture();

  function time(f: () => void, ctx: string) {
    const start = performance.now();
    f();
    if (gamestate.config.debug.debug_on)
      console.log(ctx, "took", (performance.now() - start));
  }

  // let logged = true;


  return {
    getContext: canvasHelper.getWebGLContext,
    width: canvasHelper.width,
    height: canvasHelper.height,
    draw: () => {
      
      time(drawScene, "drawScene");
      // if(!logged) {
      //   gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
      //   const srcFormat = gl.RED;
      //   const srcType = gl.FLOAT;
      //   // read the pixels
      //   const buffer = new Float32Array(512*512);
      //   gl.readPixels(0, 0, 512, 512, srcFormat, srcType, buffer);

      //   const ctx = overlayRenderer.getContext();

      //   const imd = ctx.getImageData(0, 0, 512, 512);

      //   let max = 0.0;
      //   for (let i = 0; i < buffer.length; i++) {
      //     if (buffer[i] > max) {
      //       max = buffer[i];
      //     }
      //   }

      //   for (let i = 0; i < buffer.length; i++) {
      //     imd.data[4*i] = (buffer[i]/max) * 255;
      //     imd.data[4*i + 1] = (buffer[i]/max) * 255;
      //     imd.data[4*i + 2] = (buffer[i]/max) * 255;
      //     imd.data[4*i + 3] = 255;
      //   }
      //   console.log("PUTTING IMD, MAX", max);
      //   ctx.putImageData(imd, 0, 0, 0, 0, 512, 512);


      //console.log(buffer);
      // Unbind the framebuffer
      //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    //logged = true;
  }
}