import { isPointBehindLine, isSegmentOccluded, rayLineIntersection, toCartesian } from '../components/rendering/visibility'
import { vec2 } from 'gl-matrix'

it ('rayLineIntersection', () => {
  expect(rayLineIntersection([1.0, 0.0], [5.0, -10.0], [5.0, 10.0])).toStrictEqual({intersect: true, distance: 5.0})
})


const toSegment = (n: number[][]) => {
  const from = vec2.fromValues(n[0][0], n[0][1]);
  const to = vec2.fromValues(n[1][0], n[1][1]);
  return {
    id: 0, from: from, fromCartesian: toCartesian(from), to: to, toCartesian: toCartesian(to)
  }
}
it('isSegmentOccluded_1', () => {

  const thisSegment = toSegment([[10.0, -Math.PI / 4.0], [10.0, Math.PI / 4.0]])

  let otherSegment = toSegment([[20.0, -Math.PI / 4.0], [20.0, Math.PI / 4.0]])
  expect(isSegmentOccluded(thisSegment, otherSegment)).toBe(false)

  otherSegment = toSegment([[5.0, -Math.PI / 4.0], [5.0, Math.PI / 4.0]])
  expect(isSegmentOccluded(thisSegment, otherSegment)).toBe(true)

})

it('isSegmentOccluded_2', () => {
  const thisSegment = toSegment([[10.0, Math.PI * 0.8], [10.0, -Math.PI * 0.8]])

  let otherSegment = toSegment([[20.0, Math.PI * 0.8], [20.0, -Math.PI * 0.8]])
  expect(isSegmentOccluded(thisSegment, otherSegment)).toBe(false)

  otherSegment = toSegment([[5.0, Math.PI * 0.8], [5.0, -Math.PI * 0.8]])
  expect(isSegmentOccluded(thisSegment, otherSegment)).toBe(true)

})


it('isSegmentOccluded_3', () => {
  const thisSegment = toSegment([[10.0, Math.PI * 0.9], [10.0, -Math.PI * 0.9]])

  let start_theta = -Math.PI;
  const angleSize = 0.3 * Math.PI;
  let stop_theta = start_theta + angleSize;

  while (stop_theta < Math.PI) {
    const otherSegment = toSegment([[5.0, start_theta], [5.0, stop_theta]])
    expect(isSegmentOccluded(thisSegment, otherSegment)).toBe(false)

    start_theta += 0.1 * Math.PI;
    stop_theta += 0.1 * Math.PI;
  }
})


const v2 = (a:number[]) => vec2.fromValues(a[0], a[1]);
it('isPointBehindLine_1', () => {

  let p1 = v2([5.0, -5.0]);
  let p2 = v2([5.0, 5.0]);
  
  const runTest = (p: vec2, expectation: boolean) => expect(isPointBehindLine(p1, p2, p)).toBe(expectation);

  runTest(v2([10.0, 0.0]), true);
  runTest(v2([6.0, 0.0]), true);
  runTest(v2([5.01, 0.0]), true);
  
  runTest(v2([5.01, 200.0]), true);
  runTest(v2([500.0, -200.0]), true);
  runTest(v2([5.01, 0.01]), true);
  runTest(v2([5000.0, 0.0]), true);

  runTest(v2([4.99, 0.0]), false);
  runTest(v2([1.0, 0.0]), false);
  runTest(v2([0.0, 0.0]), false);
  runTest(v2([-20.0, 0.0]), false);  

  runTest(v2([4.99, 200.0]), false);
  runTest(v2([1.0, -200.0]), false);
  runTest(v2([0.0, 3656.0]), false);
  runTest(v2([-20.0, -21.0]), false);
});


it('isPointBehindLine_2', () => {
  let p1 = v2([-5.0, 5.0])
  let p2 = v2([5.0, 5.0])
  
  const runTest = (p: vec2) =>  {
    const expectation  = p[1] <= 5.0;
    expect(isPointBehindLine(p1, p2, p)).toBe(expectation)
  }

  runTest([10.0, 0.0]);
  runTest([6.0, 0.0]);
  runTest([5.01, 0.0]);
  
  runTest([5.01, 200.0]);
  runTest([500.0, -200.0]);
  runTest([5.01, 0.01]);
  runTest([5000.0, 0.0]);

  runTest([4.99, 0.0]);
  runTest([1.0, 0.0]);
  runTest([0.0, 0.0]);
  runTest([-20.0, 0.0]);  

  runTest([4.99, 200.0]);
  runTest([1.0, -200.0]);
  runTest([0.0, 3656.0]);
  runTest([-20.0, -21.0]);
});


var seed = 1;
const random = () => {
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

const randomVec = () => v2([random() * 100.0, random() * 100.0])

it('isPointBehindLine_3', () => {
  let p1 = v2([-5.0, 5.0])
  let p2 = v2([5.0, 5.0])
  let expectation = (p:vec2) => p[1] <= 5.0;
  
  const runTest = (p:vec2) =>  {
    expect(isPointBehindLine(p1, p2, p)).toBe(expectation(p))
  }

  for (var i = 0; i < 100; i++) {
    runTest(randomVec())
  }

});

it('isPointBehindLine_4', () => {
  let p1 = v2([5.0, -5.0]);
  let p2 = v2([-5.0, -5.0]);
  let expectation = (p:vec2) => p[1] >= -5.0;
  
  const runTest = (p:vec2) =>  {
    expect(isPointBehindLine(p1, p2, p)).toBe(expectation(p))
  }

  for (var i = 0; i < 100; i++) {
    runTest(randomVec())
  }

});

it('isPointBehindLine_5', () => {
  let p1 = v2([0.0, 2.0]);
  let p2 = v2([2.0, 0.0]);
  let expectation = (p: vec2) => p[1] + p[2] <= 1;
  
  const runTest = (p: vec2) =>  {
    expect(isPointBehindLine(p1, p2, p)).toBe(expectation(p))
  }

  for (var i = 0; i < 100; i++) {
    runTest(randomVec())
  }

});

it('isPointBehindLine_5', () => {
  let p1 = v2([-2.0, 0.0]);
  let p2 = v2([0.0, -2.0]);
  let expectation = (p: vec2) => p[1] + p[2] >= -1;
  
  const runTest = (p: vec2) =>  {
    expect(isPointBehindLine(p1, p2, p)).toBe(expectation(p))
  }

  for (var i = 0; i < 100; i++) {
    runTest(randomVec())
  }

});
