import { RenderingHandler } from '../rendering/renderinghandler'
import { ControlState, GameState } from './gamestate'
import { getSimulator } from '../simulator/simulator';


const getTimeHandler = () => {
  let physicsAccumulator = 0;
  let curDrawTime = new Date().getTime();
  let prevDrawTime = new Date().getTime();
  const startTime = new Date().getTime();
  const fpsFilter = 0.01;
  let frameTime = 1.0/60.0 * 1000;
  
  return {
    startFrame: () => {
      prevDrawTime = curDrawTime;
      curDrawTime = new Date().getTime();
      physicsAccumulator += curDrawTime - prevDrawTime;
    },
    getAccumulator: () => {
      return physicsAccumulator;
    },
    setAccumulator: (val: number) => {
      physicsAccumulator = val;
    },
    decreaseAccumulator: (val: number) => {
      physicsAccumulator -= val;
    },
    gameTimeMs: () => {
      return curDrawTime - startTime;
    },
    calculateFPS: () => {
      const elapsed = curDrawTime - prevDrawTime;
      frameTime = (1-fpsFilter) * frameTime + fpsFilter * elapsed;
      return 1.0 / frameTime * 1000.0;
    }
  }
}

export const startGame = (renderingHandler: RenderingHandler, gamestate: GameState, controlstate: ControlState, requestAnimFrame: any) => {  
    
  const PHYSICS_TIME_STEP = 10; // 10 milliseconds simulated per step, 100 fps for physics simulation
    
  const simulator = getSimulator(gamestate, controlstate, PHYSICS_TIME_STEP / 1000.0);
  const timeHandler = getTimeHandler();
  
  const tick = () => {
    timeHandler.startFrame();

    if (timeHandler.getAccumulator() > 100 * PHYSICS_TIME_STEP) // just skip time
    {
      timeHandler.setAccumulator(5 * PHYSICS_TIME_STEP);
    }

    gamestate.gametime = timeHandler.gameTimeMs() / 1000.0;
    gamestate.fps = timeHandler.calculateFPS();
    
    while (timeHandler.getAccumulator() >= PHYSICS_TIME_STEP)
    {
      simulator.simulate();
      controlstate.clearClickedButtons();
      timeHandler.decreaseAccumulator(PHYSICS_TIME_STEP);
    }

    // assumption that these guys below don't used clicked states as they are cleared in clearClickedButtons. Let's see.
    renderingHandler.draw();
    
    requestAnimFrame(tick);
  }
  tick();
}