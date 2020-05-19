export const vertexShaderSource = `#version 300 es
  ///////////////////
  // Vertex Shader //
  ///////////////////
  
  uniform float aspect;

  uniform mat3 viewMatrix; // world coordinates to view
  uniform mat3 projectionMatrix; // view coordinates to NDC
  
  in vec3 positionNdc; // [-1, 1] x [-1, 1]
  in vec2 coord; // texture coordinates: [0, 1.0]
  
  out vec2 texCoord;
  out vec2 posProjected; // [-aspect, aspect] x [-1, 1]
  out vec2 posWorld;

  void main(void) {
    gl_Position = vec4(positionNdc, 1.0);
    texCoord = coord;
    mat3 view2projected = projectionMatrix * viewMatrix;
    posWorld = ( inverse(view2projected) * vec3(positionNdc.xy, 1.0) ).xy;
  }

  ///////////////////`;

  export const fragmentShaderSource = `#version 300 es
  /////////////////////
  // Fragment Shader //
  /////////////////////
  precision mediump float;

  uniform sampler2D mainTexture;
  uniform sampler2D visibilityTexture;
  
  in vec2 texCoord;
  in vec2 posWorld;
  
  uniform vec2 playerPositionWorld;
  uniform vec2 lightPositionWorld;

  out vec4 fragmentColor;

  vec3 getLightContribution(vec2 lightPos, vec2 currentPosition, vec3 lightColor, float lightRadius) {
    float d = distance(currentPosition, lightPos) / lightRadius;
    return clamp(lightColor * (1.0 - d*d), 0.0, 1.0);
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


  void main(void) {
    vec4 visibility = texture(visibilityTexture, texCoord);
    vec4 worldColor = texture(mainTexture, texCoord);

   // if (visibility.x == 1.0) {

      vec3 playerLight = getLightContribution(playerPositionWorld, posWorld, vec3(0.6, .0, 0.0), 50.0);
      
      vec3 lightLight = getLightContribution(lightPositionWorld, posWorld, vec3(.0, .2, 0.0), 20.0);

      vec3 ambientLight = vec3(0.0, 0.0, 0.1);
      
      fragmentColor = worldColor * vec4(toneMap(playerLight + lightLight + ambientLight) , 1.0);

      //fragmentColor = worldColor * ambientLight;
    // } else {
    //   fragmentColor = vec4(0.0, 0.0, 0.0, 1.0);
    // }

    //
  }

  /////////////////////`;