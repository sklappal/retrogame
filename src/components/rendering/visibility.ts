import { vec2 } from 'gl-matrix'
import { Rect, Model, Circle } from '../models/models';
import { StaticObject, LightParameters } from '../game/gamestate';
import { VisibilityCache, getVisibilityStripCache } from './visibilityStripCache';

interface Segment {
  id: number
  from: vec2,
  fromCartesian: vec2,
  to: vec2,
  toCartesian: vec2
}

const M_2PI = 2.0*Math.PI;

const playerElementRaysVectorBuffer = [vec2.create(), vec2.create(), vec2.create(), vec2.create()]

const playerElementRaysRect = (rectPos: vec2, rect: Rect, playerPos: vec2): vec2[] => {

  vec2.set(playerElementRaysVectorBuffer[0], rectPos[0] - rect.width * 0.5 - playerPos[0], rectPos[1] - rect.height * 0.5 - playerPos[1]) 
  vec2.set(playerElementRaysVectorBuffer[1], rectPos[0] + rect.width * 0.5 - playerPos[0], rectPos[1] - rect.height * 0.5 - playerPos[1])
  vec2.set(playerElementRaysVectorBuffer[2], rectPos[0] - rect.width * 0.5 - playerPos[0], rectPos[1] + rect.height * 0.5 - playerPos[1])
  vec2.set(playerElementRaysVectorBuffer[3], rectPos[0] + rect.width * 0.5 - playerPos[0], rectPos[1] + rect.height * 0.5 - playerPos[1])

  const rays = playerElementRaysVectorBuffer;

  let maxAngle = 0.0;
  let ray1: vec2;
  let ray2: vec2;
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

  return [vec2.clone(ray1!), vec2.clone(ray2!)];
}

