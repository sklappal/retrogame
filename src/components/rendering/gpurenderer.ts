import { CanvasHelper } from './canvashelper'
import { GameState } from '../game/gamestate';
import { vec2, mat3, vec4 } from 'gl-matrix';
import { vertexShaderSource, fragmentShaderSource } from './shaders';
import { Rect, Circle, Model } from '../models/models';
import { findVisibilityStrip } from './visibility';


export interface GpuRenderer {
  getContext(): WebGL2RenderingContext;
  width(): number;
  height(): number;

  draw(): void;
}

interface BufferInfo {
  buffer: WebGLBuffer,
  itemCount: number
  itemSize: number
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

  const buffers: Map<string, BufferInfo> = new Map();

  const createRectBuffer = () => {
    const verts = [
      -1, -1, 0,
       1, -1, 0,
       1,  1, 0,

      -1, -1, 0,
       1,  1, 0,
      -1,  1, 0,
    ];
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

    buffers.set("rect", {buffer: buffer!, itemCount: 6, itemSize: 3});
  }

  const createCircleBuffer = () => {
    const verts = [];
    for (let i = 0; i < 256; i++) {
      
      verts.push([Math.cos(( i    / 256.0 ) * Math.PI * 2.0), Math.sin(( i    / 256.0 ) * Math.PI * 2.0), 0.0])
      verts.push([Math.cos(((i+1) / 256.0 ) * Math.PI * 2.0), Math.sin(((i+1) / 256.0 ) * Math.PI * 2.0), 0.0])
      verts.push([0.0, 0.0, 0.0]);
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const arr =  new Float32Array(verts.flatMap(v => v));
    
    gl.bufferData(gl.ARRAY_BUFFER, arr, gl.STATIC_DRAW);

    buffers.set("circle", {buffer: buffer!, itemCount:  256 * 3, itemSize: 3});
  }

  const createBuffers = () => {
    createRectBuffer();
    createCircleBuffer();
  }

  
  const initGl = (program: WebGLProgram) => {
    createBuffers();

    const position = gl.getAttribLocation(program, "positionModel");
    gl.enableVertexAttribArray(position);
    
    // const texCoordData = [
    //   0.0, 0.0,
    //   1.0, 0.0,
    //   1.0, 1.0,

    //   0.0, 0.0,
    //   1.0, 1.0,
    //   0.0, 1.0,
    // ];
    // const tbuffer = gl.createBuffer();
    // gl.bindBuffer(gl.ARRAY_BUFFER, tbuffer);
    // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoordData), gl.STATIC_DRAW);
    
    // const texCoord = gl.getAttribLocation(program, "coord");
    // gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 0, 0);
    // gl.enableVertexAttribArray(texCoord);


    // const visibilityTexture = gl.getUniformLocation(program, "visibilityTexture");
    // gl.uniform1i(visibilityTexture, 1);


  }


  const setUniform2fv = (pos: vec2, name: string) => {
    const uniform = gl.getUniformLocation(program, name);
    gl.uniform2fv(uniform, pos);
  }

  const setUniform1f = (val: number, name: string) => {
    const uniform = gl.getUniformLocation(program, name);
    gl.uniform1f(uniform, val);
  }

  const copyGameState = () => {
    setUniform2fv(gamestate.player.pos, "uPlayerPositionWorld");
    setUniform1f(gamestate.player.lightradius, "uPlayerLightRadius");

    setUniform2fv(gamestate.scene.light.pos, "uLightPositionWorld");
    setUniform1f(gamestate.scene.light.radius, "uLightRadius");

    const viewMatrix = gl.getUniformLocation(program, "uViewMatrix");
    gl.uniformMatrix3fv(viewMatrix, false, canvasHelper.world2viewMatrix());

    const projectionMatrix = gl.getUniformLocation(program, "uProjectionMatrix");
    gl.uniformMatrix3fv(projectionMatrix, false, canvasHelper.view2ndcMatrix());
  }

  const modelMatrix = mat3.create();

  const setModelMatrix = (matrix: mat3) => {
    const modelMatrixLocation = gl.getUniformLocation(program, "uModelMatrix");
    gl.uniformMatrix3fv(modelMatrixLocation, false, matrix);
  }

  const drawBuffer = (buffer: BufferInfo, modelMatrix: mat3, color: vec4) => {
    setModelMatrix(modelMatrix);

    const colorUniform = gl.getUniformLocation(program, "uColor");
    gl.uniform4fv(colorUniform, color);


    gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer);

    const position = gl.getAttribLocation(program, "positionModel");
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
        
    gl.drawArrays(gl.TRIANGLES, 0, buffer.itemCount);

    mat3.identity(modelMatrix);
    setModelMatrix(modelMatrix);
  }

