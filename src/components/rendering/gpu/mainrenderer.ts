import * as twgl from 'twgl.js'
import { vec2, vec3 } from 'gl-matrix';
import { GameState } from '../../game/gamestate';
import { CanvasHelper } from '../canvashelper';
import { BufferHandler } from './bufferhandler';
import { MAX_NUM_LIGHTS, VISIBILITY_TEXTURE_WIDTH } from './constants';

export const getMainRenderer = (canvasHelper: CanvasHelper, bufferHandler: BufferHandler, occluderTexture: WebGLTexture, visibilityTexture: WebGLTexture) => {
  const gl = canvasHelper.getWebGLContext();

  const programInfo = twgl.createProgramInfo(gl, [mainVertexShaderSource, mainFragmentShaderSource], (msg, line) => {
    console.log(msg);
    throw new Error("Failed to compile GL program.")
  });

  const frameBuffer = gl.createFramebuffer();
  if (frameBuffer == null) {
    throw new Error("Could not initialize framebuffer.");
  }

  const mainTexture = gl.createTexture();
  if (mainTexture === null) {
    throw new Error("Could not initialize main texture.");
  }

  const renderMain = (gamestate: GameState) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.useProgram(programInfo.program);

    gl.viewport(0, 0, canvasHelper.width(), canvasHelper.height());

    updateMainTexture();

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);

    // attach the texture as the first color attachment
    const attachmentPoint = gl.COLOR_ATTACHMENT0;
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, mainTexture, /*level*/ 0);
    
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    setMainRenderUniforms(gamestate);

    const bufferInfo = bufferHandler.getRectBuffer();
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.drawBufferInfo(gl, bufferInfo);
  }

  let textureWidth = -1;
  let textureHeight = -1;
  const updateMainTexture = () => {
    if (textureWidth !== canvasHelper.width() || textureHeight !== canvasHelper.height()) {
      gl.bindTexture(gl.TEXTURE_2D, mainTexture);

      const level = 0;
      const internalFormat = gl.RGBA;
      const border = 0;
      const srcFormat = gl.RGBA;
      const srcType = gl.UNSIGNED_BYTE;

      gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
        canvasHelper.width(), canvasHelper.height(), border, srcFormat, srcType, null);

      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      textureWidth = canvasHelper.width();
      textureHeight = canvasHelper.height();
    }
  }

  const setMainRenderUniforms = (gamestate: GameState) => {
    const uniforms = {
      uPlayerPositionWorld: gamestate.player.pos,
      uViewMatrix: canvasHelper.world2viewMatrix(),
      uProjectionMatrix: canvasHelper.view2ndcMatrix(),
      uActualNumberOfLights: gamestate.scene.lights.length + 1, // player light
      uVisibilitySampler: visibilityTexture,
      uBackgroundSampler: occluderTexture,
      uResolution: vec2.fromValues(canvasHelper.width(), canvasHelper.height()),
      uPixelSize: canvasHelper.pixelSize(),
      uGametime: gamestate.gametime,
    }

    twgl.setUniforms(programInfo, uniforms);

    setLightUniforms(gamestate.player.pos, gamestate.player.light.color, gamestate.player.light.intensity, 0);
    for (let i = 0; i < gamestate.scene.lights.length; i++) {
      setLightUniforms(gamestate.scene.lights[i].pos, gamestate.scene.lights[i].params.color, gamestate.scene.lights[i].params.intensity, i + 1);
    }
  }

  const setLightUniforms = (pos: vec2, color: vec3, intensity: number, index: number) => {
    let location = gl.getUniformLocation(programInfo.program, "uLightPositionsWorld[" + index + "]")
    gl.uniform2f(location, pos[0], pos[1]);

    location = gl.getUniformLocation(programInfo.program, "uLightColors[" + index + "]")
    gl.uniform3f(location, color[0], color[1], color[2]);

    location = gl.getUniformLocation(programInfo.program, "uLightIntensities[" + index + "]")
    gl.uniform1f(location, intensity);
  }
  
  return {
    renderMain: renderMain,
    getTexture: () => mainTexture
  }
} 

