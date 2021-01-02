* Move visibility calculation to GPU
** Render-to-texture for every light-source, use caching
** Have different shader + program for this to work
** Need 2 shaders: one for drawing the scene without any fuss and one for the visibility calculation


"Framebuffer object (FBO) provides an efficient switching mechanism; detach the previous framebuffer-attachable image from a FBO, and attach a new framebuffer-attachable image to the FBO. Switching framebuffer-attachable images is much faster than switching between FBOs. FBO provides glFramebufferTexture2D() to switch 2D texture objects, and glFramebufferRenderbuffer() to switch renderbuffer objects. "

http://www.songho.ca/opengl/gl_fbo.html

Logic:


for each light source:
  if (needs update):
    gl.useProgram(temporary scene drawing)
    gl.viewport(0,0,1024, 1024)

    gl.bindFrameBuffer(temporary scene texture)    
    draw occluders with this light source in the center


    gl.useProgram(visiblity calc)
    gl.viewport(0,0,1024, 1)
    gl.bindFrameBuffer(visibility texture)


  Question: How to draw pieces of texture? Maybe just draw to temporary texture and then gl.readPixels and then gl.texSubImage like we do now? I guess that's fast enough?

  also there is glCopyPixels and glCopyTexImage2D 




! Add noise everywhere



