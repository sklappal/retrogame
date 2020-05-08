import renderer from '../rendering/renderer'
import { gamestate } from './gamestate'
import { vec2 } from 'gl-matrix'
import KeyCodes from './keycodes'


const game = (canvas, controlstate, requestAnimFrame) => {  
  
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

  const tick = () => {
    prevDrawTime = curDrawTime;
    curDrawTime = new Date().getTime();
    var frameTime = curDrawTime - prevDrawTime;

    accumulator += frameTime;

    if (accumulator > 100 * PHYSICS_TIME_STEP) // just skip time
    {
      accumulator = 5 * PHYSICS_TIME_STEP;
    }
    
    let xMovement = 0.0;
    if (controlstate.isKeyPressed(KeyCodes.KEY_A) || controlstate.isKeyPressed(KeyCodes.KEY_D)) {
      xMovement = controlstate.isKeyPressed(KeyCodes.KEY_A) ? -1 : 1;
    }

    let yMovement = 0.0;
    if (controlstate.isKeyPressed(KeyCodes.KEY_W) || controlstate.isKeyPressed(KeyCodes.KEY_S)) {
      yMovement = controlstate.isKeyPressed(KeyCodes.KEY_W) ? -1 : 1;
    }

    while (accumulator >= PHYSICS_TIME_STEP)
    {
      const newPos = vec2.scaleAndAdd([], gamestate.player.pos, vec2.fromValues(xMovement, yMovement), 0.5);
      gamestate.player.pos = newPos;
      accumulator -= PHYSICS_TIME_STEP;
    }
    const rend = renderer(canvas)
    gamestate.gametime = (curDrawTime - startTime) / 1000.0;
    gamestate.fps = calculateFPS();
    rend.draw(gamestate);
    rend.drawOverlay(gamestate)
    
    requestAnimFrame(tick);
  }
  tick();
}

export default game;