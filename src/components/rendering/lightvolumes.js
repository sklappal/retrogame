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

const findElementRayPairs = (elementPos, elementModel, playerPos) => {
  if (elementModel.type !== "rect") {
    console.log("Non-supported element type")
  }
  return playerElementRayRect(elementPos, elementModel, playerPos);
}

const findLightVolume = (elementPos, elementModel, playerPos) => {
  const rays = playerElementRayRect(elementPos, elementModel, playerPos)
  return createVolume(playerPos, rays[0], rays[1]);
}

const createVolume = (playerPos, ray1, ray2) => {
  const corner1 = vec2.add([], playerPos, ray1)
  const corner2 = vec2.add([], playerPos, ray2)
  return [playerPos, corner1, corner2];
}


const toPolar = (vec) => {
  return [vec2.length(vec), Math.atan2(vec[1], vec[0])]
}

const toCartesian = (vec) => {
  return vec2.fromValues(vec[0] * Math.cos(vec[1]), vec[0] * Math.sin(vec[1]))
}

const angleFromT1toT2 = (t1, t2) => {
  const diff = t2[1]-t1[1];
  if (diff < 0)
    return diff + Math.PI * 2.0

  return diff
}

const addToAngle = (angle, toAdd) => {
  const ret = angle + toAdd
  if (ret > Math.PI)
    return ret - 2*Math.PI
  return ret
}


const getCevianLength = (b, c, angle_bc, cevian_angle) => {
  const a = Math.sqrt(b*b + c*c - 2 * b * c * Math.cos(angle_bc))  
  const angle_ab = Math.acos((a*a + b*b - c*c) / (2 * a * b))
  const angle_n_cevian = Math.PI - cevian_angle - angle_ab;
  return b * Math.sin(angle_ab) / Math.sin(angle_n_cevian);
}

const normalizeTo2Pi = (angle) => {
  if (angle >= Math.PI)
    return angle - Math.PI
  if (angle <= -Math.PI)
    return angle + Math.PI

  return angle
}

const purgeHiddenPairs = (pairsInPolar) => {
  const ret = [];
  for (var i = 0; i < pairsInPolar.length; i++) {
    let hidden = false;
    const thisPair = pairsInPolar[i]

    for (var j = 0; j < pairsInPolar.length; j++) {
      if (i != j) {
        const otherPair = pairsInPolar[j]

        let anglea1 = thisPair[0][1]
        let anglea2 = thisPair[1][1]

        let angleb1 = otherPair[0][1]
        let angleb2 = otherPair[1][1]

        if (angleb1 >= 0.0 && angleb2 <= 0.0) {
          angleb1 -= Math.PI;
          angleb2 += Math.PI;

          if (anglea1 <= 0.0)
            anglea1 += Math.PI;
          else 
            anglea1 -= Math.PI

          if (anglea2 <= 0.0)
            anglea2 += Math.PI;
          else 
           anglea2 -= Math.PI
        }
        

        if (anglea1 >= angleb1 && anglea2 <= angleb2) {
          const d1 = getCevianLength(otherPair[0][0], otherPair[1][0], angleFromT1toT2(otherPair[0], otherPair[1]), angleFromT1toT2(otherPair[0], thisPair[0]))
          const d2 = getCevianLength(otherPair[0][0], otherPair[1][0], angleFromT1toT2(otherPair[0], otherPair[1]), angleFromT1toT2(otherPair[0], thisPair[1]))
         
          if (d1 <= thisPair[0][0] && d2 <= thisPair[1][0]) {
            hidden = true;
            break;
          }
        }

      }
    }
    
    if (!hidden) {
      ret.push(thisPair)

    }
  }
  return ret

}


export const findLightVolumes = gamestate => {
  const playerPos = gamestate.player.pos;
  const elementRayPairs =  gamestate.scene.items.map(element => findElementRayPairs(element.pos, element.model, playerPos));

  const rayPairsPolarNonPurged = elementRayPairs.map(rayPair => {
    const r0 = toPolar(rayPair[0])
    const r1 = toPolar(rayPair[1])
    // sort so that coordinates in a pair are ascending wrt theta

    const angle1 = angleFromT1toT2(r0, r1)
    const angle2 = angleFromT1toT2(r1, r0)

    if (angle2 < angle1) {
      return [r1, r0]
    }
    return [r0, r1]
  })

  // sort asceding by theta of first item in pair
  rayPairsPolarNonPurged.sort((a, b) => a[0][1] - b[0][1]);

  const rayPairsPolar  = purgeHiddenPairs(rayPairsPolarNonPurged);

  const points = [];
  points.push(rayPairsPolar[0][0]);
  var curPair = rayPairsPolar[0]
  
  const longDistance = 150.0;

  for (var i = 0; i < rayPairsPolar.length; i++) {
    const lastAddedPoint = points[points.length-1]
    const nextPair = rayPairsPolar[(i+1) % rayPairsPolar.length]
    const angleInThisPair = angleFromT1toT2(lastAddedPoint, curPair[1])
    const angleToNext = angleFromT1toT2(lastAddedPoint, nextPair[0])
    
    
    
    if (angleInThisPair < angleToNext || angleToNext < 1e-6) { // Situation 1
      const nextPoint = curPair[1]
      points.push(nextPoint)
      points.push(vec2.fromValues(longDistance, nextPoint[1]))

      let currentTheta = nextPoint[1]
      let currentAngle = angleFromT1toT2(nextPoint, nextPair[0])

      while (currentAngle > Math.PI * 0.5) {
        const nextTheta = addToAngle(currentTheta, Math.PI * 0.5)
        points.push(vec2.fromValues(longDistance, nextTheta))
        currentAngle -= Math.PI * 0.5
        currentTheta = nextTheta
      }

      points.push(vec2.fromValues(longDistance, nextPair[0][1]))
      points.push(nextPair[0])
      curPair = nextPair;
    } 
    else
    {
      const angleInNextPair = angleFromT1toT2(nextPair[0], nextPair[1])
      const nr0 = getCevianLength(lastAddedPoint[0], curPair[1][0], angleInThisPair, angleToNext)

      //next pair completely contained in this angle
      if (angleToNext + angleInNextPair <= angleInThisPair) { // situation 2
        const nr1 = getCevianLength(lastAddedPoint[0], curPair[1][0], angleInThisPair, angleToNext + angleInNextPair);
        
        if (nextPair[0][0] <= nr0 && nextPair[1][0] <= nr1) { // situation 2 a)
        
          points.push(vec2.fromValues(nr0, nextPair[0][1]))
          points.push(nextPair[0])
          points.push(nextPair[1])
          points.push(vec2.fromValues(nr1, nextPair[1][1]))
        } else if (nextPair[0][0] >= nr0 && nextPair[1][0] >= nr1) { // situation 2 d)
          console.log("situation 2d" )
        } else {
          console.log( "situation 2) b or c encountered??", nextPair[0][0], nr0, nextPair[1][0], nr1)
        }
      } else { // situation 3)
        if (nextPair[0][0] <= nr0) { // a)
          points.push(vec2.fromValues(nr0, nextPair[0][1]))
          points.push(nextPair[0])
        } else { // b)
          points.push(curPair[1])
          const r = getCevianLength(nextPair[0][0], nextPair[1][0], angleInNextPair, angleFromT1toT2(nextPair[0], curPair[1]))
          const artificialPoint = vec2.fromValues( r, curPair[1][1])
          points.push(artificialPoint)
        }
        curPair = nextPair
      }
    }
  }

  return points
    .map(toCartesian)
    .map(p => vec2.add(vec2.create(), p, playerPos))
}

