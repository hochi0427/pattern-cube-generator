<script setup>
import { ref, computed } from 'vue'
import pattern1 from './assets/patterns/pattern-1.svg'
import pattern2 from './assets/patterns/pattern-2.svg'
import pattern3 from './assets/patterns/pattern-3.svg'
import pattern4 from './assets/patterns/pattern-4.svg'
import pattern5 from './assets/patterns/pattern-5.svg'
import pattern6 from './assets/patterns/pattern-6.svg'

const cubeCount = ref(3)
const hasGenerated = ref(false)

const cubeOptions = [3, 6, 9]

const previewLayouts = {
  3: [[1], [1, 1]],
  6: [[1, 1, 1], [1, 1, 1]],
  9: [[1, 1, 1], [1, 1, 1], [1, 1, 1]]
}

const patternFiles = [pattern1, pattern2, pattern3, pattern4, pattern5, pattern6]

const frontSilhouettes = {
  3: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
  6: [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
    { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }
  ],
  9: [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
    { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
    { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }
  ]
}

const cubes = ref([])

const viewDefinitions = [
  { name: 'Front', horizontal: 'x', vertical: 'y', depth: 'z', closest: 'min', face: 'front' },
  { name: 'Side', horizontal: 'z', vertical: 'y', depth: 'x', closest: 'min', face: 'left' },
  { name: 'Top', horizontal: 'x', vertical: 'z', depth: 'y', closest: 'max', face: 'top' }
]

function coordinateKey({ x, y, z }) {
  return `${x},${y},${z}`
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5)
}

function assignRandomFaces() {
  const shuffledPatterns = shuffle(patternFiles)
  return {
    front: shuffledPatterns[0],
    back: shuffledPatterns[1],
    left: shuffledPatterns[2],
    right: shuffledPatterns[3],
    top: shuffledPatterns[4],
    bottom: shuffledPatterns[5]
  }
}

function generateConnectedStructure(count) {
  const targetCells = frontSilhouettes[count]
  const remaining = new Set(targetCells.map(cell => `${cell.x},${cell.y}`))
  const structure = []
  let current = targetCells[0]

  while (remaining.size > 0) {
    remaining.delete(`${current.x},${current.y}`)
    structure.push({ x: current.x, y: current.y, z: 0, faces: assignRandomFaces() })

    const neighbors = targetCells.filter(cell =>
      remaining.has(`${cell.x},${cell.y}`) &&
      Math.abs(cell.x - current.x) + Math.abs(cell.y - current.y) === 1
    )

    const nextCells = neighbors.length
      ? neighbors
      : targetCells.filter(cell => remaining.has(`${cell.x},${cell.y}`))
    current = shuffle(nextCells)[0]
  }

  return shuffle(structure)
}

function projectStructure(structure, definition) {
  if (structure.length === 0) {
    return { cells: [], minX: 0, maxY: 0, width: 0, height: 0 }
  }

  const visible = new Map()

  for (const cube of structure) {
    const horizontal = cube[definition.horizontal]
    const vertical = cube[definition.vertical]
    const key = `${horizontal},${vertical}`
    const current = visible.get(key)
    const isCloser = !current ||
      (definition.closest === 'min'
        ? cube[definition.depth] < current.depth
        : cube[definition.depth] > current.depth)

    if (isCloser) {
      visible.set(key, {
        x: horizontal,
        y: vertical,
        depth: cube[definition.depth],
        pattern: cube.faces[definition.face]
      })
    }
  }

  const cells = [...visible.values()].map(({ x, y, pattern }) => ({ x, y, pattern }))
  const horizontalValues = cells.map(cell => cell.x)
  const verticalValues = cells.map(cell => cell.y)
  const minX = Math.min(...horizontalValues)
  const maxX = Math.max(...horizontalValues)
  const minY = Math.min(...verticalValues)
  const maxY = Math.max(...verticalValues)

  return {
    cells: cells.map(cell => ({
      ...cell,
      gridColumn: cell.x - minX + 1,
      gridRow: maxY - cell.y + 1
    })),
    minX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1
  }
}

