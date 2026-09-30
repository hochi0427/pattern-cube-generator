<script setup>
import { ref, computed } from 'vue'
import { generateStructure, projectStructure, VIEW_DEFINITIONS } from './lib/cube-model.js'
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

const cubes = ref([])
const views = computed(() => VIEW_DEFINITIONS.map(definition => ({
  ...definition,
  projection: projectStructure(cubes.value, definition)
})))
const selectedPreview = computed(() => previewLayouts[cubeCount.value])
const cellSize = 48

function fragmentStyle(cell, projection) {
  return {
    left: `${(cell.x - projection.minX) * cellSize}px`,
    top: `${(projection.maxY - cell.y - cell.height) * cellSize}px`,
    width: `${cell.width * cellSize}px`,
    height: `${cell.height * cellSize}px`
  }
}

function artworkStyle(cell) {
  return {
    left: `${(cell.faceX - cell.x) * cellSize}px`,
    top: `${(cell.y + cell.height - cell.faceY - 1) * cellSize}px`,
    width: `${cellSize}px`,
    height: `${cellSize}px`,
    transform: `rotate(${cell.rotation}deg)`
  }
}

function generatePuzzle() {
  cubes.value = generateStructure(cubeCount.value)
  hasGenerated.value = true
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
          <h3>{{ view.name }} View</h3>
          <p class="view-description">{{ view.description }}</p>
          <div v-if="hasGenerated" class="projection-stage">
            <div
              class="projection"
              role="img"
              :aria-label="`${view.name} projection pattern. ${view.description}`"
              :style="{ width: `${view.projection.width * cellSize}px`, height: `${view.projection.height * cellSize}px` }"
            >
              <div
                v-for="cell in view.projection.cells"
                :key="`${cell.x},${cell.y}`"
                class="projection-cell"
                :style="fragmentStyle(cell, view.projection)"
              >
                <img :src="patternFiles[cell.pattern - 1]" alt="" :style="artworkStyle(cell)" />
              </div>
            </div>
          </div>
          <div v-else class="view-placeholder">Generate a puzzle to reveal this clue.</div>
        </article>
      </div>
    </section>

    <p class="instruction">Use the three views as clues to recreate the hidden structure with your physical cubes.</p>
  </main>
</template>