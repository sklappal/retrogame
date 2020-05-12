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

const findElementSegments = (elementPos, elementModel, playerPos) => {
  if (elementModel.type !== "rect") {
    console.log("Non-supported element type")
  }
  return playerElementRayRect(elementPos, elementModel, playerPos);
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

const getCevianLength = (bv, cv, angle_bc, cevian_angle) => {
  const b = bv[0];
  const c = cv[0];
  const a = Math.sqrt(b*b + c*c - 2 * b * c * Math.cos(angle_bc))  
  const angle_ab = Math.acos((a*a + b*b - c*c) / (2 * a * b))
  const angle_n_cevian = Math.PI - cevian_angle - angle_ab;
  return b * Math.sin(angle_ab) / Math.sin(angle_n_cevian);
}

export const rayLineIntersection = (ray, point1, point2) => {
    var v1 = vec2.scale(vec2.create(), point1, -1.0)
    var v2 = vec2.sub(vec2.create(), point2, point1)
    var v3 = vec2.fromValues(-ray[1], ray[0])

    var dot = vec2.dot(v2, v3);
    if (Math.abs(dot) < 1e-6)
        return {intersect: false}

    var t1 = ((v2[0]*v1[1]) - (v2[1]*v1[0])) / dot;
    var t2 = (vec2.dot(v1, v3)) / dot;

    if (t1 >= 0.0 && (t2 >= -0.001 && t2 <= 1.001)) // consider epsilon
        return {intersect: true, distance: t1};

    return {intersect: false}
}

export const raySegmentIntersection = (rayAngle, segment) => {
    const ray = toCartesian([1.0, rayAngle])
    
    const point1 = toCartesian(segment[0])
    const point2 = toCartesian(segment[1])
    
    return rayLineIntersection(ray, point1, point2);
}

const findNearestIntersectingSegment = (rayAngle, segments) => {
  let min = 10000; // very large number, almost infinite
  let minSegment = null;
  segments.forEach(segment => {
    const i = raySegmentIntersection(rayAngle, segment.segment);
    if (i.intersect && i.distance < min) {
      min = i.distance;
      minSegment = segment;
    }
  })

  return {segment: minSegment, distance: min};
}

export const isPointBehindLine = (p1, p2, p) => {
  //d=(x−x1)(y2−y1)−(y−y1)(x2−x1)
  return ((p[0]-p1[0])*(p2[1]-p1[1]) - (p[1]-p1[1])*(p2[0]-p1[0])) > 0.0
}

const isPointBehindSegment = (segment, polar) => {
  const p1 = toCartesian(segment[0])
  const p2 = toCartesian(segment[1])

  return isPointBehindLine(p1, p2, toCartesian(polar));
}

const isSegmentBehindOther = (thisSegment, otherSegment) => {
  const p1 = toCartesian(otherSegment[0])
  const p2 = toCartesian(otherSegment[1])

  return isPointBehindLine(p1, p2, toCartesian(thisSegment[0])) && isPointBehindLine(p1, p2, toCartesian(thisSegment[1]));
}

const normalizeTo2pi = angle => {
  if (angle < 0.0)
    return angle + 2.0 * Math.PI
  if (angle >= 2.0 * Math.PI)
    return angle - 2.0 * Math.PI
  return angle
}

// is this hidden by other
export const isSegmentOccluded = (thisSegment, otherSegment) => {
  const startAngle = 0.0;
  const stopAngle = angleFromT1toT2(otherSegment[0], otherSegment[1])
  
  const thisStart = normalizeTo2pi(thisSegment[0][1] - otherSegment[0][1])
  let thisStop =  normalizeTo2pi(thisSegment[1][1] - otherSegment[0][1])
  if (thisStop < thisStart) {
    thisStop += 2.0 * Math.PI
  }
  
  if (thisStart < startAngle || thisStop > stopAngle) {
    return false;
  }

  return isSegmentBehindOther(thisSegment, otherSegment);
}

const purgeOccludedSegments = (segments) => {
  const ret = [];
  for (var i = 0; i < segments.length; i++) {
    let hidden = false;
    const thisPair = segments[i]

    for (var j = 0; j < segments.length; j++) {
      if (i != j) {
        const otherPair = segments[j]
        
        if (isSegmentOccluded(thisPair, otherPair)) {
          hidden = true;
          break;
        }
      }
    }
    
    if (!hidden) {
      ret.push(thisPair)

    }
  }
  return ret

}

const sp = (segment) => {
  return {startingPoint: true, point: segment.segment[0], segment: segment}
}

const ep = (segment) => {
  return {startingPoint: false, point: segment.segment[1], segment: segment}
}

const epsilonEqual = (v1, v2) => {
  return Math.abs(v1[0]-v2[0]) < 1e-6 && Math.abs(v1[1]-v2[1]) < 1e-6;
}

const intersectionsAlongRay = (angle, segments) => {
  return segments
    .map(segment => {return {...raySegmentIntersection(angle, segment.segment), segment: segment}})
    .filter(intersect => intersect.intersect)
    .sort((a, b) => a.distance - b.distance)
}

export const findLightVolumes = gamestate => {
  const playerPos = gamestate.player.pos;
  const elementSegments =  gamestate.scene.items.map(element => findElementSegments(element.pos, element.model, playerPos));

  const wallDistance = 250.0;

  elementSegments.push([[-wallDistance, -wallDistance], [wallDistance, -wallDistance]])
  elementSegments.push([[wallDistance, -wallDistance], [wallDistance, wallDistance]])
  elementSegments.push([[wallDistance, wallDistance], [-wallDistance, wallDistance]])
  elementSegments.push([[-wallDistance, wallDistance], [-wallDistance, -wallDistance]])

  const segmentsNonPurged = elementSegments.map(rayPair => {
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

  const segmentsPurged = purgeOccludedSegments(segmentsNonPurged);

  if (segmentsPurged.length !== segmentsNonPurged.length) {
    console.log("purged", segmentsNonPurged.length - segmentsPurged.length, "hidden segments")
  }

  const farAwayDistance = wallDistance + 10.0

  const segmentsFiltered = segmentsPurged.filter(segment => {
    const angle = angleFromT1toT2(segment[0], segment[1]);
    const d = getCevianLength(segment[0], segment[1], angle, angle*0.5);

    return d < farAwayDistance;
  });

  if (segmentsPurged.length !== segmentsFiltered.length) {
    console.log("purged", segmentsPurged.length - segmentsFiltered.length, "far away segments")
  }

  const segments = segmentsFiltered.map((segment, i) => {
    return {segment: segment, id: i}
  });

  const allPoints = segments
    .flatMap(segment => [sp(segment), ep(segment)])
    .sort((p1, p2) => p1.point[1] - p2.point[1])

  

  let startIndex = 0;  
  for (var i = 0; i < allPoints.length; i++) {
    var currentPoint = allPoints[i];
    if (currentPoint.startingPoint) {
      let hidden = false;
      segments.forEach(segment => {
        if (isPointBehindSegment(segment.segment, currentPoint.point)) {
          hidden = true;
        }
      })
      if (!hidden) {
        startIndex = i;
        break;
      }
    }
  }


  const points = []
  const startPoint = allPoints[startIndex];
   // visible and a starting point. Yes.
  let currentSegment = startPoint.segment;

  const intersections = intersectionsAlongRay(startPoint.point[1], segments)

  const open = new Set();
  intersections.forEach(isec => {
    open.add(isec.segment)
  });
  

  let triangleStart = startPoint.point;

  for (var i = 1; i < allPoints.length*2; i++) {
    const currentPoint = allPoints[(startIndex + i) % allPoints.length];
    if (!currentPoint.startingPoint) {
      open.delete(currentPoint.segment)
    } else {
      open.add(currentPoint.segment);
    }

    segments.forEach(segment => {
      if (epsilonEqual(segment.segment[0], currentPoint.point)) {
        open.add(segment);
      }
      if (epsilonEqual(segment.segment[1], currentPoint.point)) {
        open.delete(segment);
      }
    })

    const nearestSegment = findNearestIntersectingSegment(currentPoint.point[1], open);
    if (nearestSegment.segment === null) {
      console.log("no intersection really sad")
    }
      
    if (nearestSegment.segment !== currentSegment) {
      points.push(triangleStart);
      const d1 = raySegmentIntersection(currentPoint.point[1], currentSegment.segment)
      if (d1.intersect) {
        points.push([d1.distance, currentPoint.point[1]])
      } else {
        if (!currentPoint.startingPoint) {
          console.log("no intersection but current point finishes segment...... so...")
        }
        else {
          console.log("no intersection sad panda")
        }
      }
      triangleStart = [nearestSegment.distance, currentPoint.point[1]]
      currentSegment = nearestSegment.segment;
      if (i > allPoints.length) {
        break;
      }
    }
  }

  return points
    .map(toCartesian)
    .map(p => vec2.add(vec2.create(), p, playerPos))
}

