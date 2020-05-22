import { GameState, ControlState, createDynamicObject } from "../game/gamestate";
import KeyCodes from '../game/keycodes'
import { vec2 } from "gl-matrix";
import { circle } from "../models/models";

export const getSimulator = (gamestate: GameState, controlstate: ControlState) => {

  const FRICTION_COEFFICIENT = 0.8
  const CAMERA_MAX_DISTANCE_FROM_PLAYER_RELATIVE_TO_FOV = 0.2;

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
    if (playerAcceleration[0] === 0.0) gamestate.player.velocity[0] *= FRICTION_COEFFICIENT;
    if (playerAcceleration[1] === 0.0) gamestate.player.velocity[1] *= FRICTION_COEFFICIENT;

    vec2.add(gamestate.player.velocity, gamestate.player.velocity, playerAcceleration)
    clamp(gamestate.player.velocity, gamestate.player.maxSpeed)
    

    // Player actions
    if (controlstate.mouse.buttonsClicked.has(0)) {
      const aimAngle = gamestate.player.aimAngle;
      const dir = vec2.scale(vec2.create(), vec2.fromValues(Math.cos(aimAngle), Math.sin(aimAngle)), 0.9)
      gamestate.scene.dynamicObjects.push(createDynamicObject(gamestate.player.pos,  dir, circle(0.2, "blue"),))
    }

  }

  const sign = (n: number) => n < 0 ? -1.0 : 1.0;

  const handleCamera = () => {

    vec2.add(gamestate.camera.pos, gamestate.camera.pos, gamestate.camera.velocity);
    
    const fov = gamestate.camera.fieldOfView;
    const allowedDistance = fov*CAMERA_MAX_DISTANCE_FROM_PLAYER_RELATIVE_TO_FOV;

    const xdistance = gamestate.player.pos[0] - gamestate.camera.pos[0];
    if (Math.abs(xdistance) > allowedDistance) {
      vec2.add(gamestate.camera.pos, gamestate.camera.pos, vec2.fromValues(xdistance -  sign(xdistance) * allowedDistance, 0.0))
    }
    
    const ydistance = gamestate.player.pos[1] - gamestate.camera.pos[1];
    if (Math.abs(ydistance) > allowedDistance) {
      vec2.add(gamestate.camera.pos, gamestate.camera.pos, vec2.fromValues(0.0, ydistance -  sign(ydistance) * allowedDistance))
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

    gamestate.scene.light.radius += Math.sin(gamestate.gametime)*0.1;
    gamestate.scene.light.pos[1] += Math.cos(2*gamestate.gametime);
  }

  return {
    simulate: simulate
  }
}