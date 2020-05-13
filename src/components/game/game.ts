import { getRenderer } from '../rendering/renderer'
import { getGameState, ControlState } from './gamestate'
import { getSimulator } from '../simulator/simulator';
import { getPrimitiveRenderer } from '../rendering/primitiverenderer';


const game = (canvas: HTMLCanvasElement, controlstate: ControlState, requestAnimFrame: any) => {  
  
  const PHYSICS_TIME_STEP = 10; // 100 fps
  var accumulator = 0;
  var curDrawTime = new Date().getTime();
  var prevDrawTime = new Date().getTime();
  var startTime = new Date().getTime();
  
  const calculateFPS = (() => {
    var fpsFilter = 0.01;
    var frameTime = 1.0/60.0 * 1000;
    
    return function() {
      var elapsed = curDrawTime - prevDrawTime;
      frameTime = (1-fpsFilter) * frameTime + fpsFilter * elapsed;
      return 1.0 / frameTime * 1000.0;
    }
  })();

  const gamestate = getGameState();
  
  const tick = () => {
    prevDrawTime = curDrawTime;
    curDrawTime = new Date().getTime();
    var frameTime = curDrawTime - prevDrawTime;

    accumulator += frameTime;

    if (accumulator > 100 * PHYSICS_TIME_STEP) // just skip time
    {
      accumulator = 5 * PHYSICS_TIME_STEP;
    }

    gamestate.gametime = (curDrawTime - startTime) / 1000.0;
    gamestate.fps = calculateFPS();
   

    const primitiveRenderer = getPrimitiveRenderer(canvas, gamestate);

    controlstate.mouse.pos = primitiveRenderer.canvas2world(controlstate.mouse.posCanvas)

    const simulator = getSimulator(gamestate, controlstate);
    
    while (accumulator >= PHYSICS_TIME_STEP)
    {
      simulator.simulate();
      controlstate.clearClickedButtons();
      accumulator -= PHYSICS_TIME_STEP;
    }

    // assumption that these guys below don't used clicked states as they are cleared above. Let's see.
    const renderer = getRenderer(primitiveRenderer, gamestate)
    renderer.draw();
    renderer.drawOverlay()

    
    requestAnimFrame(tick);
  }
  tick();
}

export default game;