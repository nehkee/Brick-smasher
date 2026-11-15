# Brick-smasher
a brick smasher game that will go viral

A neon arcade brick-breaker: 10 handmade levels, then endless generated levels, 11 power-ups, three difficulty settings and an online leaderboard. Every run gives you exactly 2 tries; lose both and you start over from level 1. Plain HTML5 canvas and JavaScript, with no build step and no dependencies.

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
| Wide paddle, Laser, Magnet, Multi-ball, Slow-mo, Fireball, Extra try (only drops after you've lost one) | Shrink, Speed up, Reverse controls, Fog |

## Bricks

- Cyan / pink / gold: 1 / 2 / 3 hits
- Grey metal: unbreakable
- Red pulsing: explosive, destroys neighbours

## Leaderboard

Scores are stored in the `brick-smasher` Supabase project (table `public.scores`). The browser can't touch the table directly; it can only call two database functions:

- `submit_score(name, score, level, difficulty)`: validates the nickname, difficulty and a plausible score for the level, then returns the player's rank
- `get_leaderboard(difficulty, limit)`: top scores for one difficulty

## Endless mode

After level 10, levels are generated forever and get harder (more rows, tougher and metal bricks, faster ball). Generation is seeded by the level number, so every player gets the same level N.

## Project layout

```
index.html
src/main.js    game loop, physics, rendering, input
src/levels.js  level layouts (edit to add levels)
src/audio.js   synthesized sound effects
src/leaderboard.js  online leaderboard client and panel
src/style.css
```
