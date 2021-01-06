export const vertexShaderSource = `#version 300 es
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
    vec3 positionWorld = uModelMatrix * vec3(position.xy, 1.0);
    posWorld = positionWorld.xy;
    posVertex = position.xy;
    gl_Position = vec4((uProjectionMatrix * uViewMatrix) * positionWorld, 1.0);

  }

  ///////////////////`;

  export const firstPassFragmentShaderSource  = `#version 300 es
  /////////////////////
  // Fragment Shader //
  /////////////////////
  precision highp float;

  out vec4 fragmentColor;

  void main(void) {
    fragmentColor = vec4(0.0, 0.0, 0.0, 1.0);
  }

  /////////////////////`;

  export const visibilityFragmentShaderSource = `#version 300 es
  /////////////////////
  // Fragment Shader //
  /////////////////////
  precision highp float;

  #define M_PI 3.1415926535897932384626433832795

  in vec2 posWorld;
  in vec2 posVertex;
  
  unfirom vec2 uBackgroundResolution;
  uniform vec2 uVisibilityActorPosWorld; // player or light
  uniform mat3 uModelMatrix;

  uniform sampler2D uBackgroundSampler;

  out float fragmentDepth;

  void main(void) {
    vec3 backgroundColor = texture(uBackgroundSampler, posVertex * 0.5 + 0.5).rgb;
    float angle = atan()
  }

  /////////////////////`;

  export const VISIBILITY_TEXTURE_WIDTH = 1024.0
  export const MAX_NUM_LIGHTS = 50

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
  uniform mat3 uModelMatrix;

  uniform vec2 uLightPositionsWorld[MAX_NUM_LIGHTS];
  uniform vec3 uLightColors[MAX_NUM_LIGHTS];
  uniform float uLightIntensities[MAX_NUM_LIGHTS];
  uniform int uActualNumberOfLights;

  uniform vec4 uColor;
  
  uniform sampler2D uVisibilitySampler;
  uniform sampler2D uBackgroundSampler;

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

  void main(void) {
    vec3 backgroundColor = texture(uBackgroundSampler, posVertex * 0.5 + 0.5).rgb;
    float playerLightMultiplier = getShadowMultiplier(0, 0, posWorld, uVisibilitySampler);
        
    vec3 light = vec3(0.0);
    for (int i = 0; i < uActualNumberOfLights; i++) {
      light += getLighting(i, posWorld, uVisibilitySampler) * playerLightMultiplier;
    }

    float dist = distance(posWorld, uLightPositionsWorld[0]);
    vec3 ambientLight = vec3(0.01, 0.01, 0.01) * 2.0/(dist*dist) * playerLightMultiplier;
    
    vec3 lightColor = light + ambientLight;
    vec3 material = uColor.rgb;

    if (backgroundColor != vec3(0.0, 0.0, 0.0)) {
      float noiseFactor = 0.1;
      material = 10.0*(noiseFactor + (1.0-noiseFactor)*vec3(pow(gradientNoise(posWorld*0.1), 2.0)));
    }
    else {
      material = backgroundColor;
    }

    vec3 col = toneMap(material * lightColor);

    fragmentColor = vec4(col, 1.0);
  }

  /////////////////////`;