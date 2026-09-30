// Coordinates: x goes right, y goes up, z goes away from the front viewer.
// The printed side of the supplied net folds outward:
//                  white (2)
// half (3)   black (1)   quarter circle (5)   white circle (6)
//                triangle (4)
// `right` and `up` track the artwork axes, not just the face normal.
export const CUBE_FACES = [
  { name: 'front', pattern: 1, normal: [0, 0, -1], right: [1, 0, 0], up: [0, 1, 0] },
  { name: 'back', pattern: 6, normal: [0, 0, 1], right: [-1, 0, 0], up: [0, 1, 0] },
  { name: 'left', pattern: 3, normal: [-1, 0, 0], right: [0, 0, -1], up: [0, 1, 0] },
  { name: 'right', pattern: 5, normal: [1, 0, 0], right: [0, 0, 1], up: [0, 1, 0] },
  { name: 'top', pattern: 2, normal: [0, 1, 0], right: [1, 0, 0], up: [0, 0, 1] },
  { name: 'bottom', pattern: 4, normal: [0, -1, 0], right: [1, 0, 0], up: [0, 0, -1] }
]

const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0)
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0]
]
const rotate = (vector, axes) => [0, 1, 2].map(i =>
  vector.reduce((sum, value, j) => sum + value * axes[j][i], 0)
)

const directions = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 0, 0], [0, -1, 0], [0, 0, -1]]

// A choice of perpendicular x/y axes fixes z. Cross products exclude reflections.
export const CUBE_ORIENTATIONS = directions.flatMap(xAxis =>
  directions.filter(yAxis => dot(xAxis, yAxis) === 0)
    .map(yAxis => [xAxis, yAxis, cross(xAxis, yAxis)])
)

export function orientCube(orientation) {
  return Object.fromEntries(CUBE_FACES.map(source => {
    const normal = rotate(source.normal, orientation)
    const destination = CUBE_FACES.find(face => dot(face.normal, normal) === 1)
    const up = rotate(source.up, orientation)
    // Clockwise image rotation: the artwork's up axis moves toward screen-right.
    const angle = Math.atan2(dot(up, destination.right), dot(up, destination.up))
    const rotation = (Math.round(angle / (Math.PI / 2)) * 90 + 360) % 360
    return [destination.name, { pattern: source.pattern, rotation }]
  }))
}

export const VIEW_DEFINITIONS = [
  { name: 'Front', face: 'front', description: 'Looking straight at the front.' },
  { name: 'Side', face: 'left', description: 'Looking from the left side.' },
  { name: 'Bottom', face: 'bottom', description: 'Looking up from underneath; front edge at the top.' }
]

export function generateStructure(count, random = Math.random) {
  if (![3, 6, 9].includes(count)) throw new RangeError('Choose 3, 6, or 9 cubes.')
  const positions = count === 3
    ? [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: 1 }]
    : Array.from({ length: count }, (_, i) => ({ x: i % 3, y: Math.floor(i / 3) }))

  return positions.map(position => ({
    ...position,
    z: 0,
    faces: orientCube(CUBE_ORIENTATIONS[Math.floor(random() * CUBE_ORIENTATIONS.length)])
  }))
}

export function projectStructure(structure, definition) {
  if (structure.length === 0) return { cells: [], minX: 0, maxY: 0, width: 0, height: 0 }

  const viewer = CUBE_FACES.find(face => face.name === definition.face)
  const projected = structure.map(cube => {
    const center = [cube.x + 0.5, cube.y + 0.5, cube.z + 0.5]
    return {
      x: dot(center, viewer.right) - 0.5,
      y: dot(center, viewer.up) - 0.5,
      depth: dot(center, viewer.normal),
      ...cube.faces[definition.face]
    }
  }).sort((a, b) => b.depth - a.depth || a.x - b.x || a.y - b.y)

  // Resolve coverage of complete square faces, including the half-cube offset
  // in the three-cube stack. Keying by cube centers would leak the upper cube
  // into the bottom view even though the two supporting cubes fully hide it.
  const boundaries = axis => [...new Set(projected.flatMap(face => [face[axis], face[axis] + 1]))]
    .sort((a, b) => a - b)
  const xs = boundaries('x')
  const ys = boundaries('y')
  const regions = []

  for (let row = 0; row < ys.length - 1; row++) {
    const strips = []
    for (let column = 0; column < xs.length - 1; column++) {
      const x = xs[column]
      const y = ys[row]
      const width = xs[column + 1] - x
      const height = ys[row + 1] - y
      const midX = x + width / 2
      const midY = y + height / 2
      const face = projected.find(candidate =>
        midX > candidate.x && midX < candidate.x + 1 &&
        midY > candidate.y && midY < candidate.y + 1
      )
      if (!face) continue

      const previous = strips.at(-1)
      if (previous?.face === face && previous.x + previous.width === x) previous.width += width
      else strips.push({ x, y, width, height, face })
    }
    for (const strip of strips) {
      const previous = regions.find(region =>
        region.face === strip.face && region.x === strip.x && region.width === strip.width &&
        region.y + region.height === strip.y
      )
      if (previous) previous.height += strip.height
      else regions.push(strip)
    }
  }

  const minX = xs[0]
  const maxY = ys.at(-1)
  return {
    cells: regions.map(({ face, ...region }) => ({
      ...region,
      pattern: face.pattern,
      rotation: face.rotation,
      faceX: face.x,
      faceY: face.y,
      gridColumn: region.x - minX + 1,
      gridRow: maxY - region.y
    })),
    minX,
    maxY,
    width: xs.at(-1) - minX,
    height: maxY - ys[0]
  }
}
