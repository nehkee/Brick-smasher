# Brick-smasher
a brick smasher game that will go viral

A neon arcade brick-breaker with 10 levels, 11 power-ups and three difficulty settings. Plain HTML5 canvas and JavaScript, with no build step and no dependencies.

## Play

Open `index.html` in a browser, or serve the folder:

```
npx serve .
```

**Controls**
- Move: mouse, touch-drag, or ← → / A D
- Launch the ball: click, tap, Space or Enter
- Pause: P or Esc (or the pause button)
- Mute: M

## Power-ups

Catch green capsules and dodge red ones.

| Good | Bad |
|---|---|
| Wide paddle, Laser, Magnet, Multi-ball, Slow-mo, Fireball, Extra life | Shrink, Speed up, Reverse controls, Fog |

## Bricks

- Cyan / pink / gold: 1 / 2 / 3 hits
- Grey metal: unbreakable
- Red pulsing: explosive, destroys neighbours

## Project layout

```
index.html
src/main.js    game loop, physics, rendering, input
src/levels.js  level layouts (edit to add levels)
src/audio.js   synthesized sound effects
src/style.css
```
