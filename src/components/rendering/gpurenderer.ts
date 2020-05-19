import { CanvasHelper } from './canvashelper'
import { GameState } from '../game/gamestate';
import { vec2, mat3 } from 'gl-matrix';
import { vertexShaderSource, fragmentShaderSource } from './shaders';


export interface GpuRenderer {
  getContext(): WebGLRenderingContext;
  width(): number;
  height(): number;

  draw(mainCanvas: HTMLCanvasElement, visibilityCanvas: HTMLCanvasElement): void;
}

export const getGpuRenderer = (canvasHelper: CanvasHelper, gamestate: GameState) => {

  const gl = canvasHelper.getWebGLContext();
  if (!gl) {
    console.error("Failed to get gl context.")
    return null;
  }

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

  const initGl = (program: WebGLProgram) => {
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

    const position = gl.getAttribLocation(program, "positionNdc"); // get the index of position attribute

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


    const mainTexture = gl.getUniformLocation(program, "mainTexture");
    gl.uniform1i(mainTexture, 0);

    const visibilityTexture = gl.getUniformLocation(program, "visibilityTexture");
    gl.uniform1i(visibilityTexture, 1);

  }

  const setUniform = (pos: vec2, name: string) => {
    const uniform = gl.getUniformLocation(program, name);
    gl.uniform2fv(uniform, pos);
  }



  const copyGameState = () => {
    setUniform(gamestate.player.pos, "playerPositionWorld");

    setUniform(gamestate.scene.light, "lightPositionWorld");

    const viewMatrix = gl.getUniformLocation(program, "viewMatrix");
    gl.uniformMatrix3fv(viewMatrix, false, canvasHelper.world2viewMatrix());

    const projectionMatrix = gl.getUniformLocation(program, "projectionMatrix");
    gl.uniformMatrix3fv(projectionMatrix, false, canvasHelper.view2ndcMatrix());
  }
  
  const initTexture = () => {
    const texture = gl.createTexture();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  };
  
  let mainTexture = initTexture();
  let visibilityTexture = initTexture();
  let initializeTextures = true;

  const draw = (mainCanvas: HTMLCanvasElement, visibilityCanvas: HTMLCanvasElement) => {
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    if (initializeTextures) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, mainTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mainCanvas);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, visibilityTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, visibilityCanvas);

      initializeTextures = false;
    } else {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, mainTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, mainCanvas);

      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, visibilityTexture);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, visibilityCanvas);
    }


    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  const program = initProgram()!;
  if (!program) {
    throw new Error("Failed to initialize.")
  }
  
  initGl(program);
  


  return {
    getContext: canvasHelper.getWebGLContext,
    width: canvasHelper.width,
    height: canvasHelper.height,
    draw: (mainCanvas: HTMLCanvasElement, visibilityCanvas: HTMLCanvasElement) => {


      gl.viewport(0, 0, canvasHelper.width(), canvasHelper.height());
      
      const aspectRatio =  canvasHelper.width() / canvasHelper.height();
      const aspect = gl.getUniformLocation(program, "aspect");
      gl.uniform1f(aspect, aspectRatio);

      copyGameState();

      draw(mainCanvas, visibilityCanvas);
    }
  }
}