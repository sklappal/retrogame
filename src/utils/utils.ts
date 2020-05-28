import { vec3 } from "gl-matrix";

export const requestAnimFrame = () => {
  return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         function(/* function FrameRequestCallback */ callback: TimerHandler, /* DOMElement Element */ element: any) {
           window.setTimeout(callback, 1000/60);
         };
};

export const interpolate = (v0: number, v1: number, t: number) => {
  return (1.0-t) * v0 + t * v1;
}

export const normalizeTo2pi = (angle: number) => {
  if (angle < -Math.PI)
    return angle + 2 * Math.PI;
  if (angle > Math.PI)
    return angle - 2 * Math.PI
  return angle
}

export const smoothstep = (edge0: number, edge1: number, x :number) => {
  // Scale, bias and saturate x to 0..1 range
  x = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0); 
  // Evaluate polynomial
  return x * x * (3 - 2 * x);
}

export const clamp = (x: number, lowerlimit: number, upperlimit: number) => {
  if (x < lowerlimit)
    x = lowerlimit;
  if (x > upperlimit)
    x = upperlimit;
  return x;
}

export const hslToRgb = (h:number, s:number, l:number) => {
  var r, g, b;

  if(s === 0){
      r = g = b = l; // achromatic
  }else{
      var hue2rgb = function hue2rgb(p:number, q:number, t:number){
          if(t < 0) t += 1;
          if(t > 1) t -= 1;
          if(t < 1/6) return p + (q - p) * 6 * t;
          if(t < 1/2) return q;
          if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
      }

      var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      var p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
  }

  return vec3.fromValues(r, g, b);
}

export const randomColor = () => {
  return hslToRgb(Math.random(), 1.0, 0.5);
}

