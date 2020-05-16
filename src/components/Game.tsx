import React from 'react';
import { game } from './game/game'
import requestAnimFrame from '../utils/utils'
import { vec2 } from 'gl-matrix'
import { ControlState, getGameState } from './game/gamestate';
import { getPrimitiveRenderer } from './rendering/primitiverenderer';
import { getCanvasHelper, CanvasHelper } from './rendering/canvashelper';

import '../styles/Game.css'

class Game extends React.Component {
  controlstate: ControlState;
  mainCanvasRef: React.RefObject<HTMLCanvasElement>;
  gpuCanvasRef: React.RefObject<HTMLCanvasElement>;
  overlayCanvasRef: React.RefObject<HTMLCanvasElement>;

  constructor(props: Readonly<{}>) {
    super(props)
    this.mainCanvasRef = React.createRef()
    this.gpuCanvasRef = React.createRef()
    this.overlayCanvasRef = React.createRef()

    this.resize = this.resize.bind(this);

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
    const rect = this.mainCanvasRef.current!.getBoundingClientRect();
    return vec2.fromValues(sx - rect.left, sy - rect.top);
  }

  OnMouseMoveCB(evt: { clientX: any; clientY: any; }, canvashelper: CanvasHelper) {    
    const x = evt.clientX;
    const y = evt.clientY;
    this.controlstate.mouse.posCanvas = this.ScreenToCanvas(x, y);
    this.controlstate.mouse.pos = canvashelper.canvas2world(this.controlstate.mouse.posCanvas)
  }

  OnKeyDownCB(evt: { keyCode: number; }) {
    this.controlstate.keyboard.buttonsPressed.add(evt.keyCode)
  }

  OnKeyUpCB(evt: { keyCode: number; }) {
    this.controlstate.keyboard.buttonsPressed.delete(evt.keyCode)
    this.controlstate.keyboard.buttonsClicked.add(evt.keyCode)
  }
//<!--</canvas>-->
  render() {
    return (
      <div className="main_container">
        <div className="canvas_container">
          <canvas ref={this.mainCanvasRef} />
          <canvas ref={this.gpuCanvasRef} />
          <canvas ref={this.overlayCanvasRef} />
        </div>
      </div>
    );
  }

  resize() {
    this.mainCanvasRef.current!.width  = window.innerWidth;
    this.mainCanvasRef.current!.height = window.innerHeight;

    this.gpuCanvasRef.current!.width  = window.innerWidth;
    this.gpuCanvasRef.current!.height = window.innerHeight;

    this.overlayCanvasRef.current!.width  = window.innerWidth;
    this.overlayCanvasRef.current!.height = window.innerHeight;
  }

  componentDidMount() {

    const gamestate = getGameState();
    const mainCanvasHelper = getCanvasHelper(this.mainCanvasRef.current!, gamestate.camera);
    const mainRenderer = getPrimitiveRenderer(mainCanvasHelper, gamestate.config);

    const overlayCanvas = this.overlayCanvasRef.current!;
    const overlayCanvasHelper =  getCanvasHelper(overlayCanvas, gamestate.camera);


    console.log("overlay canvas world to canvas", overlayCanvasHelper.world2canvas([0.0, 0.0]))

    overlayCanvas.onmousedown = (e: { button: number; }) => this.OnMouseDownCB(e);
    overlayCanvas.onmouseup = (e: any) => this.OnMouseUpCB(e);
    overlayCanvas.onmousemove = (e: any) => this.OnMouseMoveCB(e, overlayCanvasHelper);

    window.onkeydown = (e: any) => this.OnKeyDownCB(e);
    window.onkeyup = (e: any) => this.OnKeyUpCB(e);

    const overlayRenderer = getPrimitiveRenderer(overlayCanvasHelper, gamestate.config);

    window.onresize = this.resize;
    this.resize();
  
    game(mainRenderer, overlayRenderer, gamestate, this.controlstate, requestAnimFrame());
  }
}


export default Game;