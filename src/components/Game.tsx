import React from 'react';
import game from './game/game'
import requestAnimFrame from '../utils/utils'
import { vec2 } from 'gl-matrix'
import { ControlState } from './game/gamestate';



class Game extends React.Component {
  controlstate: ControlState;
  canvasRef: React.RefObject<HTMLCanvasElement>;

  constructor(props: Readonly<{}>) {
    super(props)
    this.canvasRef = React.createRef()

    const mouseButtonsPressed = new Set<number>();
    const mouseButtonsClicked = new Set<number>();

    const keyboardButtonsPressed = new Set<number>();
    const keyboardButtonsClicked = new Set<number>();

    this.controlstate = {
      mouse: {
        pos: vec2.fromValues(0.0, 0.0),
        posCanvas: vec2.fromValues(0.0, 0.0),
        buttonsPressed: mouseButtonsPressed,
        buttonsClicked: mouseButtonsClicked
      },
      keyboard: {
        buttonsPressed: keyboardButtonsPressed,
        buttonsClicked: keyboardButtonsClicked
      },
      isKeyPressed: keyCode => this.controlstate.keyboard.buttonsPressed.has(keyCode),
      clearClickedButtons: () => {
        mouseButtonsClicked.clear()
        keyboardButtonsClicked.clear()
      }
    }
  }

  OnMouseDownCB(evt: { button: number; }) {
    this.controlstate.mouse.buttonsPressed.add(evt.button)
  }

  OnMouseUpCB(evt: { button: number; }) {
    this.controlstate.mouse.buttonsPressed.delete(evt.button)
    this.controlstate.mouse.buttonsClicked.add(evt.button)
  }

  ScreenToCanvas(sx: number, sy: number) {
    const rect = this.canvasRef.current!.getBoundingClientRect();
    return vec2.fromValues(sx - rect.left, sy - rect.top);
  }

  OnMouseMoveCB(evt: { clientX: any; clientY: any; }) {    
    const x = evt.clientX;
    const y = evt.clientY;
    this.controlstate.mouse.posCanvas = this.ScreenToCanvas(x, y);
  }

  OnKeyDownCB(evt: { keyCode: number; }) {
    this.controlstate.keyboard.buttonsPressed.add(evt.keyCode)
  }

  OnKeyUpCB(evt: { keyCode: number; }) {
    this.controlstate.keyboard.buttonsPressed.delete(evt.keyCode)
    this.controlstate.keyboard.buttonsClicked.add(evt.keyCode)
  }

  render() {
    return (<canvas id="canvas" width="1200px" height="900px" ref={this.canvasRef}> </canvas>);
  }

  componentDidMount() {
    const canvas =  this.canvasRef.current!;
    canvas.onmousedown = (e: { button: number; }) => this.OnMouseDownCB(e);
    canvas.onmouseup = (e: any) => this.OnMouseUpCB(e);
    canvas.onmousemove = (e: any) => this.OnMouseMoveCB(e);

    window.onkeydown = (e: any) => this.OnKeyDownCB(e);
    window.onkeyup = (e: any) => this.OnKeyUpCB(e);
  
    
    game(canvas, this.controlstate, requestAnimFrame());
  }
}


export default Game;