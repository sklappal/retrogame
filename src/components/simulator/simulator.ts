import { GameState, ControlState } from "../game/gamestate";
import KeyCodes from '../game/keycodes'
import { vec2 } from "gl-matrix";

export const getSimulator = (gamestate: GameState, controlstate: ControlState) => {

  const getMovemement = (key1: number, key2: number, controlstate: ControlState) => {
    if (controlstate.isKeyPressed(key1) || controlstate.isKeyPressed(key2)) {
      return controlstate.isKeyPressed(key1) ? -1 : 1;
    }
    return 0;
  }
  
  const getMovementVector = (xkey1: number, xkey2: number, ykey1: number, ykey2: number, controlstate: ControlState, speed: number) => {
    const nonNormalized = vec2.fromValues(getMovemement(xkey1, xkey2, controlstate), getMovemement(ykey1, ykey2, controlstate));
    if (nonNormalized[0] === 0 && nonNormalized[1] === 0)
      return nonNormalized;
  
    return vec2.scale(vec2.create(), vec2.normalize(vec2.create(), nonNormalized), speed);
  }

  const handleCamera = () => {
    const cameraMovement = getMovementVector(KeyCodes.KEY_LEFT, KeyCodes.KEY_RIGHT, KeyCodes.KEY_UP, KeyCodes.KEY_DOWN, controlstate, 0.5)
    vec2.add(gamestate.camera.pos, gamestate.camera.pos, cameraMovement);
  }

  const handlePlayerMovement = () => {
    const movement = getMovementVector(KeyCodes.KEY_A, KeyCodes.KEY_D, KeyCodes.KEY_W, KeyCodes.KEY_S, controlstate, gamestate.player.speed)        
    const movementX = vec2.fromValues(movement[0], 0.0);
    const movementY = vec2.fromValues(0.0, movement[1]);
    const newPos1 = vec2.add(vec2.create(), gamestate.player.pos, movementX);
    if (!gamestate.scene.isInsideObject(newPos1)) {
      gamestate.player.pos = newPos1;
    }
    const newPos2 = vec2.add(vec2.create(), gamestate.player.pos, movementY);
    if (!gamestate.scene.isInsideObject(newPos2)) {
      gamestate.player.pos = newPos2;
    }
  }

  const simulate = () => {
    handleCamera();
    handlePlayerMovement();
  }

  return {
    simulate: simulate
  }
}