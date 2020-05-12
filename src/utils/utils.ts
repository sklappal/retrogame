const requestAnimFrame = () => {
  return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         function(/* function FrameRequestCallback */ callback: TimerHandler, /* DOMElement Element */ element: any) {
           window.setTimeout(callback, 1000/60);
         };
};

export default requestAnimFrame;