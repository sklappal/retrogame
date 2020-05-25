import { CanvasHelper } from './canvashelper'
import { GameState } from '../game/gamestate';
import { vec2, mat3, vec4, vec3 } from 'gl-matrix';
import { vertexShaderSource, fragmentShaderSource } from './shaders';
import { Rect, Circle, Model } from '../models/models';
import { findVisibilityStrip } from './visibility';
import * as twgl from 'twgl.js'
import { BufferInfo } from 'twgl.js'


export interface GpuRenderer {
  getContext(): WebGL2RenderingContext;
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
 

  const initProgram = () => {
    const programInfo = twgl.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource]);

    const ext = gl.getExtension("EXT_color_buffer_float");
    if (!ext) {
      console.log("sorry, can't render to floating point textures");
      return;
    }

    
    gl.useProgram(programInfo.program);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.BLEND);

    return programInfo;
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

    const arrays = {
      position: verts,
    };
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    buffers.set("rect", bufferInfo);
  }

  const createCircleBuffer = () => {
    const verts = [];
    for (let i = 0; i < 256; i++) {
      
      verts.push([Math.cos(( i    / 256.0 ) * Math.PI * 2.0), Math.sin(( i    / 256.0 ) * Math.PI * 2.0), 0.0])
      verts.push([Math.cos(((i+1) / 256.0 ) * Math.PI * 2.0), Math.sin(((i+1) / 256.0 ) * Math.PI * 2.0), 0.0])
      verts.push([0.0, 0.0, 0.0]);
    }
    const arr =  new Float32Array(verts.flatMap(v => v));
    const arrays = {
      position: arr,
    };
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    buffers.set("circle", bufferInfo);
  }

  const createBuffers = () => {
    createRectBuffer();
    createCircleBuffer();
  }

  const setLightUniforms = (pos: vec2, color: vec3, intensity: number, index: number) => {
    let location = gl.getUniformLocation(programInfo.program, "uLightPositionsWorld[" + index + "]")
    gl.uniform2f(location, pos[0], pos[1]);

    location = gl.getUniformLocation(programInfo.program, "uLightColors[" + index + "]")
    gl.uniform3f(location, color[0], color[1], color[2]);
    
    location = gl.getUniformLocation(programInfo.program, "uLightIntensities[" + index + "]")
    gl.uniform1f(location, intensity);
  }
  
  const initGl = () => {
    createBuffers();
  }

  const copyGameState = () => {
    const uniforms = {
      uPlayerPositionWorld: gamestate.player.pos,
      uLightPositionWorld: gamestate.scene.light.pos,
      uViewMatrix: canvasHelper.world2viewMatrix(),
      uProjectionMatrix: canvasHelper.view2ndcMatrix()
    }
    
    twgl.setUniforms(programInfo, uniforms);

    setLightUniforms(gamestate.player.pos, gamestate.player.light.color, gamestate.player.light.intensity, 0);
    setLightUniforms(gamestate.scene.light.pos, gamestate.scene.light.params.color, gamestate.scene.light.params.intensity, 1);

    
  }

  const modelMatrix = mat3.create();

  const drawBuffer = (bufferInfo: BufferInfo, color: vec4) => {
    twgl.setUniforms(programInfo, {
      uModelMatrix: modelMatrix,
      uColor: color
    });

    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.drawBufferInfo(gl, bufferInfo);

    mat3.identity(modelMatrix);
  }

  const backgroundColor = vec4.fromValues(1.0, 1.0, 1.0, 1.0);
  const drawBackground = () => {
    const buffer = buffers.get("rect")!;

    mat3.invert(
      modelMatrix, 
      mat3.multiply(
        modelMatrix, canvasHelper.view2ndcMatrix(), canvasHelper.world2viewMatrix())
      );
    
    drawBuffer(buffer, backgroundColor);
  }

  const drawCircleBuffer = vec2.create();
  const drawCircle = (radius: number, pos: vec2, color: vec4) => {
    mat3.translate(modelMatrix, modelMatrix, pos);
    mat3.scale(modelMatrix, modelMatrix, vec2.set(drawCircleBuffer, radius, radius));
    const buffer = buffers.get("circle")!;
    drawBuffer(buffer, color);
  }

  const drawRectBuffer = vec2.create();
  const drawRect = (width: number, height: number, pos: vec2, color: vec4) => {
    mat3.translate(modelMatrix, modelMatrix, pos);
    mat3.scale(modelMatrix, modelMatrix, vec2.set(drawRectBuffer, width * 0.5, height * 0.5));
    const buffer = buffers.get("rect")!;
    drawBuffer(buffer, color);
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
  const width = 1024;
  const height = 2;
  const pixels = new Float32Array(width*height);
  const updateTexture = () => {
      findVisibilityStrip(gamestate.player.pos, gamestate.player.light.intensity * 20.0, gamestate.scene.staticObjects, pixels.subarray(0, width));
      findVisibilityStrip(gamestate.scene.light.pos, gamestate.scene.light.params.intensity * 20.0, gamestate.scene.staticObjects, pixels.subarray(width, 2*width));

      const textureUnit = 0;
      gl.activeTexture(gl.TEXTURE0 + textureUnit)
      
      gl.bindTexture(gl.TEXTURE_2D, myTexture);
      
      const sampler = gl.getUniformLocation(programInfo.program, 'uSampler');
      gl.uniform1i(sampler, textureUnit);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RED, gl.FLOAT, pixels);
  }

  const initTexture = () => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
  
    const level = 0;
    const internalFormat = gl.R32F;
    const border = 0;
    const srcFormat = gl.RED;
    const srcType = gl.FLOAT;
    
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                  width, height, border, srcFormat, srcType,
                  pixels);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    return texture;
  };
 
  const programInfo = initProgram()!;
  const myTexture = initTexture();
  
 
  if (!programInfo) {
    throw new Error("Failed to initialize.")
  }
  
  initGl();
  


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