const playerElementRaysCircle = (circlePos: vec2, circle: Circle, playerPos: vec2): vec2[] => {

  const circlePlayerRay = vec2.sub(playerElementRaysVectorBuffer[0], playerPos, circlePos);

  const radius = circle.radius;

  const hypotenuse = vec2.length(circlePlayerRay);

  const circleTangentLength = Math.sqrt(hypotenuse*hypotenuse - radius*radius);

  const sinTheta = circleTangentLength / hypotenuse;

  const cosTheta = radius / hypotenuse;

  const rotated1 = vec2.set(
    playerElementRaysVectorBuffer[1],
    circlePlayerRay[0] * cosTheta - circlePlayerRay[1] * sinTheta,
    circlePlayerRay[0] * sinTheta + circlePlayerRay[1] * cosTheta
  )
  
  const rotated2 = vec2.set(
    playerElementRaysVectorBuffer[2],
    circlePlayerRay[0] * cosTheta + circlePlayerRay[1] * sinTheta,
    - circlePlayerRay[0] * sinTheta + circlePlayerRay[1] * cosTheta
  )

  vec2.scale(rotated1, rotated1, radius / hypotenuse)

  vec2.scale(rotated2, rotated2, radius / hypotenuse)

  const corner1 = vec2.add(rotated1, rotated1, circlePos)
  const corner2 = vec2.add(rotated2, rotated2, circlePos)

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

const toPolar = (vec: vec2) => vec2.fromValues(vec2.length(vec) as number, Math.atan2(vec[1], vec[0]));

const angleFromT1toT2 = (t1: vec2, t2: vec2) => {
  const diff = t2[1]-t1[1];
  if (diff < 0)
    return diff + M_2PI;

  return diff;
}

type intersection = { intersect: false} | {intersect: true, distance: number}

const angleBetweenAngles = (rayAngle: number, angle1: number, angle2: number) => {
  //const angle = 0.0;
  const start = normalizeTo2pi(angle1 - rayAngle)
  if (start > 0.0) {
    return false;
  }

  let stop = normalizeTo2pi(angle2 - rayAngle)
  if (stop < start) {
    return false;
  }
  
  if (stop < 0.0) {
    return false;
  }

  return true;
}

// to avoid realloc/GC
const rayLineIntersectionBuffer = [vec2.create(), vec2.create(), vec2.create()];

export const raySegmentIntersection = (rayAngle: number, sina: number, cosa: number, segment: Segment): intersection  => {
    if (!angleBetweenAngles(rayAngle, segment.from[1], segment.to[1])) {
      return { intersect: false};
    }

    // This is normal to the ray, but the rayLineIntersection actually uses that.
    const ray = rayLineIntersectionBuffer[2];
    ray[0] = -sina;
    ray[1] = cosa;
    
    const point1 = segment.fromCartesian;
    const point2 = segment.toCartesian;
    
    const v1 = point1;
    const v2 = vec2.sub(rayLineIntersectionBuffer[1], point2, point1)

    const dot = vec2.dot(v2, ray);
    const distance = ((v2[1]*v1[0]) - (v2[0]*v1[1])) / dot;
    
    return {intersect: true, distance: distance}
}

const findNearestIntersectingSegment = (rayAngle: number, sina: number, cosa: number, segments: Iterable<Segment>) => {
  let min: number = 10000; // very large number, almost infinite
  for (const segment of segments) {
    const i = raySegmentIntersection(rayAngle, sina, cosa, segment);
    if (i.intersect && i.distance < min) {
      min = i.distance;
    }
  }

  return min;
}

export const isPointBehindLine = (p1: vec2, p2: vec2, p: vec2) => {
  //d=(x−x1)(y2−y1)−(y−y1)(x2−x1)
  return ((p[0]-p1[0])*(p2[1]-p1[1]) - (p[1]-p1[1])*(p2[0]-p1[0])) > 0.0
}

export const toCartesian = (v: vec2) => vec2.fromValues(v[0] * Math.cos(v[1]), v[0] * Math.sin(v[1]));

const isSegmentBehindOther = (thisSegment: Segment, otherSegment: Segment) => {
  const p1 = otherSegment.fromCartesian;
  const p2 = otherSegment.toCartesian;

  return isPointBehindLine(p1, p2, thisSegment.fromCartesian) && isPointBehindLine(p1, p2, thisSegment.toCartesian);
}

const normalizeTo2pi = (angle: number) => {
  if (angle < -Math.PI)
    return angle + M_2PI;
  if (angle > Math.PI)
    return angle - M_2PI;
  return angle
}

// is this hidden by other
export const isSegmentOccluded = (thisSegment: Segment, otherSegment: Segment) => {
  const startAngle = 0.0;
  const stopAngle = angleFromT1toT2(otherSegment.from, otherSegment.to)
  
  const thisStart = normalizeTo2pi(thisSegment.from[1] - otherSegment.from[1])
  if (thisStart < startAngle) {
    return false;
  }

  let thisStop =  normalizeTo2pi(thisSegment.to[1] - otherSegment.from[1])
  if (thisStop < thisStart) {
    thisStop += M_2PI;
  }
  
  if (thisStart < startAngle || thisStop > stopAngle) {
    return false;
  }

  return isSegmentBehindOther(thisSegment, otherSegment);
}

const purgeOccludedSegments = (segments : ReadonlyArray<Segment>) => {
  const occludedSegments = new Map<number, boolean>();
  for (var i = 0; i < segments.length; i++) {
    
    const candidateOccluder = segments[i]
    if (occludedSegments.has(candidateOccluder.id)) {
      continue;
    }
    for (var j = 0; j < segments.length; j++) {
      if (i !== j) {
        const candidateOccluded = segments[j]
        
        if (isSegmentOccluded(candidateOccluded, candidateOccluder)) {
          occludedSegments.set(candidateOccluded.id, true);
        }
      }
    }
  }
  return segments.filter(x => !occludedSegments.has(x.id))

}

// calculates an upper bound approximation for the distance
const distanceApproximation = (obj: StaticObject, playerPos: vec2) => {
  const manhattan = Math.abs(obj.pos[0] - playerPos[0]) + Math.abs(obj.pos[1] + playerPos[1])
  if (obj.model.kind === 'rect') {
    const rect = obj.model.shape as Rect;
    return manhattan + Math.max(rect.width, rect.height) * 0.5;
  }
  const circle = obj.model.shape as Circle;
  return manhattan + circle.radius;
}

let sinBuffer: number[] = [];
let cosBuffer: number[] = [];

let cache: VisibilityCache = getVisibilityStripCache();

export const findVisibilityStripNoCache = (pos: vec2, lightParams: LightParameters, items: ReadonlyArray<StaticObject>, resultBuffer: Float32Array) => {
  const radius =  Math.sqrt(lightParams.intensity * 1000.0); // This is from this eq:  c = i/d^2 < 0.001 <=> i/0.001 < d^2 <=> sqrt(1000i) < d
  
  const filtered = items.filter(el => distanceApproximation(el, pos) < radius)
  const elementSegments = filtered.map(element => findElementSegments(element.pos, element.model, pos));

  const segmentsNonPurged = elementSegments.map((rayPair, i) => {
    const r0 = toPolar(rayPair[0])
    const r1 = toPolar(rayPair[1])
    // sort so that coordinates in a pair are ascending wrt theta

    const angle1 = angleFromT1toT2(r0, r1)
    const angle2 = angleFromT1toT2(r1, r0)

    if (angle2 < angle1) {
      return {from: r1, fromCartesian: rayPair[1], to: r0, toCartesian: rayPair[0], id: i}
    }
    return {from: r0, fromCartesian: rayPair[0], to: r1, toCartesian: rayPair[1], id: i}
  })

  const sortedSegments = segmentsNonPurged.sort((a, b) => (a.from[0] + a.to[0]) - (b.from[0] + b.to[0]));

  const segments = purgeOccludedSegments(sortedSegments);

  //console.log("original segments", items.length, "distance filtered", filtered.length, "occlusion filtered", segments.length)

  const getAngle = (i:number) => ((i) / resultBuffer.length) * M_2PI - Math.PI;

  if (sinBuffer.length !== resultBuffer.length) {
    sinBuffer = [];
    cosBuffer = [];
    for (let i = 0; i < resultBuffer.length; i++) {
      const angle = getAngle(i)
      sinBuffer.push(Math.sin(angle))
      cosBuffer.push(Math.cos(angle))
    }
  }

  let halfWidth = 0.0;
  let checkAngle = false;
  if (lightParams.angle !== undefined && lightParams.angularWidth !== undefined) {
    checkAngle = true;
    halfWidth = lightParams.angularWidth*0.5
  }
  
  for (let i = 0; i < resultBuffer.length; i++) {
    const angle = getAngle(i)

    if (checkAngle && !angleBetweenAngles(angle, lightParams.angle! - halfWidth, lightParams.angle! + halfWidth)) {
    //if (angle < lightParams.angle - halfWidth || angle > lightParams.angle + halfWidth) {
      resultBuffer[i] = 0.0;
    } else {
      const isec = findNearestIntersectingSegment(angle, sinBuffer[i], cosBuffer[i], segments);
      resultBuffer[i] =  isec;
    }
  }
}

export const findVisibilityStrip = (lightId: number, pos: vec2, lightParams: LightParameters, items: ReadonlyArray<StaticObject>, resultBuffer: Float32Array) => {
  if (cache.isInCache({id: lightId, pos, angle: lightParams.angle, angularWidth: lightParams.angularWidth})) {
    return false;
  }

  cache.addOrUpdate({id:lightId, pos, angle: lightParams.angle, angularWidth: lightParams.angularWidth});
  
  findVisibilityStripNoCache(pos, lightParams, items, resultBuffer);

  return true;
}