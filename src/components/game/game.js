import renderer from '../rendering/renderer'
import { gamestate } from './gamestate'
import { vec2 } from 'gl-matrix'
import KeyCodes from './keycodes'


const getMovemement = (key1, key2, controlstate) => {
  if (controlstate.isKeyPressed(key1) || controlstate.isKeyPressed(key2)) {
    return controlstate.isKeyPressed(key1) ? -1 : 1;
  }
  return 0;
}

const getNormalizedMovement = (xkey1, xkey2, ykey1, ykey2, controlstate) => {
  const nonNormalized = vec2.fromValues(getMovemement(xkey1, xkey2, controlstate), getMovemement(ykey1, ykey2, controlstate));
  if (nonNormalized[0] === 0 && nonNormalized[1] === 0)
    return nonNormalized;

  return vec2.normalize([], nonNormalized)
}

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
    
    const cameraMovement = getNormalizedMovement(KeyCodes.KEY_LEFT, KeyCodes.KEY_RIGHT, KeyCodes.KEY_UP, KeyCodes.KEY_DOWN, controlstate)
    const movement = getNormalizedMovement(KeyCodes.KEY_A, KeyCodes.KEY_D, KeyCodes.KEY_W, KeyCodes.KEY_S, controlstate)
    while (accumulator >= PHYSICS_TIME_STEP)
    {
      vec2.scaleAndAdd(gamestate.camera, gamestate.camera, cameraMovement, 0.5);
      vec2.scaleAndAdd(gamestate.player.pos, gamestate.player.pos, movement, 0.1);
      
      accumulator -= PHYSICS_TIME_STEP;
    }
    gamestate.gametime = (curDrawTime - startTime) / 1000.0;
    gamestate.fps = calculateFPS();
    const rend = renderer(canvas, gamestate)
    rend.draw();
    rend.drawOverlay()
    
    requestAnimFrame(tick);
  }
  tick();
}

export default game;