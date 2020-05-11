import React from 'react';
import game from './game/game'
import requestAnimFrame from '../utils/utils'
import { vec2 } from 'gl-matrix'

class Game extends React.Component {

  constructor(props) {
    super(props)
    this.canvasRef = React.createRef()

    this.controlstate = {
      mouse: {
        pos: vec2.fromValues(0.0, 0.0),
        buttons: new Set()
      },
      keyboard: {
        buttons: new Set()
      },
      isKeyPressed: keyCode => this.controlstate.keyboard.buttons.has(keyCode)
    }
  }

  OnMouseDownCB(evt) {
    this.controlstate.mouse.buttons.add(evt.button)
  }

  OnMouseUpCB(evt) {
    this.controlstate.mouse.buttons.delete(evt.button)
  }

  ScreenToCanvas(sx, sy) {
    const rect = this.canvasRef.current.getBoundingClientRect();
    return vec2.fromValues(sx - rect.left, sy - rect.top);
  }

  OnMouseMoveCB(evt) {    
    const x = evt.clientX;
    const y = evt.clientY;
    this.controlstate.mouse.pos = this.ScreenToCanvas(x, y);
  }

  OnWheelCB() {
  //  console.log("mouse wheel") WTF??
  }

  OnKeyDownCB(evt) {
    this.controlstate.keyboard.buttons.add(evt.keyCode)
  }

  OnKeyUpCB(evt) {
    this.controlstate.keyboard.buttons.delete(evt.keyCode)
  }

  render() {
    return (<canvas id="canvas" width="1200px" height="900px" bgcolor="black" ref={this.canvasRef}> </canvas>);
  }

  componentDidMount() {
    const canvas =  this.canvasRef.current;
    canvas.onmousedown = e => this.OnMouseDownCB(e);
    canvas.onmouseup = e => this.OnMouseUpCB(e);
    canvas.onmousemove = e => this.OnMouseMoveCB(e);
    if (window.addEventListener)
      /** DOMMouseScroll is for mozilla. */
      window.addEventListener('DOMMouseScroll', e => this.OnWheelCB(e), false);
    /** IE/Opera. */
    window.onmousewheel = document.onmousewheel = e => this.OnWheelCB(e);
    window.onkeydown = e => this.OnKeyDownCB(e);
    window.onkeyup = e => this.OnKeyUpCB(e);
    // window.addEventListener("touchstart", OnTouchStartCB, false);
    // window.addEventListener("touchmove", OnTouchMoveCB, false);
    // window.addEventListener("touchend", OnTouchEndCB, false);

    // window.onresize = Resize;
    
    game(canvas, this.controlstate, requestAnimFrame());
  }
}


export default Game;