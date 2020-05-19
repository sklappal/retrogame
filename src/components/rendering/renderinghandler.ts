import { PrimitiveRenderer } from './primitiverenderer'
import { findVisibleRegion } from './visibility'
import { GameState } from '../game/gamestate';
import { vec2 } from 'gl-matrix';
import { GpuRenderer } from './gpurenderer';

export interface RenderingHandler {
  draw(): void;
}

export const getRenderingHandler = (mainRenderer: PrimitiveRenderer, 
    visibilityRenderer: PrimitiveRenderer, 
    gpuRenderer: GpuRenderer,
    overlayRenderer: PrimitiveRenderer,
    gamestate: GameState) => {


  const drawVisibility = () => {
    const time = new Date().getTime();
    const lightvolumes = findVisibleRegion(gamestate.player.pos, 120.0, gamestate.scene.staticObjects);
    visibilityRenderer.fillPoly(lightvolumes, "red");
    console.log(new Date().getTime() - time);
  }

  const drawPlayer = () => {
    const pos = gamestate.player.pos
    mainRenderer.drawCircle(pos, 1.0, "red")

    const aimAngle = gamestate.player.aimAngle;
    mainRenderer.drawLine(pos, vec2.add(vec2.create(), gamestate.player.pos, vec2.fromValues(Math.cos(aimAngle), Math.sin(aimAngle))), "black");
  }

  const drawDynamicObjects = () => {
    gamestate.scene.dynamicObjects.forEach(el => mainRenderer.drawModel(el.pos, el.model))
  }

  const drawStaticObjects = () => {
    gamestate.scene.staticObjects.forEach(el => mainRenderer.drawModel(el.pos, el.model))
  }

  const drawLights = () => {
    mainRenderer.drawCircle(gamestate.scene.light, 0.5, "white")
  }

  const drawMainCanvas = () => {
    drawStaticObjects();
    drawPlayer();
    drawDynamicObjects();
    drawLights();
  }

  const drawGpu = () => {
    gpuRenderer.draw(mainRenderer.getContext().canvas, visibilityRenderer.getContext().canvas);
  }

  

  const drawOverlay = () => {
    var text = "FPS: " + gamestate.fps.toFixed(1)   
    overlayRenderer.drawTextCanvas([overlayRenderer.width()-120, overlayRenderer.height()-40], text)
  }
  
  return {
    draw: () => {
      
      mainRenderer.clearCanvas(gamestate.scene.ambientColor);
      visibilityRenderer.clearCanvas("black");
      overlayRenderer.clearCanvas("#00000000");

      drawMainCanvas();

      drawVisibility();

      drawGpu();

      drawOverlay();
    }
  }
}