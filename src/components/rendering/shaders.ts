export const vertexShaderSource = `#version 300 es
  ///////////////////
  // Vertex Shader //
  ///////////////////
  
  uniform mat3 uModelMatrix; // model coordinates to world coordinates
  uniform mat3 uViewMatrix; // world coordinates to view
  uniform mat3 uProjectionMatrix; // view coordinates to NDC
  
  in vec3 positionModel;
  in vec2 coord; // texture coordinates: [0, 1.0]
  
  out vec2 texCoord;
  out vec2 posWorld;

  void main(void) {
    vec3 positionWorld = uModelMatrix * vec3(positionModel.xy, 1.0);
    posWorld = positionWorld.xy;
    gl_Position = vec4((uProjectionMatrix * uViewMatrix) * positionWorld, 1.0);
    texCoord = coord;
  }

  ///////////////////`;

  export const fragmentShaderSource = `#version 300 es
  /////////////////////
  // Fragment Shader //
  /////////////////////
  precision mediump float;

  #define M_PI 3.1415926535897932384626433832795

  in vec2 texCoord;
  in vec2 posWorld;
  
  uniform vec2 uPlayerPositionWorld;
  uniform float uPlayerLightRadius;
  uniform vec2 uLightPositionWorld;
  uniform float uLightRadius;
  uniform vec4 uColor;
  
  uniform sampler2D uSampler;

  out vec4 fragmentColor;

  vec3 getLightContribution(vec2 lightPos, vec2 currentPosition, vec3 lightColor, float lightRadius) {
    float d = distance(currentPosition, lightPos) / lightRadius;
    return clamp(lightColor * (1.0-pow(d, 1.0)), 0.0, 1.0); // TODO Remove this clamp to support HDR
  }

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

  float sampleTextureAtAngle(float angle, sampler2D sampler, float index) {
    float samplingLocation = (angle + M_PI) / (2.0 * M_PI);
    return texture(sampler, vec2(samplingLocation, 0.75 - index * 0.5)).r;
  }

  float getShadowMultiplierForLightRay(vec2 lightRay, vec2 currentPos, sampler2D sampler, float index) {
    float lightDistance = length(lightRay);
    float angle = atan(lightRay.y, lightRay.x);
    float delta = (M_PI / 1024.0) * 0.5;

    float sum = 0.0;
    for (int i = 0; i < 9; i++) {
      sum += sampleTextureAtAngle(angle+(float(i)-4.0)*delta, sampler, index) > lightDistance ? 1.0 : 0.0;
    }

    return sum / 9.0;
  }

  float getShadowMultiplier(vec2 lightPos, vec2 currentPos, sampler2D sampler, float index) {
    vec2 dir = currentPos-lightPos;
    vec2 normal = normalize(vec2(-dir.y, dir.x));
    return getShadowMultiplierForLightRay(dir, currentPos, sampler, index);

    // even more sampling
    // float sum = 0.0;
    // for (int i = 0; i < 5; i++) {
    //   vec2 dir2 =  (currentPos) - (lightPos + normal * float(i-2) * 0.1);
    //   sum += getShadowMultiplierForLightRay(dir2, currentPos, sampler, index);
    // }
    // return sum/5.0;
  }


  void main(void) {
    vec4 worldColor = uColor;

    vec3 playerLight = getLightContribution(uPlayerPositionWorld, posWorld, vec3(.1, .1, .1), uPlayerLightRadius);
    float playerLightMultiplier = getShadowMultiplier(uPlayerPositionWorld, posWorld, uSampler, 0.0);
        
    vec3 lightLight = getLightContribution(uLightPositionWorld, posWorld, vec3(.0, .5, 0.0), uLightRadius);
    float lightMultiplier = getShadowMultiplier(uLightPositionWorld, posWorld, uSampler, 1.0) * playerLightMultiplier;

    vec3 ambientLight = vec3(0.01, 0.01, 0.01);
    
    fragmentColor = worldColor * vec4(toneMap(playerLight * playerLightMultiplier + lightLight * lightMultiplier + ambientLight) , 1.0);
  }

  /////////////////////`;