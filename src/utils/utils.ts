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
export const randomColorG = (random: () => number) => {
  return hslToRgb(random(), 1.0, 0.5);
}

// https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript/47593316#47593316

const xmur3 = (str:string) =>  {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
  }
  return function() {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
  }
}

const sfc32 = (a:number, b:number, c:number, d:number) => {
  return function() {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0; 
    var t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = c + (c << 3) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  }
}

export const getRandomGenerator = (seed: string = "") => {
  const seeder = xmur3(seed);
  console.log(seed)
  console.log(seeder())
  let ret = sfc32(seeder(), seeder(), seeder(), seeder());
  
  for (var i = 0; i < 15; i++) 
    ret();

  return ret;
}

