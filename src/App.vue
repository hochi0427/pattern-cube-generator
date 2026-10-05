<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { generateStructure, projectStructure, VIEW_DEFINITIONS } from './lib/cube-model.js'
import pattern1 from './assets/patterns/pattern-1.svg'
import pattern2 from './assets/patterns/pattern-2.svg'
import pattern3 from './assets/patterns/pattern-3.svg'
import pattern4 from './assets/patterns/pattern-4.svg'
import pattern5 from './assets/patterns/pattern-5.svg'
import pattern6 from './assets/patterns/pattern-6.svg'

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

const cubeCount = ref(3)
const hasGenerated = ref(false)
const showBrandIntro = ref(true)
const showGameIntro = ref(false)
let brandIntroTimer

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

onMounted(() => {
  window.scrollTo(0, 0)
  brandIntroTimer = window.setTimeout(() => {
    showBrandIntro.value = false
  }, 1900)
})

onUnmounted(() => {
  window.clearTimeout(brandIntroTimer)
})

function closeGameIntro() {
  showGameIntro.value = false
}

function handleModalKeydown(event) {
  if (event.key === 'Escape' && showGameIntro.value) {
    closeGameIntro()
  }
}

onMounted(() => window.addEventListener('keydown', handleModalKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleModalKeydown))

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

async function generatePuzzle() {
  cubes.value = generateStructure(cubeCount.value)
  hasGenerated.value = true
  await nextTick()
  document.querySelector('.views')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
}

function selectCubeCount(count) {
  cubeCount.value = count
  cubes.value = []
  hasGenerated.value = false
}
</script>

<template>
  <div v-if="showBrandIntro" class="brand-splash" role="presentation">
    <div class="brand-splash-content">
      <svg class="brand-cube-mark brand-cube-mark--splash" viewBox="0 0 72 72" aria-hidden="true">
        <path class="cube-outline" d="M36 5 65 21.5v29L36 67 7 50.5v-29L36 5Z M7 21.5 36 38l29-16.5M36 38v29" />
      </svg>
      <p class="brand-splash-title">PATTERN CUBE GAME</p>
    </div>
  </div>

  <main class="page">
    <nav class="site-nav" aria-label="Main navigation">
      <a class="brand-lockup" href="#top" aria-label="Pattern Cube Game home">
        <svg class="brand-cube-mark" viewBox="0 0 72 72" aria-hidden="true">
          <path d="M36 5 65 21.5v29L36 67 7 50.5v-29L36 5Z M7 21.5 36 38l29-16.5M36 38v29" />
        </svg>
        <span>Pattern Cube Game</span>
      </a>
      <button class="nav-intro-button" type="button" @click="showGameIntro = true">Game Intro</button>
    </nav>

    <header id="top" class="intro">
      <p class="eyebrow">A little challenge for curious minds</p>
      <h1>Cubes ready?</h1>
      <p class="subtitle">Pick a challenge, generate a pattern, and start building.</p>
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

  <div v-if="showGameIntro" class="modal-backdrop" @click.self="closeGameIntro">
    <section class="game-modal" role="dialog" aria-modal="true" aria-labelledby="game-modal-title">
      <button class="modal-close" type="button" aria-label="Close Game Intro" @click="closeGameIntro">×</button>
      <p class="eyebrow">A hands-on puzzle game</p>
      <h2 id="game-modal-title">Think. Turn. Build.</h2>
      <p class="modal-lead">Pattern Cube Game is a hands-on spatial reasoning game designed for children ages 5–8.</p>
      <p class="modal-body">By turning, testing, and rearranging patterned cubes, children explore shapes, position, rotation, and spatial relationships through physical play.</p>

      <div class="mode-cards">
        <article class="mode-card">
          <span class="mode-icon" aria-hidden="true">◷</span>
          <h3>SPEED</h3>
          <p>Observe quickly. Build faster.</p>
        </article>
        <article class="mode-card">
          <span class="mode-icon" aria-hidden="true">✳</span>
          <h3>RANDOM</h3>
          <p>Adapt to unexpected patterns.</p>
        </article>
        <article class="mode-card">
          <span class="mode-icon" aria-hidden="true">◎</span>
          <h3>MEMORY</h3>
          <p>Look, remember, reconstruct.</p>
        </article>
      </div>

      <p class="modal-footer">Designed to make spatial thinking visible, tangible, and playful.</p>
    </section>
  </div>
</template>