import { vec2 } from 'gl-matrix'
import { Model, Circle, Rect } from '../models/models';
import { CanvasHelper } from './canvashelper';

export enum valign {TOP, CENTER, BOTTOM};
export enum halign {LEFT, CENTER, RIGHT};

export const getPrimitiveRenderer = (canvasHelper: CanvasHelper) => {

  const getContext: () => CanvasRenderingContext2D = canvasHelper.getContext;

  const width = canvasHelper.width;

  const height = canvasHelper.height;

  const clearCanvas = (color: string) => {
    var ctx = getContext();
    ctx.clearRect(0, 0, width(), height());
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width(), height());
  }

  const setTransform = (m11: number, m12: number, m21: number, m22: number, dx: number, dy: number) => {
    getContext().setTransform(m11, m12, m21, m22, dx, dy);
  }

  const resetTransform = () => getContext().resetTransform()

  const drawCircle = (pos: vec2, radius: number, width = 1.0, color = "black") => {
    const posCanvas = canvasHelper.world2canvas(pos);
    var radiuscanvas = canvasHelper.world2canvasLength(radius);
    drawCircleCanvas(posCanvas, radiuscanvas, width, color);

  }

  const drawCircleCanvas = (pos: vec2, radius: number, width = 1.0, color = "black") => {
    var ctx = getContext();
    ctx.beginPath();
    ctx.arc(pos[0], pos[1], radius, 0, 2*Math.PI, false);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  const drawArc = (pos: vec2, radius: number, startAngle: number, endAngle: number, width = 1.0,  color = "black") => {
    const posCanvas = canvasHelper.world2canvas(pos);
    var radiuscanvas = canvasHelper.world2canvasLength(radius);
    drawArcCanvas(posCanvas, radiuscanvas, startAngle, endAngle, width, color);
  }

  const drawArcCanvas = (pos: vec2, radius: number, startAngle: number, endAngle: number, width = 1.0, color = "black") => {
    var ctx = getContext();
    ctx.beginPath();
    ctx.arc(pos[0], pos[1], radius, startAngle, endAngle, false);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  const drawRect = (pos: vec2, w: number, h: number, color = "black") => {
    const posAdjusted = vec2.fromValues(pos[0] - w*0.5, pos[1] - h*0.5);
    const posCanvas = canvasHelper.world2canvas(posAdjusted);
    var ctx = getContext();
    ctx.fillStyle = color;
    ctx.fillRect(posCanvas[0], posCanvas[1], canvasHelper.world2canvasLength(w), canvasHelper.world2canvasLength(h));
  }
  
  const drawLine = (from: vec2, to: vec2, width = 1.0, color = "black") => {
    const fromCanvas = canvasHelper.world2canvas(from)
    const toCanvas = canvasHelper.world2canvas(to)
    drawLineCanvas(fromCanvas, toCanvas, width, color);
  }

  const drawLineCanvas = (fromCanvas: vec2, toCanvas: vec2, width = 1.0, color = "black") => {
    var ctx = getContext();
    ctx.beginPath();
    ctx.moveTo(fromCanvas[0], fromCanvas[1]);
    ctx.lineTo(toCanvas[0], toCanvas[1]);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke(); 
  }

  const drawModel = (pos: vec2, element: Model) => {
    if (element.kind === "circle") {
      const shape = element.shape as Circle;
      drawCircle(pos, shape.radius, 1.0, element.color)
    } else if (element.kind === "rect") {
      const shape = element.shape as Rect;
      drawRect(pos, shape.width, shape.height, element.color)
    } else {
      console.log("unknown model shape")
    }
  }

  /* eslint-disable-next-line */
  const drawCompositeModel = (pos: vec2, items: Iterable<Model>) => {    
    for (const element of items) {
      drawModel(pos, element)
    }
  }

  const fillPoly = (points: ReadonlyArray<vec2>, color = '#000000EE') => {
    var ctx = getContext();
    ctx.fillStyle = color;
    ctx.beginPath();

    const firstCanvas = canvasHelper.world2canvas(points[0]);
    ctx.moveTo(firstCanvas[0], firstCanvas[1]);
    for(var i = 1; i < points.length; i++) {
      const canvas = canvasHelper.world2canvas(points[i]);
      ctx.lineTo(canvas[0], canvas[1])
    }
    ctx.closePath();
    ctx.fill();
  }

  const fillPolyRadial = (points: ReadonlyArray<vec2>, radialOrigin: vec2, radius: number, color = '#000000EE') => {
    
    var ctx = getContext();
    var posCanvas = canvasHelper.world2canvas(radialOrigin);
    var radiusCanvas = canvasHelper.world2canvasLength(radius);
    var grd = ctx.createRadialGradient(posCanvas[0], posCanvas[1], 0.1, posCanvas[0], posCanvas[1], radiusCanvas);
    grd.addColorStop(0.0, color);
    grd.addColorStop(0.5, '#00000000');
    
    ctx.fillStyle = grd;
    ctx.beginPath();

    const canvasPoints = points.map(p => canvasHelper.world2canvas(p));

    const firstCanvas = canvasPoints[0];
    ctx.moveTo(firstCanvas[0], firstCanvas[1]);
    for(var i = 1; i < points.length; i++) {
      const canvas = canvasPoints[i];
      ctx.lineTo(canvas[0], canvas[1])
    }
    ctx.closePath();
    ctx.fill();
  }

  const drawTextCanvas = (row: number, text: string, v: valign, h: halign) => {
    const ctx = getContext();
    ctx.fillStyle = "magenta";
    let leftOffset = 0;
    let topOffset = row * 20;
    if (v === valign.CENTER) {
      topOffset = height() * 0.5 + topOffset;
    } 
    if (v === valign.BOTTOM) {
      topOffset = height() - topOffset - 10;
    }

    const textWidth = ctx.measureText(text).width;

    if (h === halign.CENTER) {
      leftOffset = width() * 0.5 - textWidth*0.5;
    }
    if (h === halign.RIGHT) {
      leftOffset = width() - textWidth - 10;
    }

    ctx.fillText(text, leftOffset, topOffset);
  }

  return {
    getContext: getContext,
    setTransform: setTransform,
    resetTransform: resetTransform,
    width: width,
    height: height,
    clearCanvas: clearCanvas,
    drawCircle: drawCircle,
    drawCircleCanvas: drawCircleCanvas,
    drawArc: drawArc,
    drawArcCanvas: drawArcCanvas,
    drawLine: drawLine,
    drawLineCanvas: drawLineCanvas,
    drawModel: drawModel,
    fillPolyRadial: fillPolyRadial,
    fillPoly: fillPoly,
    drawTextCanvas: drawTextCanvas,
  };
}