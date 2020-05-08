import { vec2 } from 'gl-matrix'

const canvasUtils = (canvas) => {

  const sizeScaler = 100.0;
  const halfsizeScaler = sizeScaler * 0.5;

  const getContext = () => getCanvas().getContext("2d");

  const getCanvas = () => canvas;
  
  const width = () => getCanvas().width;

  const height = () => getCanvas().height;  

  const minExtent = () => Math.min(width(), height());

  const world2canvas = pos => vec2.fromValues(
    (pos[0] + halfsizeScaler) * minExtent() * (1.0 / sizeScaler) + (width() - minExtent()) * 0.5, 
    (pos[1] + halfsizeScaler) * minExtent() * (1.0 / sizeScaler) + (height() - minExtent()) * 0.5);

  const world2canvasLength = length => length * minExtent() * (1.0 / halfsizeScaler);

  const clearCanvas = () => {
    var ctx = getContext();
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width(), height());
  }

  const drawRadialGradient = (pos, radius) => {
    var ctx = getContext();
    var posCanvas = world2canvas(pos);
    var radiusCanvas = world2canvasLength(radius);
    var grd = ctx.createRadialGradient(posCanvas[0], posCanvas[1], 0.1, posCanvas[0], posCanvas[1], radiusCanvas);
    grd.addColorStop(0.0, '#AAAAAAAA');
    grd.addColorStop(0.5, '#000000AA');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, width(), height());
  }

  const drawCircle = (pos, radius, color = "black") => {
    const posCanvas = world2canvas(pos);
    var radiuscanvas = world2canvasLength(radius);
    var ctx = getContext();
    ctx.beginPath();
    ctx.arc(posCanvas[0], posCanvas[1], radiuscanvas, 0, 2 * Math.PI, false);
    ctx.fillStyle = color;
    ctx.fill();
  }

  const drawRect = (pos, w, h, color = "black") => {
    const posCanvas = world2canvas(pos);
    var ctx = getContext();
    ctx.fillStyle = color;
    ctx.fillRect(posCanvas[0], posCanvas[1], world2canvasLength(w), world2canvasLength(h));
  }
  
  const drawSquare = (pos, w, color = "black") => drawRect(pos, w, w, color)

  const drawLine = (from, to, color = "black") => {
    const fromCanvas = world2canvas(from)
    const toCanvas = world2canvas(to)
    var ctx = getContext();
    ctx.beginPath();
    ctx.moveTo(fromCanvas[0], fromCanvas[1]);
    ctx.lineTo(toCanvas[0], toCanvas[1]);
    
    ctx.strokeStyle = color;
    ctx.stroke(); 
  }

  const drawTextCanvas = (pos, text) => {
    const ctx = getContext();
    ctx.fillStyle = "white";
    ctx.fillText(text, pos[0], pos[1]);
  }

  return {
    getContext: getContext,
    width: width,
    height: height,
    world2canvas: world2canvas,
    clearCanvas: clearCanvas,
    drawRadialGradient:  drawRadialGradient,
    drawCircle: drawCircle,
    drawRect: drawRect,
    drawSquare: drawSquare,
    drawLine: drawLine,
    drawTextCanvas: drawTextCanvas
  };
}

export default canvasUtils;