import { vec2 } from 'gl-matrix'
import { GameState } from '../game/gamestate';
import { Model, Circle, Rect } from '../models/models';

export interface PrimitiveRenderer {
  getContext(): CanvasRenderingContext2D
  width(): number
  height(): number
  canvasDimensionsWorld(): {pos: vec2, width: number, height: number}

  drawCircle(pos: vec2, radius: number, color: string): void
  drawModel(pos: vec2, element: Model): void
  fillPolyRadial(points: ReadonlyArray<vec2>, radialOrigin: vec2, radius: number, color: string): void
  
  clearCanvas(): void
  
  drawTextCanvas(pos: vec2, text: string): void
}


export const getPrimitiveRenderer = (canvas: HTMLCanvasElement, gamestate: GameState) => {

  const camera = gamestate.camera;
  const sizeScaler = gamestate.camera.fieldOfview;
  const halfsizeScaler = sizeScaler * 0.5;

  const getContext: () => CanvasRenderingContext2D = () => getCanvas().getContext("2d")!;

  const getCanvas = () => canvas;
  
  const width = () => getCanvas().width;

  const height = () => getCanvas().height;  

  const minExtent = () => Math.min(width(), height());

  const canvasDimensionsWorld = () => {
    return {
      pos: canvas2world(vec2.fromValues(0.0, 0.0)),
      width: canvas2worldLength(width()),
      height: canvas2worldLength(height())
    }
  }

  const pixelSize = () => minExtent() * (1.0 / sizeScaler);

  const world2canvas = (pos: vec2) => vec2.fromValues(
    (pos[0] - camera.pos[0] + halfsizeScaler) * pixelSize() + (width() - minExtent()) * 0.5, 
    (pos[1] - camera.pos[1] + halfsizeScaler) * pixelSize() + (height() - minExtent()) * 0.5);

  const world2canvasLength = (length: number) => length * pixelSize();

  const canvas2worldLength = (pixelCount: number) => pixelCount * (1.0 / pixelSize());

  const canvas2world = (pos: vec2) => vec2.fromValues(
    (pos[0] - (width() - minExtent())*0.5) / pixelSize() - halfsizeScaler + camera.pos[0],
    (pos[1] - (height() - minExtent())*0.5) / pixelSize() - halfsizeScaler + camera.pos[1]);

  const clearCanvas = () => {
    var ctx = getContext();
    ctx.fillStyle = "#080808";
    ctx.fillRect(0, 0, width(), height());
  }

  const drawRadialGradient = (pos: vec2, radius: number, color: string) => {
    var ctx = getContext();
    var posCanvas = world2canvas(pos);
    var radiusCanvas = world2canvasLength(radius);
    var grd = ctx.createRadialGradient(posCanvas[0], posCanvas[1], 0.1, posCanvas[0], posCanvas[1], radiusCanvas);
    grd.addColorStop(0.0, color);
    grd.addColorStop(0.5, '#00000000');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width(), height());
  }

  const drawCircle = (pos: vec2, radius: number, color = "black") => {
    const posCanvas = world2canvas(pos);
    var radiuscanvas = world2canvasLength(radius);
    var ctx = getContext();
    ctx.beginPath();
    ctx.arc(posCanvas[0], posCanvas[1], radiuscanvas, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
  }

  const drawRect = (pos: vec2, w: number, h: number, color = "black") => {
    const posAdjusted = vec2.fromValues(pos[0] - w*0.5, pos[1] - h*0.5);
    const posCanvas = world2canvas(posAdjusted);
    var ctx = getContext();
    ctx.fillStyle = color;
    ctx.fillRect(posCanvas[0], posCanvas[1], world2canvasLength(w), world2canvasLength(h));
  }
  
  const drawSquare = (pos: vec2, w: number, color = "black") => drawRect(pos, w, w, color)

  const drawLine = (from: vec2, to: vec2, color = "black") => {
    const fromCanvas = world2canvas(from)
    const toCanvas = world2canvas(to)
    var ctx = getContext();
    ctx.beginPath();
    ctx.moveTo(fromCanvas[0], fromCanvas[1]);
    ctx.lineTo(toCanvas[0], toCanvas[1]);
    
    ctx.strokeStyle = color;
    ctx.stroke(); 
  }

  const drawModel = (pos: vec2, element: Model) => {
    if (element.kind === "circle") {
      const shape = element.shape as Circle;
      drawCircle(pos, shape.radius, element.color)
    } else if (element.kind === "rect") {
      const shape = element.shape as Rect;
      drawRect(pos, shape.width, shape.height, element.color)
    } else {
      console.log("unknown model shape")
    }
  }

  const drawCompositeModel = (pos: vec2, items: Iterable<Model>) => {    
    for (const element of items) {
      drawModel(pos, element)
    }
  }

  const fillPoly = (points: ReadonlyArray<vec2>, color = '#000000EE') => {
    var ctx = getContext();
    ctx.fillStyle = color;
    ctx.beginPath();

    const firstCanvas = world2canvas(points[0]);
    ctx.moveTo(firstCanvas[0], firstCanvas[1]);
    for(var i = 1; i < points.length; i++) {
      const canvas = world2canvas(points[i]);
      ctx.lineTo(canvas[0], canvas[1])
    }
    ctx.closePath();
    ctx.fill();
  }

  const fillPolyRadial = (points: ReadonlyArray<vec2>, radialOrigin: vec2, radius: number, color = '#000000EE') => {
    
    var ctx = getContext();
    var posCanvas = world2canvas(radialOrigin);
    var radiusCanvas = world2canvasLength(radius);
    var grd = ctx.createRadialGradient(posCanvas[0], posCanvas[1], 0.1, posCanvas[0], posCanvas[1], radiusCanvas);
    grd.addColorStop(0.0, color);
    grd.addColorStop(0.5, '#00000000');
    
    ctx.fillStyle = grd;
    ctx.strokeStyle = "white"
    ctx.beginPath();

    const canvasPoints = points.map(p => world2canvas(p));

    const firstCanvas = canvasPoints[0];
    ctx.moveTo(firstCanvas[0], firstCanvas[1]);
    for(var i = 1; i < points.length; i++) {
      const canvas = canvasPoints[i];
      ctx.lineTo(canvas[0], canvas[1])
    }
    ctx.closePath();
    ctx.fill();
    if (gamestate.config.debug)
      ctx.stroke();

    if (gamestate.config.debug)
      canvasPoints.forEach((p, i) => drawTextCanvas(p, (i+1).toString()))
  }

  const drawTextCanvas = (pos: vec2, text: string) => {
    const ctx = getContext();
    ctx.fillStyle = "white";
    ctx.fillText(text, pos[0], pos[1]);
  }

  return {
    getContext: getContext,
    width: width,
    height: height,
    canvasDimensionsWorld: canvasDimensionsWorld,
    world2canvas: world2canvas,
    clearCanvas: clearCanvas,
    drawRadialGradient:  drawRadialGradient,
    drawCircle: drawCircle,
    drawRect: drawRect,
    drawSquare: drawSquare,
    drawLine: drawLine,
    drawModel: drawModel,
    drawCompositeModel: drawCompositeModel,
    drawTextCanvas: drawTextCanvas,
    fillPoly: fillPoly,
    fillPolyRadial: fillPolyRadial
  };
}