  const backgroundColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
  const drawBackground = () => {
    const buffer = buffers.get("rect")!;

    mat3.invert(
      modelMatrix, 
      mat3.multiply(
        modelMatrix, canvasHelper.view2ndcMatrix(), canvasHelper.world2viewMatrix())
      );
    
    const color = gl.getUniformLocation(program, "uColor");
    gl.uniform4fv(color, backgroundColor);
    
    drawBuffer(buffer, modelMatrix, backgroundColor);
  }

  const drawCircleBuffer = vec2.create();
  const drawCircle = (radius: number, pos: vec2, color: vec4) => {
    mat3.identity(modelMatrix);
    mat3.translate(modelMatrix, modelMatrix, pos);
    mat3.scale(modelMatrix, modelMatrix, vec2.set(drawCircleBuffer, radius, radius));
    const buffer = buffers.get("circle")!;
    drawBuffer(buffer, modelMatrix, color);
  }

  const drawRectBuffer = vec2.create();
  const drawRect = (width: number, height: number, pos: vec2, color: vec4) => {
    mat3.identity(modelMatrix);
    mat3.translate(modelMatrix, modelMatrix, pos);
    mat3.scale(modelMatrix, modelMatrix, vec2.set(drawRectBuffer, width * 0.5, height * 0.5));
    const buffer = buffers.get("rect")!;
    drawBuffer(buffer, modelMatrix, color);
  }

  const drawShape = (model: Model, pos: vec2, color: vec4) => {
    if (model.kind === "rect") {
      const shape = model.shape as Rect;
      drawRect(shape.width, shape.height, pos, color);
    } else if (model.kind === "circle") {
      const shape = model.shape as Circle;
      drawCircle(shape.radius, pos, color);
    }
  }

  const staticObjectsColor = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
  const drawStaticObjects = () => {
    gamestate.scene.staticObjects.forEach(so => {
      drawShape(so.model, so.pos, staticObjectsColor);
    });
  }

  const dynamicObjectsColor = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
  const drawDynamicObjects = () => {
    gamestate.scene.dynamicObjects.forEach(so => {
      drawShape(so.model, so.pos, dynamicObjectsColor);
    });
  }

  const lightColor = vec4.fromValues(0.1, 0.1, 0.1, 1.0);
  const drawLights = () => {
    drawCircle(0.2, gamestate.scene.light.pos, lightColor)
  }

  const playerColor = vec4.fromValues(1.0, 0.0, 0.0, 1.0);
  const drawPlayer = () =>  {
    drawCircle(0.5, gamestate.player.pos, playerColor)
  }

  const drawScene = () => {
    gl.viewport(0, 0, canvasHelper.width(), canvasHelper.height());
    gl.clear(gl.COLOR_BUFFER_BIT);

    copyGameState();

    drawBackground();

    drawStaticObjects();

    drawDynamicObjects();

    drawLights();

    drawPlayer();
  }
  const width = 512;
  const height = 2;
  const pixels = new Uint8Array(width*height);
  const updateTexture = () => {
      findVisibilityStrip(gamestate.player.pos, gamestate.player.lightradius, gamestate.scene.staticObjects, pixels.subarray(0, width));
      findVisibilityStrip(gamestate.scene.light.pos, gamestate.scene.light.radius, gamestate.scene.staticObjects, pixels.subarray(width, 2*width));

      gl.activeTexture(gl.TEXTURE0)
      
      gl.bindTexture(gl.TEXTURE_2D, myTexture);
      
      const sampler = gl.getUniformLocation(program, 'uSampler');
      gl.uniform1i(sampler, 0);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RED, gl.UNSIGNED_BYTE, pixels);
  }

  const initTexture = () => {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    const sampler = gl.getUniformLocation(program, 'uSampler');
    gl.uniform1i(sampler, 0);
  
    const level = 0;
    const internalFormat = gl.R8;
    
    const border = 0;
    const srcFormat = gl.RED;
    const srcType = gl.UNSIGNED_BYTE;
    const pixels = new Uint8Array(width*height);
    
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  width, height, border, srcFormat, srcType,
                  pixels);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.activeTexture(gl.TEXTURE0)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    
    gl.uniform1i(sampler, 0);
    
    return texture;
  };
 
  const program = initProgram()!;
  const myTexture = initTexture();
  
 
  if (!program) {
    throw new Error("Failed to initialize.")
  }
  
  initGl(program);
  


  return {
    getContext: canvasHelper.getWebGLContext,
    width: canvasHelper.width,
    height: canvasHelper.height,
    draw: () => {
      updateTexture();
      drawScene();

    }
  }
}