export const vertexShaderSource = `#version 300 es
  ///////////////////
  // Vertex Shader //
  ///////////////////
  
  uniform mat3 uModelMatrix; // model coordinates to world coordinates
  uniform mat3 uViewMatrix; // world coordinates to view
  uniform mat3 uProjectionMatrix; // view coordinates to NDC
  
  in vec3 position;
  out vec2 posWorld;

  void main(void) {
    vec3 positionWorld = uModelMatrix * vec3(position.xy, 1.0);
    posWorld = positionWorld.xy;
    gl_Position = vec4((uProjectionMatrix * uViewMatrix) * positionWorld, 1.0);
  }

  ///////////////////`;

  export const fragmentShaderSource = `#version 300 es
  /////////////////////
  // Fragment Shader //
  /////////////////////
  precision highp float;

  #define M_PI 3.1415926535897932384626433832795
  #define NUM_LIGHTS 3

  in vec2 posWorld;
  
  uniform vec2 uLightPositionsWorld[NUM_LIGHTS];
  uniform vec3 uLightColors[NUM_LIGHTS];
  uniform float uLightIntensities[NUM_LIGHTS];
  
  uniform vec4 uColor;
  
  uniform sampler2D uSampler;

  out vec4 fragmentColor;


  vec3 invert(vec3 v) {
    return vec3(1.0, 1.0, 1.0) - v;
  }

  vec3 screen(vec3 first, vec3 second) {
    return vec3(1.0, 1.0, 1.0)  - invert(first)*invert(second);
  }

  vec3 toneMap(vec3 hdrColor) {
    const float gamma = 2.2;
  
    const float exposure = 1.0;
    
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
    float samplingLocation = float(round(  ((angle + M_PI) / (2.0 * M_PI)) * 1024.0) / 1024.0);

    float floatIndex = (float(textureIndex) + 0.5) * (1.0 / float(NUM_LIGHTS + 1));

    return texture(sampler, vec2(samplingLocation, floatIndex)).r;
  }

  float getShadowMultiplier(int lightIndex, int textureIndex, vec2 currentPos, sampler2D sampler) {
    vec2 lightRay = currentPos - uLightPositionsWorld[lightIndex];
    float lightDistance = length(lightRay);
    float angle = atan(lightRay.y, lightRay.x);
    float delta = (M_PI / 1024.0) * 0.5;

    float sum = 0.0;
    for (int i = 0; i < 9; i++) {
      sum += sampleTextureAtAngle(angle+(float(i)-4.0)*delta, sampler, textureIndex) > lightDistance ? 1.0 : 0.0;
    }

    return sum / 9.0;
  }

  vec3 getLighting(int index, vec2 currentPos, sampler2D sampler) {
    vec3 light = getLightContribution(index, posWorld);
    float shadow = getShadowMultiplier(index, index+1, posWorld, uSampler);
    return light*shadow;
  }

  void main(void) {
    vec4 worldColor = uColor;

    float playerLightMultiplier = getShadowMultiplier(0, 0, posWorld, uSampler);
        
    vec3 light = vec3(0.0);
    for (int i = 0; i < NUM_LIGHTS; i++) {
      light += getLighting(i, posWorld, uSampler) * playerLightMultiplier;
    }

    vec3 ambientLight = vec3(0.0, 0.0, 0.0);
    
    fragmentColor = worldColor * vec4(toneMap(light  + ambientLight) , 1.0);
  }

  /////////////////////`;