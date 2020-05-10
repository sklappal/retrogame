import { vec2 } from 'gl-matrix'

const playerElementRayRect = (rectpos, rect, playerPos) => {
  const corners = [
    [rectpos[0], rectpos[1]], 
    [rectpos[0] + rect.width, rectpos[1]],
    [rectpos[0], rectpos[1] + rect.height],
    [rectpos[0] + rect.width, rectpos[1] + rect.height]
  ];

  const rays = corners.map(c => vec2.sub(vec2.create(), c, playerPos));

  var maxAngle = 0.0;
  var ray1, ray2;
  for (var i = 0; i < rays.length-1; i++) {
    for (var j = 1; j < rays.length; j++) {
      if (i !== j) {
        const angle = vec2.angle(rays[i], rays[j])
        if (angle > maxAngle) {
          ray1 = rays[i]
          ray2 = rays[j]
          maxAngle = angle
        }
      }
    }
  }

  return [ray1, ray2];
}

const findShadowVolume = (elementPos, elementModel, playerPos) => {
  const rays = playerElementRayRect(elementPos, elementModel, playerPos)
  return createShadowVolume(playerPos, rays[0], rays[1]);
}

const createShadowVolume = (playerPos, ray1, ray2) => {
  const corner1 = vec2.add([], playerPos, ray1)
  const corner2 = vec2.add([], playerPos, ray2)
  return [corner1,
      corner2,
      vec2.scaleAndAdd([], corner2, vec2.normalize(ray2, ray2), 1000.0), 
      vec2.scaleAndAdd([], corner1, vec2.normalize(ray1, ray1), 1000.0)];
}


export const findShadowVolumes = gamestate => {
  const playerPos = gamestate.player.pos;
  return gamestate.scene.items.map(element => findShadowVolume(element.pos, element.model, playerPos));
}

