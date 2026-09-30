import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CUBE_FACES,
  CUBE_ORIENTATIONS,
  VIEW_DEFINITIONS,
  orientCube,
  projectStructure,
  generateStructure
} from '../src/lib/cube-model.js'

const viewerFrames = {
  front: { normal: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0] },
  back: { normal: [0, 0, 1], right: [-1, 0, 0], up: [0, 1, 0] },
  left: { normal: [-1, 0, 0], right: [0, 0, -1], up: [0, 1, 0] },
  right: { normal: [1, 0, 0], right: [0, 0, 1], up: [0, 1, 0] },
  top: { normal: [0, 1, 0], right: [1, 0, 0], up: [0, 0, 1] },
  bottom: { normal: [0, -1, 0], right: [1, 0, 0], up: [0, 0, -1] }
}

const identity = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]
const clean = vector => vector.map(value => value === 0 ? 0 : value)
const negate = vector => clean(vector.map(value => -value))
const dot = (a, b) => a.reduce((total, value, i) => total + value * b[i], 0)
const cross = (a, b) => clean([
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
])
const transform = (basis, vector) => clean([0, 1, 2].map(row =>
  vector.reduce((value, component, column) => value + component * basis[column][row], 0)
))
const orientationKey = faces => JSON.stringify(Object.keys(viewerFrames).map(name => faces[name]))

function view(name) {
  const definition = VIEW_DEFINITIONS.find(candidate => candidate.name === name)
  assert.ok(definition, `Missing ${name} view`)
  return definition
}

// Distinct markers deliberately isolate geometric visibility from cube artwork.
function markerCube(x, y, z, pattern, rotation = 0) {
  return {
    x, y, z,
    faces: Object.fromEntries(Object.keys(viewerFrames).map(name => [name, { pattern, rotation }]))
  }
}

function onlyCell(projection, pattern) {
  const cells = projection.cells.filter(cell => cell.pattern === pattern)
  assert.equal(cells.length, 1, `Expected one visible cell for marker ${pattern}`)
  return cells[0]
}

test('the printable net keeps its face identities and three opposite pairs', () => {
  const patterns = { front: 1, top: 2, left: 3, bottom: 4, right: 5, back: 6 }
  assert.equal(CUBE_FACES.length, 6)
  for (const [name, pattern] of Object.entries(patterns)) {
    const face = CUBE_FACES.find(candidate => candidate.name === name)
    assert.ok(face, `Missing ${name} face`)
    assert.equal(face.pattern, pattern)
    for (const axis of ['normal', 'right', 'up']) {
      assert.deepEqual(clean(face[axis]), viewerFrames[name][axis])
    }
  }

  const base = orientCube(identity)
  assert.deepEqual(Object.fromEntries(Object.entries(base).map(([name, face]) => [name, face.pattern])), patterns)
  for (const face of Object.values(base)) assert.equal(face.rotation, 0)
})

test('the orientation set contains exactly 24 distinct rigid rotations, with no reflections', () => {
  assert.equal(CUBE_ORIENTATIONS.length, 24)
  assert.equal(new Set(CUBE_ORIENTATIONS.map(matrix => JSON.stringify(matrix))).size, 24)
  for (const basis of CUBE_ORIENTATIONS) {
    assert.equal(basis.length, 3)
    for (let i = 0; i < 3; i++) {
      assert.equal(dot(basis[i], basis[i]), 1)
      for (let j = i + 1; j < 3; j++) assert.equal(dot(basis[i], basis[j]), 0)
    }
    assert.deepEqual(cross(basis[0], basis[1]), clean(basis[2]), 'A reflection is not a physical cube rotation')
  }
  assert.equal(new Set(CUBE_ORIENTATIONS.map(basis => orientationKey(orientCube(basis)))).size, 24)
})

test('all 24 orientations preserve opposite faces and physically rotate the artwork', () => {
  const sourceByPattern = new Map(CUBE_FACES.map(face => [face.pattern, face]))
  const oppositePairKeys = new Set(['1,6', '2,4', '3,5'])
  for (const basis of CUBE_ORIENTATIONS) {
    const faces = orientCube(basis)
    assert.deepEqual(Object.keys(faces).sort(), Object.keys(viewerFrames).sort())
    assert.deepEqual(Object.values(faces).map(face => face.pattern).sort(), [1, 2, 3, 4, 5, 6])
    for (const [first, second] of [['front', 'back'], ['left', 'right'], ['top', 'bottom']]) {
      const pair = [faces[first].pattern, faces[second].pattern].sort().join(',')
      assert.ok(oppositePairKeys.has(pair), `Impossible opposite faces: ${pair}`)
    }

    for (const [name, rendered] of Object.entries(faces)) {
      const source = sourceByPattern.get(rendered.pattern)
      const target = viewerFrames[name]
      assert.deepEqual(transform(basis, source.normal), target.normal)
      assert.ok([0, 90, 180, 270].includes(rendered.rotation))
      // Reconstruct world-space image axes from the clockwise screen rotation.
      const renderedRight = {
        0: target.right, 90: negate(target.up),
        180: negate(target.right), 270: target.up
      }[rendered.rotation]
      const renderedUp = {
        0: target.up, 90: target.right,
        180: negate(target.up), 270: negate(target.right)
      }[rendered.rotation]
      assert.deepEqual(transform(basis, source.right), renderedRight, `${name}: artwork horizontal direction`)
      assert.deepEqual(transform(basis, source.up), renderedUp, `${name}: artwork vertical direction`)
    }
  }
})

