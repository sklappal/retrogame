export const VISIBILITY_TEXTURE_WIDTH = 1024.0
export const MAX_NUM_LIGHTS = 50


export const occluderVertexShaderSource = `#version 300 es
  ///////////////////
  // Vertex Shader //
  ///////////////////
  
  uniform mat3 uModelMatrix; // model coordinates to world coordinates
  uniform mat3 uViewMatrix; // world coordinates to view
  uniform mat3 uProjectionMatrix; // view coordinates to NDC
  
  in vec3 position;
  out vec2 posWorld;
  out vec2 posVertex;

  void main(void) {
    vec3 positionWorld = uModelMatrix * position;
    posWorld = positionWorld.xy;
    posVertex = position.xy;
    gl_Position = vec4((uProjectionMatrix * uViewMatrix) * positionWorld, 1.0);
  }

  ///////////////////`;


export const mainVertexShaderSource =`#version 300 es
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

export const occluderFragmentShaderSource = `#version 300 es
  /////////////////////
  // Fragment Shader //
  /////////////////////
  precision highp float;

  out vec4 fragmentColor;

  void main(void) {
    fragmentColor = vec4(0.0, 0.0, 0.0, 1.0);
  }

  /////////////////////`;

export const visibilityVertexShaderSource = `#version 300 es
  ///////////////////
  // Vertex Shader //
  ///////////////////
  
  in vec3 position;
  
  void main(void) {
    gl_Position = vec4(position, 1.0);
  }

  ///////////////////`;

export const visibilityFragmentShaderSource = `#version 300 es
  /////////////////////
  // Fragment Shader //
  /////////////////////
  precision highp float;

  #define M_PI 3.1415926535897932384626433832795
  #define MAX_SAMPLING_DISTANCE 1000.0;
  #define SAMPLING_STEP 0.1;
  #define VISIBILITY_TEXTURE_WIDTH ${VISIBILITY_TEXTURE_WIDTH}

  uniform sampler2D uBackgroundSampler;
  uniform mat3 uViewMatrix; // world coordinates to view
  uniform mat3 uProjectionMatrix; // view coordinates to NDC
  uniform vec2 uActorPosWorld;

  out float fragmentDepth;

  void main(void) {    
    float angle = (gl_FragCoord.x / float(VISIBILITY_TEXTURE_WIDTH)) * 2.0 * M_PI - M_PI;

    
    vec2 dir = vec2(cos(angle), sin(angle));
    float r_out = 1000.0;
    for (float r = 0.2; r < 1000.0; r += 0.1) {
      vec2 pos = uActorPosWorld + r * dir;
      vec3 ndcPos = (uProjectionMatrix * uViewMatrix) * vec3(pos, 1.0);
      vec2 sampling = (ndcPos.xy + vec2(1.0)) * 0.5;      
      vec3 backgroundColor = texture(uBackgroundSampler, sampling).rgb;
      if (backgroundColor != vec3(1.0, 1.0, 1.0))
      {
        r_out = r;
        break;
      }
    }

    fragmentDepth = r_out;
  }

  /////////////////////`;

export const mainFragmentShaderSource = `#version 300 es
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

  uniform vec4 uColor;
  
  uniform sampler2D uVisibilitySampler;
  uniform sampler2D uBackgroundSampler;
  uniform vec2 uResolution;
  uniform float uPixelSize;

  out vec4 fragmentColor;


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
    vec3 lightColor = uLightColors[index] * uLightIntensities[index];
    return min(lightColor, lightColor / (d*d)); 
  }

  float sampleTextureAtAngle(float angle, sampler2D sampler, int textureIndex) {
    float sampling_angle = (angle + M_PI) / (2.0 * M_PI);

    float floatIndex = (float(textureIndex) + 0.5) * (1.0 / float(MAX_NUM_LIGHTS));

    return texture(sampler, vec2(sampling_angle, floatIndex)).r;
  }

  float getShadowMultiplier(int lightIndex, int textureIndex, vec2 currentPos, sampler2D sampler) {
    vec2 lightRay = currentPos - uLightPositionsWorld[lightIndex];
    float lightDistance = length(lightRay);
    float angle = atan(lightRay.y, lightRay.x);
    float delta = (M_PI / float(VISIBILITY_TEXTURE_WIDTH)) * 0.5;

    float sum = 0.0;
    for (int i = 0; i < 9; i++) {
      sum += sampleTextureAtAngle(angle+(float(i)-4.0)*delta, sampler, textureIndex) > lightDistance ? 1.0 : 0.0;
    }
    
    return (sum / 9.0);
  }

  vec3 getLighting(int index, vec2 currentPos, sampler2D sampler) {
    vec3 light = getLightContribution(index, posWorld);
    float shadow = getShadowMultiplier(index, index+1, posWorld, sampler);
    return light*shadow;
  }

  float lightColorBorderMultiplier() {
    float delta = uPixelSize/8.0;
    vec3 bg = texture(uBackgroundSampler, gl_FragCoord.xy / uResolution).rgb;
    for (float u = -1.; u < 2.; u+=1.) {
      for (float v = -1.; v < 2.; v+=1.) {
        vec3 col = texture(uBackgroundSampler, (gl_FragCoord.xy + vec2(u*delta, v*delta)) / uResolution).rgb;
        if (col != bg) {
          return 20.0;
        }
      }
    }
    return 1.0;

  }

  void main(void) {
    float playerLightMultiplier = getShadowMultiplier(0, 0, posWorld, uVisibilitySampler);
        
    vec3 light = vec3(0.0);
    for (int i = 0; i < uActualNumberOfLights; i++) {
      light += getLighting(i, posWorld, uVisibilitySampler) * playerLightMultiplier;
    }

    float dist = distance(posWorld, uLightPositionsWorld[0]);
    vec3 ambientLight = vec3(0.01, 0.01, 0.01) * 2.0/(dist*dist) * playerLightMultiplier;
    
    vec3 lightColor = light + ambientLight;
    vec3 material = uColor.rgb;

    vec3 bg = texture(uBackgroundSampler, gl_FragCoord.xy / uResolution).rgb;
    if (bg == vec3(1.0, 1.0, 1.0)) {
      float noiseFactor = 0.1;
      material = 10.0*(noiseFactor + (1.0-noiseFactor)*vec3(pow(gradientNoise(posWorld*0.1), 2.0)));
      lightColor *= lightColorBorderMultiplier();
    }
    else {
      material = bg;
    }

    vec3 col = toneMap(material * lightColor);

    // col = bg;
    fragmentColor = vec4(col, 1.0);
    
  }

  /////////////////////`;