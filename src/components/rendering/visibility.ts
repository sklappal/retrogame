import { vec2 } from 'gl-matrix'
import { Rect, Model, Circle } from '../models/models';
import { SceneObject } from '../game/gamestate';

interface Segment {
  id: number
  from: vec2,
  to: vec2
}

const playerElementRaysRect = (rectPos: vec2, rect: Rect, playerPos: vec2): vec2[] => {
  const corners: vec2[] = [
    [rectPos[0] - rect.width * 0.5, rectPos[1] - rect.height * 0.5], 
    [rectPos[0] + rect.width * 0.5, rectPos[1] - rect.height * 0.5],
    [rectPos[0] - rect.width * 0.5, rectPos[1] + rect.height * 0.5],
    [rectPos[0] + rect.width * 0.5, rectPos[1] + rect.height * 0.5]
  ];

  const rays: vec2[] = corners.map(c => vec2.sub(vec2.create(), c, playerPos));

  let maxAngle = 0.0;
  let ray1: vec2 = [0.0, 0.0];
  let ray2: vec2 = [0.0, 0.0];
  for (let i = 0; i < rays.length-1; i++) {
    for (let j = 1; j < rays.length; j++) {
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

const playerElementRaysCircle = (circlePos: vec2, circle: Circle, playerPos: vec2): vec2[] => {

  const circlePlayerRay = vec2.sub(vec2.create(), playerPos, circlePos);

  const radius = circle.radius;

  const hypotenuse = vec2.length(circlePlayerRay);

  const circleTangentLength = Math.sqrt(hypotenuse*hypotenuse - radius*radius);

  const sinTheta = circleTangentLength / hypotenuse;

  const cosTheta = radius / hypotenuse;

  const rotated1 = vec2.fromValues(
    circlePlayerRay[0] * cosTheta - circlePlayerRay[1] * sinTheta,
    circlePlayerRay[0] * sinTheta + circlePlayerRay[1] * cosTheta
  )
  
  const rotated2 = vec2.fromValues(
    circlePlayerRay[0] * cosTheta + circlePlayerRay[1] * sinTheta,
    - circlePlayerRay[0] * sinTheta + circlePlayerRay[1] * cosTheta
  )

  vec2.scale(rotated1, rotated1, radius / hypotenuse)

  vec2.scale(rotated2, rotated2, radius / hypotenuse)

  const corner1 = vec2.add(vec2.create(), rotated1, circlePos)
  const corner2 = vec2.add(vec2.create(), rotated2, circlePos)

  return [vec2.sub(vec2.create(), corner1, playerPos), vec2.sub(vec2.create(), corner2, playerPos)];
}

const findElementSegments = (elementPos: vec2, elementModel: Model, playerPos :vec2) => {
  if (elementModel.kind === "rect") {
    return playerElementRaysRect(elementPos, elementModel.shape as Rect, playerPos);
  }
  if (elementModel.kind === "circle") {
    return playerElementRaysCircle(elementPos, elementModel.shape as Circle, playerPos);
  }

  throw new Error("Unknown element type");
}

const toPolar: (vec: vec2) => vec2 = (vec) => {
  
  return [vec2.length(vec) as number, Math.atan2(vec[1], vec[0])]
}

const toCartesian = (vec: vec2) => {
  return vec2.fromValues(vec[0] * Math.cos(vec[1]), vec[0] * Math.sin(vec[1]))
}

const angleFromT1toT2 = (t1: vec2, t2: vec2) => {
  const diff = t2[1]-t1[1];
  if (diff < 0)
    return diff + Math.PI * 2.0

  return diff
}

const getCevianLength = (bv: vec2, cv: vec2, angle_bc: number, cevian_angle: number) => {
  const b = bv[0];
  const c = cv[0];
  const a = Math.sqrt(b*b + c*c - 2 * b * c * Math.cos(angle_bc))  
  const angle_ab = Math.acos((a*a + b*b - c*c) / (2 * a * b))
  const angle_n_cevian = Math.PI - cevian_angle - angle_ab;
  return b * Math.sin(angle_ab) / Math.sin(angle_n_cevian);
}

export const rayLineIntersection = (ray: vec2, point1: vec2, point2: vec2): intersection => {
    const v1 = vec2.scale(vec2.create(), point1, -1.0)
    const v2 = vec2.sub(vec2.create(), point2, point1)
    const v3 = vec2.fromValues(-ray[1], ray[0])

    const dot = vec2.dot(v2, v3);
    if (Math.abs(dot) < 1e-6)
      return {intersect: false}

    const t1 = ((v2[0]*v1[1]) - (v2[1]*v1[0])) / dot;
    const t2 = (vec2.dot(v1, v3)) / dot;

    if (t1 >= 0.0 && (t2 >= -0.001 && t2 <= 1.001)) // consider epsilon
        return {intersect: true, distance: t1};

    return {intersect: false}
}

type intersection = { intersect: false} | {intersect: true, distance: number}

export const raySegmentIntersection = (rayAngle: number, segment: Segment): intersection  => {
    const ray = toCartesian([1.0, rayAngle])
    
    const point1 = toCartesian(segment.from)
    const point2 = toCartesian(segment.to)
    
    return rayLineIntersection(ray, point1, point2);
}

const findNearestIntersectingSegment = (rayAngle: number, segments: Iterable<Segment>) => {
  let min: number = 10000; // very large number, almost infinite
  let minSegment = null;
  for (const segment of segments) {
    const i = raySegmentIntersection(rayAngle, segment);
    if (i.intersect && i.distance < min) {
      min = i.distance;
      minSegment = segment;
    }
  }

  return {segment: minSegment, distance: min};
}

export const isPointBehindLine = (p1: vec2, p2: vec2, p: vec2) => {
  //d=(x−x1)(y2−y1)−(y−y1)(x2−x1)
  return ((p[0]-p1[0])*(p2[1]-p1[1]) - (p[1]-p1[1])*(p2[0]-p1[0])) > 0.0
}

const isPointBehindSegment = (segment: Segment, polar: vec2) => {
  const p1 = toCartesian(segment.from)
  const p2 = toCartesian(segment.to)

  return isPointBehindLine(p1, p2, toCartesian(polar));
}

const isSegmentBehindOther = (thisSegment: Segment, otherSegment: Segment) => {
  const p1 = toCartesian(otherSegment.from)
  const p2 = toCartesian(otherSegment.to)

  return isPointBehindLine(p1, p2, toCartesian(thisSegment.from)) && isPointBehindLine(p1, p2, toCartesian(thisSegment.to));
}

const normalizeTo2pi = (angle: number) => {
  if (angle < 0.0)
    return angle + 2.0 * Math.PI
  if (angle >= 2.0 * Math.PI)
    return angle - 2.0 * Math.PI
  return angle
}

// is this hidden by other
export const isSegmentOccluded = (thisSegment: Segment, otherSegment: Segment) => {
  const startAngle = 0.0;
  const stopAngle = angleFromT1toT2(otherSegment.from, otherSegment.to)
  
  const thisStart = normalizeTo2pi(thisSegment.from[1] - otherSegment.from[1])
  let thisStop =  normalizeTo2pi(thisSegment.to[1] - otherSegment.from[1])
  if (thisStop < thisStart) {
    thisStop += 2.0 * Math.PI
  }
  
  if (thisStart < startAngle || thisStop > stopAngle) {
    return false;
  }

  return isSegmentBehindOther(thisSegment, otherSegment);
}

const purgeOccludedSegments = (segments : ReadonlyArray<Segment>) => {
  const ret = [];
  for (var i = 0; i < segments.length; i++) {
    let hidden = false;
    const thisPair = segments[i]

    for (var j = 0; j < segments.length; j++) {
      if (i !== j) {
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

const sp = (segment: Segment) => {
  return {startingPoint: true, point: segment.from, segment: segment}
}

const ep = (segment: Segment) => {
  return {startingPoint: false, point: segment.to, segment: segment}
}

const epsilonEqual = (v1: vec2, v2: vec2) => {
  return Math.abs(v1[0]-v2[0]) < 1e-6 && Math.abs(v1[1]-v2[1]) < 1e-6;
}

const intersectionsAlongRay = (angle: number, segments: ReadonlyArray<Segment>) => {
  return segments
    .map(segment => {return {...raySegmentIntersection(angle, segment), segment: segment}})
    .filter(intersect => intersect.intersect)
    .map(intersect => intersect as {intersect: true, distance: number, segment: Segment})
    .sort((a, b) => a.distance - b.distance)
}

export const findVisibleRegion = (pos: vec2, items: ReadonlyArray<SceneObject>) => {
  const playerPos = pos;
  const elementSegments =  items.map(element => findElementSegments(element.pos, element.model, playerPos));

  const wallDistance = 250.0;

  elementSegments.push([[-wallDistance, -wallDistance], [wallDistance, -wallDistance]])
  elementSegments.push([[wallDistance, -wallDistance], [wallDistance, wallDistance]])
  elementSegments.push([[wallDistance, wallDistance], [-wallDistance, wallDistance]])
  elementSegments.push([[-wallDistance, wallDistance], [-wallDistance, -wallDistance]])

  const segmentsNonPurged = elementSegments.map((rayPair, i) => {
    const r0 = toPolar(rayPair[0])
    const r1 = toPolar(rayPair[1])
    // sort so that coordinates in a pair are ascending wrt theta

    const angle1 = angleFromT1toT2(r0, r1)
    const angle2 = angleFromT1toT2(r1, r0)

    if (angle2 < angle1) {
      return {from: r1, to: r0, id: i}
    }
    return {from: r0, to: r1, id: i}
  })

  const segmentsPurged = purgeOccludedSegments(segmentsNonPurged);

  const farAwayDistance = wallDistance + 10.0

  const segments = segmentsPurged.filter(segment => {
    const angle = angleFromT1toT2(segment.from, segment.to);
    const d = getCevianLength(segment.from, segment.to, angle, angle*0.5);

    return d < farAwayDistance;
  });

  const allPoints = segments
    .flatMap(segment => [sp(segment), ep(segment)])
    .sort((p1, p2) => p1.point[1] - p2.point[1])


  let startIndex = 0;  
  for (let i = 0; i < allPoints.length; i++) {
    const currentPoint = allPoints[i];
    if (currentPoint.startingPoint) {
      let hidden = false;
      segments.forEach(segment => {
        if (isPointBehindSegment(segment, currentPoint.point)) {
          hidden = true;
        }
      })
      if (!hidden) {
        startIndex = i;
        break;
      }
    }
  }


  const points: vec2[] = []
  const startPoint = allPoints[startIndex];
   // visible and a starting point. Yes.
  let currentSegment = startPoint.segment;

  const intersections = intersectionsAlongRay(startPoint.point[1], segments)

  const open = new Set<Segment>();
  intersections.forEach(isec => {
    open.add(isec.segment)
  });
  

  let triangleStart = startPoint.point;

  for (let i = 1; i < allPoints.length*2; i++) {
    const currentPoint = allPoints[(startIndex + i) % allPoints.length];
    if (!currentPoint.startingPoint) {
      open.delete(currentPoint.segment)
    } else {
      open.add(currentPoint.segment);
    }

    segments.forEach(segment => {
      if (epsilonEqual(segment.from, currentPoint.point)) {
        open.add(segment);
      }
      if (epsilonEqual(segment.to, currentPoint.point)) {
        open.delete(segment);
      }
    })

    const nearestSegment = findNearestIntersectingSegment(currentPoint.point[1], open);
    if (nearestSegment.segment === null) {
      console.log("no intersection really sad")
      continue;
    }
      
    if (nearestSegment.segment !== currentSegment) {
      points.push(triangleStart);
      const d1 = raySegmentIntersection(currentPoint.point[1], currentSegment)
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