test('a quarter turn around the vertical axis changes both visible faces and top/bottom artwork angles', () => {
  const faces = orientCube([[0, 0, -1], [0, 1, 0], [1, 0, 0]])
  assert.equal(faces.front.pattern, 5)
  assert.equal(faces.left.pattern, 1)
  assert.equal(faces.back.pattern, 3)
  assert.equal(faces.right.pattern, 6)
  assert.equal(faces.top.rotation, 90)
  assert.equal(faces.bottom.rotation, 270)
})

test('the clue definitions explicitly look at the front, left side, and underside', () => {
  assert.equal(view('Front').face, 'front')
  assert.equal(view('Side').face, 'left')
  assert.equal(view('Bottom').face, 'bottom')
})

test('the nearest face wins independently along each viewing axis', () => {
  const structure = [
    markerCube(0, 0, 0, 1),
    markerCube(0, 0, 1, 2, 90),
    markerCube(1, 0, 0, 3, 180),
    markerCube(0, 1, 0, 4, 270)
  ]
  const expected = { Front: [1, 3, 4], Side: [1, 2, 4], Bottom: [1, 2, 3] }
  for (const [name, patterns] of Object.entries(expected)) {
    const projected = projectStructure(structure, view(name))
    assert.deepEqual(projected.cells.map(cell => cell.pattern).sort(), patterns, `${name} visibility`)
    for (const cell of projected.cells) assert.equal(cell.rotation, (cell.pattern - 1) * 90)
    const reversed = projectStructure([...structure].reverse(), view(name))
    const stableCells = cells => [...cells].sort((a, b) => a.pattern - b.pattern)
    assert.deepEqual(stableCells(reversed.cells), stableCells(projected.cells), `${name} must not depend on array order`)
  }
})

test('side and bottom projections use physically consistent horizontal and vertical ordering', () => {
  const structure = [
    markerCube(0, 0, 0, 1),
    markerCube(0, 0, 1, 2),
    markerCube(1, 0, 0, 3),
    markerCube(0, 1, 0, 4)
  ]
  const front = projectStructure(structure, view('Front'))
  assert.ok(onlyCell(front, 1).gridColumn < onlyCell(front, 3).gridColumn)
  assert.ok(onlyCell(front, 4).gridRow < onlyCell(front, 1).gridRow)
  const side = projectStructure(structure, view('Side'))
  assert.ok(onlyCell(side, 2).gridColumn < onlyCell(side, 1).gridColumn, 'The back of the structure appears to the left from its left side')
  assert.ok(onlyCell(side, 4).gridRow < onlyCell(side, 1).gridRow)
  const bottom = projectStructure(structure, view('Bottom'))
  assert.ok(onlyCell(bottom, 1).gridColumn < onlyCell(bottom, 3).gridColumn)
  assert.ok(onlyCell(bottom, 1).gridRow < onlyCell(bottom, 2).gridRow, 'The back of the structure appears lower when looking up from below')
})

test('the two lower cubes fully hide the centered upper cube from below', () => {
  const structure = [markerCube(0, 0, 0, 1), markerCube(1, 0, 0, 2), markerCube(0.5, 1, 0, 3)]
  const bottom = projectStructure(structure, view('Bottom'))
  assert.deepEqual([...new Set(bottom.cells.map(cell => cell.pattern))].sort(), [1, 2])
  assert.equal(bottom.width, 2)
  assert.equal(bottom.height, 1)
})

test('partial occlusion clips a face without stretching or shifting its artwork origin', () => {
  const structure = [markerCube(0, 0, 0, 1), markerCube(0.5, 1, 0, 2, 90)]
  const bottom = projectStructure(structure, view('Bottom'))
  const exposed = bottom.cells.filter(cell => cell.pattern === 2)
  assert.ok(exposed.length > 0)
  assert.equal(exposed.reduce((area, cell) => area + cell.width * cell.height, 0), 0.5)
  for (const cell of exposed) {
    assert.ok(cell.x >= 1)
    assert.equal(cell.faceX, 0.5)
    assert.equal(cell.rotation, 90)
  }
})

test('empty structures produce empty projections', () => {
  for (const definition of VIEW_DEFINITIONS) {
    const projection = projectStructure([], definition)
    assert.deepEqual(projection.cells, [])
    assert.equal(projection.width, 0)
    assert.equal(projection.height, 0)
  }
})

test('generated puzzles contain the selected number of distinct physical cubes in legal orientations', () => {
  let state = 1729
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 2 ** 32
  }
  const legalFaces = new Set(CUBE_ORIENTATIONS.map(basis => orientationKey(orientCube(basis))))
  for (const count of [3, 6, 9]) {
    for (let attempt = 0; attempt < 12; attempt++) {
      const structure = generateStructure(count, random)
      assert.equal(structure.length, count)
      assert.equal(new Set(structure.map(({ x, y, z }) => `${x},${y},${z}`)).size, count)
      for (const cube of structure) assert.ok(legalFaces.has(orientationKey(cube.faces)))
    }
  }
})

test('six- and nine-cube layouts stay face-connected and project as a single layer', () => {
  for (const count of [6, 9]) {
    const structure = generateStructure(count, () => 0.375)
    const reached = new Set([0])
    const pending = [0]
    while (pending.length) {
      const current = structure[pending.pop()]
      structure.forEach((cube, index) => {
        const distance = Math.abs(cube.x - current.x) + Math.abs(cube.y - current.y) + Math.abs(cube.z - current.z)
        if (!reached.has(index) && distance === 1) {
          reached.add(index)
          pending.push(index)
        }
      })
    }
    assert.equal(reached.size, count)
    assert.equal(projectStructure(structure, view('Front')).cells.length, count)
    const side = projectStructure(structure, view('Side'))
    const bottom = projectStructure(structure, view('Bottom'))
    assert.equal(side.width, 1)
    assert.equal(side.height, count / 3)
    assert.equal(bottom.width, 3)
    assert.equal(bottom.height, 1)
  }
})
