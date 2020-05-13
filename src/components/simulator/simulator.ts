import { GameState, ControlState, createDynamicObject } from "../game/gamestate";
import KeyCodes from '../game/keycodes'
import { vec2 } from "gl-matrix";
import { circle } from "../models/models";

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
    // Camera movement
    const cameraMovement = getMovementVector(KeyCodes.KEY_LEFT, KeyCodes.KEY_RIGHT, KeyCodes.KEY_UP, KeyCodes.KEY_DOWN, controlstate, 0.5);
    gamestate.camera.velocity = cameraMovement;


    // Player movement
    const mouseToPlayer = vec2.sub(vec2.create(), controlstate.mouse.pos, gamestate.player.pos)
    gamestate.player.aimAngle = Math.atan2(mouseToPlayer[1], mouseToPlayer[0]);

    const playerAcceleration = getMovementVector(KeyCodes.KEY_A, KeyCodes.KEY_D, KeyCodes.KEY_W, KeyCodes.KEY_S, controlstate, gamestate.player.acceleration)
    if (playerAcceleration[0] === 0.0) gamestate.player.velocity[0] *= 0.92
    if (playerAcceleration[1] === 0.0) gamestate.player.velocity[1] *= 0.92

    vec2.add(gamestate.player.velocity, gamestate.player.velocity, playerAcceleration)
    clamp(gamestate.player.velocity, gamestate.player.maxSpeed)
    

    // Player actions
    if (controlstate.mouse.buttonsClicked.has(0)) {
      const aimAngle = gamestate.player.aimAngle;
      const dir = vec2.scale(vec2.create(), vec2.fromValues(Math.cos(aimAngle), Math.sin(aimAngle)), 0.9)
      gamestate.scene.dynamicObjects.push(createDynamicObject(gamestate.player.pos,  dir, circle(0.2, "blue"),))
    }

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

  const handleDynamicObjects = () => {
    gamestate.scene.dynamicObjects.forEach(ob => {
      vec2.add(ob.pos, ob.pos, ob.velocity)
    })
  }

  const simulate = () => {
    handleInputs();
    handleCamera();
    handlePlayerMovement();
    handleDynamicObjects();
    
  }

  return {
    simulate: simulate
  }
}