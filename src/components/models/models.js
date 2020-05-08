const circle = (pos, radius, color = "black") => { 
  return {type: "circle", pos: pos, radius: radius, color: color}
}

const line = (from, to, color = "black") => {
  return {type: "line", from: from, to: to, color: color}
}

const rect = (width, height, color = "black") => {
  return {type: "rect", width: width, height: height, color: color}
}

export const playerModel = {
  items: [
    circle([0.0, 0.0], 1.0), // head
    circle([-0.25,-0.1], 0.1, "white"), // eye
    circle([0.25,-0.1], 0.1, "white"), // eye
    circle([0.0,0.5], 0.2, "white"), // mouth
    line([0.0, 1.0], [0.0, 4.0]), // torso
    line([-2.0, 2.0], [2.0, 2.0]), // arms
    line([-1.0, 6.5], [0.0, 4.0]), // left leg
    line([1.0, 6.5], [0.0, 4.0]), // right leg
    line([1.8, 2.0], [2.0, 1.0]), // torch
    circle([2.0, 0.5], 0.2, "white") // torch bulb
  ]
}

export const boxModel = (w = 20, h = 20) => {
  return { items: [rect(w, h)] }
}