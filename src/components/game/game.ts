import { RenderingHandler } from '../rendering/renderinghandler'
import { ControlState, GameState } from './gamestate'
import { getSimulator } from '../simulator/simulator';


export const startGame = (renderingHandler: RenderingHandler, gamestate: GameState, controlstate: ControlState, requestAnimFrame: any) => {  
  
  const PHYSICS_TIME_STEP = 10; // 100 fps for physics simulation
  var physicsAccumulator = 0;
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
  
  const tick = () => {
    prevDrawTime = curDrawTime;
    curDrawTime = new Date().getTime();
    var frameTime = curDrawTime - prevDrawTime;

    physicsAccumulator += frameTime;

    if (physicsAccumulator > 100 * PHYSICS_TIME_STEP) // just skip time
    {
      physicsAccumulator = 5 * PHYSICS_TIME_STEP;
    }

    gamestate.gametime = (curDrawTime - startTime) / 1000.0;
    gamestate.fps = calculateFPS();
   
    const simulator = getSimulator(gamestate, controlstate);
    
    while (physicsAccumulator >= PHYSICS_TIME_STEP)
    {
      simulator.simulate();
      controlstate.clearClickedButtons();
      physicsAccumulator -= PHYSICS_TIME_STEP;
    }

    // assumption that these guys below don't used clicked states as they are cleared in clearClickedButtons. Let's see.
    renderingHandler.draw();
    
    requestAnimFrame(tick);
  }
  tick();
}