const mainFragmentShaderSource = `#version 300 es
  /////////////////////
  // Fragment Shader //
  /////////////////////
  precision highp float;

  #define M_PI 3.1415926535897932384626433832795
  #define MAX_NUM_LIGHTS ${MAX_NUM_LIGHTS}
  #define VISIBILITY_TEXTURE_WIDTH ${VISIBILITY_TEXTURE_WIDTH}

  in vec2 posWorld;
  in vec2 posVertex;
  
  uniform vec2 uLightPositionsWorld[MAX_NUM_LIGHTS];
  uniform vec3 uLightColors[MAX_NUM_LIGHTS];
  uniform float uLightIntensities[MAX_NUM_LIGHTS];
  uniform int uActualNumberOfLights;
  uniform float uGametime;

  uniform vec4 uColor;
  
  uniform sampler2D uVisibilitySampler;
  uniform sampler2D uBackgroundSampler;
  uniform vec2 uResolution;
  uniform float uPixelSize;

  out vec4 fragmentColor;

  mat3 gaussianKernel = mat3(1., 2., 1., 2., 4., 2., 1., 2., 1.) * (1./16.);


  // 2D Random
  float random (in vec2 st) {
      return fract(sin(dot(st.xy,
                           vec2(12.9898,78.233)))
                   * 43758.5453123);
  }
  
  vec2 random2(vec2 st){
    st = vec2( dot(st,vec2(127.1,311.7)),
              dot(st,vec2(269.5,183.3)) );
    return -1.0 + 2.0*fract(sin(st)*43758.5453123);
  }

  float impulse(float period, float offset) 
  {
      float f = 1.0/period;
      float t = f * (uGametime + offset);
      float x = (t-floor(t));
      float w = 0.05*f;
      return smoothstep(0.5-w, 0.5, x) - smoothstep(0.5, 0.5+w, x);
  }


  // 2D Noise based on Morgan McGuire @morgan3d
  // https://www.shadertoy.com/view/4dS3Wd
  float noise (in vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);
  
      // Four corners in 2D of a tile
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
  
      // Smooth Interpolation
  
      // Cubic Hermine Curve.  Same as SmoothStep()
      vec2 u = f*f*(3.0-2.0*f);
      // u = smoothstep(0.,1.,f);
  
      // Mix 4 coorners percentages
      return mix(a, b, u.x) +
              (c - a)* u.y * (1.0 - u.x) +
              (d - b) * u.x * u.y;
  }

  // Gradient Noise by Inigo Quilez - iq/2013
  // https://www.shadertoy.com/view/XdXGW8
  float gradientNoise(vec2 st) {
      vec2 i = floor(st);
      vec2 f = fract(st);

      vec2 u = f*f*(3.0-2.0*f);

      return mix( mix( dot( random2(i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ),
                      dot( random2(i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                  mix( dot( random2(i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ),
                      dot( random2(i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
  }


  vec3 invert(vec3 v) {
    return vec3(1.0, 1.0, 1.0) - v;
  }

  vec3 screen(vec3 first, vec3 second) {
    return vec3(1.0, 1.0, 1.0)  - invert(first)*invert(second);
  }

  vec3 toneMap(vec3 hdrColor) {
    const float gamma = 2.2;
  
    const float exposure = 5.0;
    
    // Exposure tone mapping
    vec3 mapped = vec3(1.0) - exp(-hdrColor * exposure);

    // Gamma correction 
    return pow(mapped, vec3(1.0 / gamma));
  }

  vec3 getLightContribution(int index, vec2 currentPosition) {
    float d = distance(currentPosition,  uLightPositionsWorld[index]);
    float mult = 1.0-impulse(1.0, 0.0);
    vec3 lightColor = uLightColors[index] * uLightIntensities[index] * mult;
    return min(lightColor, lightColor / (d*d)); 
  }

  float sampleTextureAtAngle(float angle, int textureIndex) {
    float sampling_angle = (angle + M_PI) / (2.0 * M_PI);

    float floatIndex = (float(textureIndex) + 0.5) * (1.0 / float(MAX_NUM_LIGHTS));

    return texture(uVisibilitySampler, vec2(sampling_angle, floatIndex)).r;
  }

  float getShadowMultiplier(int lightIndex, int textureIndex, vec2 currentPos) {
    vec2 lightRay = currentPos - uLightPositionsWorld[lightIndex];
    float lightDistance = length(lightRay);
    float angle = atan(lightRay.y, lightRay.x);
    float delta = (M_PI / float(VISIBILITY_TEXTURE_WIDTH)) * 0.5;

    // float sum = 0.0;
    // for (int i = 0; i < 9; i++) {
    //   sum += sampleTextureAtAngle(angle+(float(i)-4.0)*delta, textureIndex) > lightDistance ? 1.0 : 0.0;
    // }
    
    // return (sum / 9.0);

    return sampleTextureAtAngle(angle, textureIndex) > lightDistance ? 1.0 : 0.0;
  }

  float getShadowMultiplierBlurred(int lightIndex, int textureIndex, vec2 currentPos) {
    float d = distance(currentPos,  uLightPositionsWorld[lightIndex]);
    float delta =  d * 0.05 * uPixelSize/128.0;
    float total = 0.0;
    for (int u = 0; u < 3; u+=1) {
      for (int v = 0; v < 3; v+=1) {
        float shadow = getShadowMultiplier(lightIndex, textureIndex, currentPos + vec2(float(u)-1., float(v)-1.) * delta);
        total += shadow * gaussianKernel[u][v];
      }
    }
    return total;
  }

  vec3 getLighting(int index) {
    vec3 light = getLightContribution(index, posWorld);
    float shadow = getShadowMultiplierBlurred(index, index+1, posWorld);
    return light*shadow;
  }

  bool pixelOnBorder() {
    float delta = uPixelSize/8.0;
    vec3 bg = texture(uBackgroundSampler, gl_FragCoord.xy / uResolution).rgb;
    for (float u = -1.; u < 2.; u+=1.) {
      for (float v = -1.; v < 2.; v+=1.) {
        vec3 col = texture(uBackgroundSampler, (gl_FragCoord.xy + vec2(u*delta, v*delta)) / uResolution).rgb;
        if (col != bg && bg == vec3(1.)) {
          return true;
        }
      }
    }
    return false;
  }

  float lightColorBorderMultiplier() {
    return pixelOnBorder() ? 20.0 : 1.0;
  }

  void main(void) {
    vec3 bg = texture(uBackgroundSampler, gl_FragCoord.xy / uResolution).rgb;
    if (bg == vec3(0.0)) {
      fragmentColor = vec4(bg, 1.0);
      return;
    }

    float playerVisibilityMultiplier = 1.0;
    playerVisibilityMultiplier = getShadowMultiplierBlurred(0, 0, posWorld);
        
    vec3 light = vec3(0.0);
    for (int i = 0; i < uActualNumberOfLights; i++) {
      light += getLighting(i);
    }

    float dist = distance(posWorld, uLightPositionsWorld[0]);
    vec3 ambientLight = vec3(0.01, 0.01, 0.01) * 2.0/(dist*dist);
    
    vec3 lightColor = (light + ambientLight) * playerVisibilityMultiplier;
    vec3 material = vec3(1.0, 1.0, 1.0);

    
    if (pixelOnBorder()) {
      lightColor *= 20.0;
    }
    else if (bg == vec3(1.0, 1.0, 1.0)) {
      float noiseFactor = 0.1;
      material = 10.0*(noiseFactor + (1.0-noiseFactor)*vec3(pow(gradientNoise(posWorld*0.1), 2.0)));
    }
    else {
      material = vec3(0., 0., 0.);
    }

    vec3 col = toneMap(material * lightColor);

    // col = bg;
    fragmentColor = vec4(col, 1.0);
    //fragmentColor = vec4(1.0);
    
  }

  /////////////////////`;

const mainVertexShaderSource =`#version 300 es
///////////////////
// Vertex Shader //
///////////////////

uniform mat3 uViewMatrix; // world coordinates to view
uniform mat3 uProjectionMatrix; // view coordinates to NDC

in vec3 position;
out vec2 posWorld;
out vec2 posVertex;

void main(void) {
  gl_Position = vec4(position, 1.0);
  posVertex = position.xy;
  posWorld =  (inverse(uProjectionMatrix * uViewMatrix) * position).xy;
  
}

///////////////////`;