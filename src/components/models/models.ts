import { vec2 } from "gl-matrix"

export interface Rect {
  width: number;
  height: number;
}

export interface Circle {
  radius: number;
}

export interface Model {
  color: string;
  shape: Rect | Circle;
  halfBoundingBox: vec2;
  kind: string
  isInside: (pos: vec2) => boolean;
}

export const circle = (radius: number, color = "black") : Model => { 
  return {
    shape: { radius: radius},
    kind: "circle",
    color: color,
    halfBoundingBox: vec2.fromValues(radius, radius),
    isInside: pos => vec2.squaredLength(pos) <= radius*radius
  }
}

// export const line = (from: vec2, to: vec2, color = "black") => {
//   return {type: "line", from: from, to: to, color: color}
// }

export const rect = (width = 5, height = 5, color = "black") : Model => {

  return {
    shape: { width: width, height: height},
    kind: "rect",
    color: color,
    halfBoundingBox: vec2.fromValues(width, height),
    isInside: pos => -width*0.5 <= pos[0] && pos[0] <= width*0.5 && -height*0.5 <= pos[1] && pos[1] <= height*0.5
  }
}