
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
  kind: string
}

export const circle = (radius: number, color = "black") : Model => { 
  return {
    shape: { radius: radius},
    kind: "circle",
    color: color
  }
}

// export const line = (from: vec2, to: vec2, color = "black") => {
//   return {type: "line", from: from, to: to, color: color}
// }

export const rect = (width = 5, height = 5, color = "black") : Model => {

  return {
    shape: { width: width, height: height},
    kind: "rect",
    color: color
  }
}