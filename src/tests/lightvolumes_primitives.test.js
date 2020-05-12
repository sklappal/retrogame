import { isPointBehindLine, isSegmentOccluded, rayLineIntersection } from '../components/rendering/lightvolumes'

it ('rayLineIntersection', () => {
  expect(rayLineIntersection([1.0, 0.0], [5.0, -10.0], [5.0, 10.0])).toStrictEqual({intersect: true, distance: 5.0})
})

it('isSegmentOccluded_1', () => {

  const thisSegment = [[10.0, -Math.PI / 4.0], [10.0, Math.PI / 4.0]]

  let otherSegment = [[20.0, -Math.PI / 4.0], [20.0, Math.PI / 4.0]]
  expect(isSegmentOccluded(thisSegment, otherSegment)).toBe(false)

  otherSegment = [[5.0, -Math.PI / 4.0], [5.0, Math.PI / 4.0]]
  expect(isSegmentOccluded(thisSegment, otherSegment)).toBe(true)

})

it('isSegmentOccluded_2', () => {
  const thisSegment = [[10.0, Math.PI * 0.8], [10.0, -Math.PI * 0.8]]

  let otherSegment = [[20.0, Math.PI * 0.8], [20.0, -Math.PI * 0.8]]
  expect(isSegmentOccluded(thisSegment, otherSegment)).toBe(false)

  otherSegment = [[5.0, Math.PI * 0.8], [5.0, -Math.PI * 0.8]]
  expect(isSegmentOccluded(thisSegment, otherSegment)).toBe(true)

})

it('isSegmentOccluded_3', () => {
  const thisSegment = [[10.0, Math.PI * 0.9], [10.0, -Math.PI * 0.9]]

  let start_theta = -Math.PI;
  const angleSize = 0.3 * Math.PI;
  let stop_theta = start_theta + angleSize;

  while (stop_theta < Math.PI) {
    const otherSegment = [[5.0, start_theta], [5.0, stop_theta]]
    expect(isSegmentOccluded(thisSegment, otherSegment)).toBe(false)

    start_theta += 0.1 * Math.PI;
    stop_theta += 0.1 * Math.PI;
  }
})


it('isPointBehindLine_1', () => {
  let p1 = [5.0, -5.0]
  let p2 = [5.0, 5.0]
  
  const runTest = (p, expectation) => expect(isPointBehindLine(p1, p2, p)).toBe(expectation);

  runTest([10.0, 0.0], true);
  runTest([6.0, 0.0], true);
  runTest([5.01, 0.0], true);
  
  runTest([5.01, 200.0], true);
  runTest([500.0, -200.0], true);
  runTest([5.01, 0.01], true);
  runTest([5000.0, 0.0], true);

  runTest([4.99, 0.0], false);
  runTest([1.0, 0.0], false);
  runTest([0.0, 0.0], false);
  runTest([-20.0, 0.0], false);  

  runTest([4.99, 200.0], false);
  runTest([1.0, -200.0], false);
  runTest([0.0, 3656.0], false);
  runTest([-20.0, -21.0], false);
});


it('isPointBehindLine_2', () => {
  let p1 = [-5.0, 5.0]
  let p2 = [5.0, 5.0]
  
  const runTest = (p) =>  {
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

const randomVec = () => [random() * 100.0, random() * 100.0]

it('isPointBehindLine_3', () => {
  let p1 = [-5.0, 5.0]
  let p2 = [5.0, 5.0]
  let expectation = (p) => p[1] <= 5.0;
  
  const runTest = (p) =>  {
    expect(isPointBehindLine(p1, p2, p)).toBe(expectation(p))
  }

  for (var i = 0; i < 100; i++) {
    runTest(randomVec())
  }

});

it('isPointBehindLine_4', () => {
  let p1 = [5.0, -5.0]
  let p2 = [-5.0, -5.0]
  let expectation = (p) => p[1] >= -5.0;
  
  const runTest = (p) =>  {
    expect(isPointBehindLine(p1, p2, p)).toBe(expectation(p))
  }

  for (var i = 0; i < 100; i++) {
    runTest(randomVec())
  }

});

it('isPointBehindLine_5', () => {
  let p1 = [0.0, 2.0]
  let p2 = [2.0, 0.0]
  let expectation = (p) => p[1] + p[2] <= 1;
  
  const runTest = (p) =>  {
    expect(isPointBehindLine(p1, p2, p)).toBe(expectation(p))
  }

  for (var i = 0; i < 100; i++) {
    runTest(randomVec())
  }

});

it('isPointBehindLine_5', () => {
  let p1 = [-2.0, 0.0]
  let p2 = [0.0, -2.0]
  let expectation = (p) => p[1] + p[2] >= -1;
  
  const runTest = (p) =>  {
    expect(isPointBehindLine(p1, p2, p)).toBe(expectation(p))
  }

  for (var i = 0; i < 100; i++) {
    runTest(randomVec())
  }

});
