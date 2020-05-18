import { CanvasHelper, getCanvasHelper } from './canvashelper'
import { GameState } from '../game/gamestate';
import { getPrimitiveRenderer } from './primitiverenderer';
import { findVisibleRegion } from './visibility';


export interface GpuRenderer {
  getContext(): WebGLRenderingContext;
  width(): number;
  height(): number;

  draw(): void;
}

export const getGpuRenderer = (canvasHelper: CanvasHelper, gamestate: GameState) => {

  const gl = canvasHelper.getWebGLContext();
  if (!gl) {
    console.error("Failed to get gl context.")
    return null;
  }

  const vertexShaderSource = `
  ///////////////////
  // Vertex Shader //
  ///////////////////
    

  attribute vec3 position;
  attribute vec2 coord;

  varying vec2 texCoord;
  varying vec2 vPos;
  uniform float aspect;

  void main(void) {
    gl_Position = vec4(position, 1.0);
    texCoord = coord;
    vPos = vec2(position.x * aspect,  position.y);
  }

  ///////////////////`;

  const fragmentShaderSource = `
  /////////////////////
  // Fragment Shader //
  /////////////////////

  precision mediump float;
  uniform sampler2D texture0;
  varying vec2 texCoord;
  varying vec2 vPos;

  uniform vec2 playerPosition;

  void main(void) {
    vec4 color = texture2D(texture0, texCoord);

    float d = distance(vPos, playerPosition.xy)*2.0;
    

    if (color.x == 0.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    }
    else {
      gl_FragColor = mix(vec4(1.0, 0.0, 0.0, 1.0), vec4(0.0, 0.0, 0.0, 1.0), sqrt(d)*0.8);
    }
  }

  /////////////////////`;


  const compileShader = (shaderSource: string, shaderType: number): WebGLShader => {
    const shader = gl.createShader(shaderType)!;
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);
    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
      console.log('Shader compilation failed.');
      const compilationLog = gl.getShaderInfoLog(shader);
      console.log('Shader compiler log: ' + compilationLog);
      throw new Error(compilationLog ?? "null");
    } 
    return shader;
  }

  const initProgram = () =>  {
    const vertexShader =  compileShader(vertexShaderSource, gl.VERTEX_SHADER);

    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);
   
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.detachShader(program, vertexShader);
    gl.detachShader(program, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      var linkErrLog = gl.getProgramInfoLog(program);
      console.log("Shader program did not link successfully: ", linkErrLog)
      return;
    }

    gl.useProgram(program);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    return program;
  };
  
  var initTexture = () => {
    const texture = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  var initGl = (program: WebGLProgram) => {
    const verts = [
      -1, -1, 0.0,
      1, -1, 0.0,
      1, 1, 0.0,

      -1, -1, 0.0,
      1, 1, 0.0,
      -1, 1, 0.0,
    ];
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, "position"); // get the index of position attribute

    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0); // bind it to the current buffer (^^ vertex buffer)
    gl.enableVertexAttribArray(position);

    const texCoordData = [
      0.0, 0.0,
      1.0, 0.0,
      1.0, 1.0,

      0.0, 0.0,
      1.0, 1.0,
      0.0, 1.0,
    ];
    const tbuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tbuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoordData), gl.STATIC_DRAW);
    
    const texCoord = gl.getAttribLocation(program, "coord");
    gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texCoord);


    const texture0 = gl.getUniformLocation(program, "texture0");
    gl.uniform1i(texture0, 0);
  }

  const copyGameState = (aspect: number) => {
    const playerPosition = gl.getUniformLocation(program, "playerPosition");
    const canvasCoordinates = canvasHelper.world2canvas(gamestate.player.pos);

    const vertexCoordinates = [ (canvasCoordinates[0] / canvasHelper.width()) * 2.0 - 1, 
      (canvasCoordinates[1] / canvasHelper.height()) * 2.0 - 1]

    gl.uniform2fv(playerPosition, [ aspect * vertexCoordinates[0], -1.0*vertexCoordinates[1]]);
  }

  const offScreenCanvas = document.createElement('canvas');
  const draw = () => {
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, offScreenCanvas);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  const program = initProgram()!;
  if (!program) {
    throw new Error("Failed to initialize.")
  }
  initGl(program);
  initTexture();

  const primitiveRenderer = getPrimitiveRenderer(getCanvasHelper(offScreenCanvas, gamestate.camera));


  return {
    getContext: canvasHelper.getWebGLContext,
    width: canvasHelper.width,
    height: canvasHelper.height,
    draw: () => {
      if (canvasHelper.width() != offScreenCanvas.width || canvasHelper.height() != offScreenCanvas.height) {
        offScreenCanvas.width = canvasHelper.width();
        offScreenCanvas.height = canvasHelper.height();
        gl.viewport(0, 0, canvasHelper.width(), canvasHelper.height());
      }

      
      const aspectRatio =  canvasHelper.width() / canvasHelper.height();
      const aspect = gl.getUniformLocation(program, "aspect");
      gl.uniform1f(aspect, aspectRatio);

      copyGameState(aspectRatio);

      // const ctx = primitiveRenderer.getContext();
      // ctx.filter = "blur(2px)"
      const lightvolumes = findVisibleRegion(gamestate.player.pos, 200.0, gamestate.scene.staticObjects);
      primitiveRenderer.clearCanvas("#00000000");
      primitiveRenderer.fillPoly(lightvolumes, "red");
      gamestate.scene.staticObjects.forEach(el => primitiveRenderer.drawModel(el.pos, el.model))

      draw();
    }
  }
}