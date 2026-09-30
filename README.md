# Pattern Cube Generator

Generate front, left-side, and bottom clues for a structure built from identical
physical pattern cubes. Built with Vue 3 and Vite.

```sh
npm ci
npm run dev
npm test
npm run build
```

The local app is served at `http://localhost:5173/pattern-cube-generator/`.

## Physical cube

The six SVG assets match the supplied printable net, with the artwork facing out:

```text
              white (2)
half (3)      black (1)      quarter circle (5)      white circle (6)
              triangle (4)
```

Opposite faces are 1/6, 2/4, and 3/5. Each generated cube uses one of the 24
rigid rotations of this net; face identities and artwork directions rotate
together. Faces cannot be shuffled independently.

## Layout and viewing directions

- 3 cubes: two on the bottom, one centered above them with a half-cube offset.
- 6 cubes: three columns and two rows.
- 9 cubes: three columns and three rows.

All layouts are one cube deep. Coordinates increase rightward (`x`), upward
(`y`), and away from the front viewer (`z`). Front looks along +z, Side looks
along +x from the left, and Bottom looks along +y from underneath with the
front edge at the top of the image.

`src/lib/cube-model.js` owns rotations and orthographic visibility. Projection
uses square-face coverage to handle both complete and partial occlusion,
including the centered upper cube hidden by its supports in Bottom View.
`tests/cube-model.test.js` verifies the net, rotations, directions, occlusion,
and supported layouts without browser dependencies.