const frontView = computed(() => projectStructure(cubes.value, viewDefinitions[0]))
const sideView = computed(() => projectStructure(cubes.value, viewDefinitions[1]))
const topView = computed(() => projectStructure(cubes.value, viewDefinitions[2]))

const views = computed(() => [
  { name: 'Front', projection: frontView.value },
  { name: 'Side', projection: sideView.value },
  { name: 'Top', projection: topView.value }
])

const selectedPreview = computed(() => previewLayouts[cubeCount.value])

function generatePuzzle() {
  cubes.value = generateConnectedStructure(cubeCount.value)
  hasGenerated.value = true
  console.log('3D Cubes:', cubes.value)
  console.log('Front:', frontView.value)
  console.log('Side:', sideView.value)
  console.log('Top:', topView.value)
}

function selectCubeCount(count) {
  cubeCount.value = count
  cubes.value = []
  hasGenerated.value = false
}
</script>

<template>
  <main class="page">
    <header class="intro">
      <p class="eyebrow">Physical puzzle study</p>
      <h1>Pattern Cube Generator</h1>
      <p class="subtitle">Build the pattern from three different views.</p>
    </header>

    <section class="controls" aria-labelledby="cube-count-heading">
      <div class="section-heading">
        <p class="eyebrow">Start with a set</p>
        <h2 id="cube-count-heading">Number of cubes</h2>
      </div>

      <div class="selector" role="group" aria-label="Choose number of cubes">
        <button
          v-for="count in cubeOptions"
          :key="count"
          type="button"
          :class="{ active: cubeCount === count }"
          :aria-pressed="cubeCount === count"
          @click="selectCubeCount(count)"
        >
          {{ count }} Cubes
        </button>
      </div>

      <div class="layout-preview" aria-live="polite">
        <div class="preview-label">Selected layout</div>
        <div class="cube-layout" :class="`cube-layout--${cubeCount}`" :aria-label="`${cubeCount} cube layout preview`">
          <div v-for="(row, rowIndex) in selectedPreview" :key="rowIndex" class="cube-row">
            <span v-for="(_, cubeIndex) in row" :key="cubeIndex" class="preview-cube" aria-hidden="true"></span>
          </div>
        </div>
      </div>

      <button class="generate" type="button" @click="generatePuzzle">
        Generate Puzzle
      </button>
    </section>

    <section class="views" aria-labelledby="views-heading">
      <div class="views-heading">
        <p class="eyebrow">{{ hasGenerated ? 'Your clues' : 'Puzzle views' }}</p>
        <h2 id="views-heading">{{ hasGenerated ? 'See the hidden structure from every side' : 'See the structure from every side' }}</h2>
      </div>

      <div class="view-grid">
        <article v-for="view in views" :key="view.name" class="view">
          <h3>{{ view.name === 'Top' ? 'Bottom' : view.name }} View</h3>
          <div v-if="hasGenerated" class="projection" role="img" :aria-label="`${view.name} projection pattern`" :style="{ gridTemplateColumns: `repeat(${view.projection.width}, 32px)`, gridTemplateRows: `repeat(${view.projection.height}, 32px)` }">
              <img
              v-for="cell in view.projection.cells"
              :key="`${cell.x},${cell.y}`"
              :class="{ 'front-triangle-top': view.name === 'Front' && view.projection.cells.length === 3 && cell.y === 1 }"
              :src="cell.pattern"
              alt=""
              :style="{ gridColumn: cell.gridColumn, gridRow: cell.gridRow }"
            />
          </div>
          <div v-else class="view-placeholder">Generate a puzzle to reveal this clue.</div>
        </article>
      </div>
    </section>

    <p class="instruction">Use the three views as clues to recreate the hidden structure with your physical cubes.</p>
  </main>
</template>