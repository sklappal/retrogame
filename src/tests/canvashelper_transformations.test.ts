import { vec2, mat3 } from 'gl-matrix'
import { getCanvasHelper } from '../components/rendering/canvashelper';

fit ('transformations', () => {
  const canvas = document.createElement("canvas");

  canvas.width = 300;
  canvas.height = 200;

  const positions = [ [0.0, 0.0], [1.0, 0.0], [2.3, 2.2], [-2.3, 0.0], [-1.0, -1.0], [2.0, -3.0] ];

  for (let p1 of positions) {
    for (let p2 of positions) {
      const camera = {pos: vec2.fromValues(p1[0], p1[1]), velocity: vec2.fromValues(0.0, 0.0), fieldOfView: 100.0}

      const canvasHelper = getCanvasHelper(canvas, camera);
    
      const matrix = canvasHelper.world2canvasMatrix();
    
      const pos = vec2.fromValues(p2[0], p2[1]);

      const transformed1 = canvasHelper.world2canvas(pos);
      const transformed2 = vec2.transformMat3(vec2.create(), pos, matrix);
    
      expect(transformed1[0]).toBeCloseTo(transformed2[0]);
      expect(transformed1[1]).toBeCloseTo(transformed2[1]);
    }
  }  
})

fit ('some_matrix_transformations', () => {
  const canvas = document.createElement("canvas");

  canvas.width = 300;
  canvas.height = 200;
  const camera = {pos: vec2.fromValues(0.0, 0.0), velocity: vec2.fromValues(0.0, 0.0), fieldOfView: 100.0}

  const canvasHelper = getCanvasHelper(canvas, camera);

  const testVector = vec2.fromValues(0.0, 0.0);

  const viewMatrix = canvasHelper.world2viewMatrix();
  
  const projectionMatrix = canvasHelper.view2ndcMatrix();

  const view2canvas = canvasHelper.view2canvasMatrix();
  
  const canvasVector = vec2.transformMat3(vec2.create(), testVector, view2canvas);
  expect(canvasVector).toStrictEqual(vec2.fromValues(150.0, 100.0)); // 0 0 should be in the middle of canvas

  const viewVector = vec2.transformMat3(vec2.create(), testVector, viewMatrix);
  expect(viewVector).toStrictEqual(testVector); // 0 0 with no camera should be 0 0 

  const ndcVector = vec2.transformMat3(vec2.create(), testVector, projectionMatrix);
  expect(ndcVector[0]).toBeCloseTo(0.0); // 0 0 in NDC as well
  expect(ndcVector[1]).toBeCloseTo(0.0); // 0 0 in NDC as well

})
