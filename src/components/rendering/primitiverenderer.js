import { vec2 } from 'gl-matrix'
import { gamestate } from '../game/gamestate';

const primitiveRenderer = (canvas, camera) => {

  const sizeScaler = 100.0;
  const halfsizeScaler = sizeScaler * 0.5;

  const getContext = () => getCanvas().getContext("2d");

  const getCanvas = () => canvas;
  
  const width = () => getCanvas().width;

  const height = () => getCanvas().height;  

  const minExtent = () => Math.min(width(), height());

  const world2canvas = pos => vec2.fromValues(
    (pos[0] - camera[0] + halfsizeScaler) * minExtent() * (1.0 / sizeScaler) + (width() - minExtent()) * 0.5, 
    (pos[1] - camera[1] + halfsizeScaler) * minExtent() * (1.0 / sizeScaler) + (height() - minExtent()) * 0.5);

  const world2canvasLength = length => length * minExtent() * (1.0 / sizeScaler);

  const clearCanvas = () => {
    var ctx = getContext();
    ctx.fillStyle = "#080808";
    ctx.fillRect(0, 0, width(), height());
  }

  const drawRadialGradient = (pos, radius, color) => {
    var ctx = getContext();
    var posCanvas = world2canvas(pos);
    var radiusCanvas = world2canvasLength(radius);
    var grd = ctx.createRadialGradient(posCanvas[0], posCanvas[1], 0.1, posCanvas[0], posCanvas[1], radiusCanvas);
    grd.addColorStop(0.0, color);
    grd.addColorStop(0.5, '#00000000');
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

  const drawModel = (pos, element) => {
    if (element.type === "circle") {
      drawCircle([pos[0] + element.pos[0], pos[1] + element.pos[1]], element.radius, element.color)
    } else if (element.type === "line") {
      drawLine([pos[0] + element.from[0], pos[1] + element.from[1]], [pos[0] + element.to[0], pos[1] + element.to[1]], element.color)
    } else if (element.type === "rect") {
      drawRect(pos, element.width, element.height, element.color)
    } else {
      console.log("unknown model shape")
    }
  }

  const drawCompositeModel = (pos, compositeModel) => {    
    compositeModel.items.forEach(element => {
      drawModel(pos, element)
    });
  }

  const fillPoly = (points, color = '#000000EE') => {
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

  const fillPolyRadial = (points, radialOrigin, radius, color = '#000000EE') => {
    
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
    if (gamestate.debug)
      ctx.stroke();

    if (gamestate.debug)
      canvasPoints.forEach((p, i) => drawTextCanvas(p, i+1))
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
    drawModel: drawModel,
    drawCompositeModel: drawCompositeModel,
    drawTextCanvas: drawTextCanvas,
    fillPoly: fillPoly,
    fillPolyRadial: fillPolyRadial
  };
}

export default primitiveRenderer;