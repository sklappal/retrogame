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

  const clamp = (vec: vec2, max: number) => {
    const len = vec2.length(vec);
    if (len > max) {
      vec2.scale(vec, vec, max/len)
    }
  }

  const handleInputs = () => {
    const cameraMovement = getMovementVector(KeyCodes.KEY_LEFT, KeyCodes.KEY_RIGHT, KeyCodes.KEY_UP, KeyCodes.KEY_DOWN, controlstate, 0.5);
    gamestate.camera.velocity = cameraMovement;

    const playerAcceleration = getMovementVector(KeyCodes.KEY_A, KeyCodes.KEY_D, KeyCodes.KEY_W, KeyCodes.KEY_S, controlstate, gamestate.player.acceleration)

    
    if (playerAcceleration[0] === 0.0) gamestate.player.velocity[0] *= 0.92
    if (playerAcceleration[1] === 0.0) gamestate.player.velocity[1] *= 0.92
    
    vec2.add(gamestate.player.velocity, gamestate.player.velocity, playerAcceleration)
    clamp(gamestate.player.velocity, gamestate.player.maxSpeed)
    
  }

  const handleCamera = () => {

    vec2.add(gamestate.camera.pos, gamestate.camera.pos, gamestate.camera.velocity);
    
    const fov = gamestate.camera.fieldOfview;
    const cameraDistance = vec2.distance(gamestate.player.pos, gamestate.camera.pos);
    if (vec2.distance(gamestate.player.pos, gamestate.camera.pos) > fov*0.1) {
      vec2.add(
        gamestate.camera.pos,
        gamestate.camera.pos,
        vec2.scale(
          vec2.create(), 
          vec2.sub(vec2.create(), gamestate.player.pos, gamestate.camera.pos),
          (cameraDistance-fov*0.1)/cameraDistance
        )
      )
    }

  }

  const handlePlayerMovement = () => {
    const movement = gamestate.player.velocity;

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
    handleInputs();
    handleCamera();
    handlePlayerMovement();
    
  }

  return {
    simulate: simulate
  }
}