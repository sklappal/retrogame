* Move visibility calculation to GPU
** Render-to-texture for every light-source, use caching
** Have different shader + program for this to work
** Need 2 shaders: one for drawing the scene without any fuss and one for the visibility calculation

Logic:


for each light source:
  if (needs update):
    gl.useProgram(temporary scene drawing)
    gl.bindFrameBuffer(temporary scene texture)    
    draw occluders with this light source in the center

    gl.useProgram(visiblity calc)
    gl.bindFrameBuffer(visibility texture)


  Question: How to draw pieces of texture? Maybe just draw to temporary texture and then gl.readPixels and then gl.texSubImage like we do now? I guess that's fast enough?








