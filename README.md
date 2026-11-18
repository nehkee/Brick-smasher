# Brick-smasher
a brick smasher game that will go viral

A neon arcade brick-breaker: 10 handmade levels, then endless generated levels, 12 power-ups, four modes (Easy, Normal, Hard and the timed Berserk) and an online leaderboard. Every run gives you exactly 2 tries; lose both and you start over from level 1. Plain HTML5 canvas and JavaScript, with no build step and no dependencies.

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

Catch green capsules and dodge red ones. Rainbow **?** capsules are a mystery: anything can be inside, good or bad. The same power-up never drops twice in a row, and capsules fall at different speeds.

| Good | Bad |
|---|---|
| Wide paddle, Mega paddle (rare), Laser, Magnet, Multi-ball, Slow-mo, Fireball, Extra try (only drops after you've lost one) | Shrink, Speed up, Reverse controls, Fog |

## Bricks

- Cyan / pink / gold: 1 / 2 / 3 hits
- Grey metal: unbreakable
- Red pulsing: explosive, destroys neighbours

## Leaderboard

Scores are stored in the `brick-smasher` Supabase project (table `public.scores`). The browser can't touch the table directly; it can only call two database functions:

- `submit_score(name, score, level, difficulty)`: validates the nickname, difficulty and a plausible score for the level, then returns the player's rank
- `get_leaderboard(difficulty, board, limit)`: top scores for one difficulty, all-time (accounts) or today (everyone)

Guests send a random guest id so two guests with the same name stay separate. Each player can post at most 6 scores a minute.

## Players

- **Guests**: new visitors are given a fun guest name automatically and can play instantly (they can rename or sign up from the menu). Guests get a temporary name that is kept for 12 hours from when it was created, even if they close the game and come back. A run in progress is never saved. Guest scores appear on the 24-hour board only, and guest skins expire with the guest name. During the last hour the game warns them to sign up to keep their skins; when time is up they automatically get a new guest name.
- **Accounts** (username + password, no email) rank on the all-time board and keep their skins. Profiles live in `public.profiles`, created by a trigger on sign-up. Sign-up goes through the `signup` Supabase edge function, which creates the account already confirmed (no email is ever sent), then the game logs the player in.

## Skins

Free skins unlock with player level, never before level 10: Inferno (10), Toxic (15), Frost (20), Galaxy (30), and Gold Rush for scoring 50,000 in one run at level 10+. Three premium skins are shown with prices but can't be bought yet.

## Progress, missions and the daily challenge

- **XP and player levels** (no cap) with titles from Rookie to Brick God. XP comes from every run (score and levels reached), missions and the daily challenge.
- **Missions**: three at a time, randomly generated from templates (bricks in a run, combos, laser kills, explosives, perfect clears, Berserk time, mystery capsules…). Completing one awards XP and rolls a new one, so they never run out.
- **Daily challenge**: one generated level per UTC day, the same for everyone, with a daily twist (Speed Demon, Power Surge, Tiny Paddle, Mystery Box, Chain Reaction). 3 attempts per day; clearing it extends your streak, gives XP and, from player level 10, a **24-hour free trial of a premium skin** (bonus XP before that). Streak badges at 3, 7, 14, 30, 50 and 100 days.
- Guests keep progress for their 12 hours; accounts save it to `profiles.progress` via `save_progress()`.

## Feel, sound and settings

Brick shards, explosion shockwaves, a split-second freeze on big hits, paddle squash, phone vibration on Android (iPhones don't allow it for web pages), and original generated music (menu and gameplay tracks). The gear icon opens Settings to switch Music, Sound effects and Vibration on or off.

## Modes

| | Easy | Normal | Hard | Berserk |
|---|---|---|---|---|
| Ball speed | 80% | 100% | 122% | 115% |
| Paddle | 108 | 100 | 94 | 100 |
| Extra speed per level | +3% | +5% | +6% | +5% |
| Traps (of drops) | 15% | 33% | 45% | 35% |
| Score bonus | ×1 | ×1.25 | ×1.5 | ×1.5 |

All modes have 2 tries per run. The score bonus applies to bricks, power-ups and level-clear bonuses (not the daily challenge).

## Worlds, intensity and FOCUS

Inspired by the idea of music and visuals that respond to play:
- **Five worlds** (Neon City, Deep Ocean, Solar Flare, Aurora, Cosmic Void) change every 2 levels, each with its own colours, background effect (rain, bubbles, embers, aurora ribbons, warp stars), music key and tempo. The daily challenge picks a world from its seed.
- **Intensity** (level progress, combo, FOCUS, Berserk clock) adds music layers, speeds up the background and makes it pulse on the beat.
- **Musical bricks:** every break plays the next note of the world's scale.
- **FOCUS:** break 36 bricks to fill the meter, then tap FOCUS (or press F) for 7 seconds of slowed time and double points; the Berserk clock is frozen.

## Hosting

Live on Vercel; also ready for Cloudflare Pages (`bash build.sh`, output `dist`). See `docs/hosting-platforms.md`.

## Berserk mode

A timed mode with its own leaderboard: a fast ball and 2:00 per level. The clock starts when the ball is launched, stops while paused, ticks in the last 10 seconds, and running out costs a try (the clock refills and the bricks stay). Seconds left when a level is cleared are worth 50 points each.

## Endless mode

After level 10, levels are generated forever and get harder (more rows, tougher and metal bricks, faster ball). Generation is seeded by the level number, so every player gets the same level N.

## Sharing

After a run, **Share my score** opens a panel with a 1080x1080 score card. On phones, **Share…** opens the device share sheet (Instagram, TikTok, Messages, Snapchat and more) with the card attached; there are also buttons for X/Twitter, Facebook, WhatsApp, Telegram, Reddit, copy link and save image.

Every shared link is a challenge: `?c=<score>&d=<difficulty>&n=<name>&l=<level>`. A friend who opens it sees "NAME scored N on HARD. Beat it!", gets the target in the HUD, and is told when they beat it. Impossible scores in the link are ignored, and the parameters are removed from the address bar after loading.

## Screen sizes

The playing field is always 600 units wide (so levels and scores are fair on every device) and grows taller on tall screens. The canvas always covers the whole screen: on landscape tablets and desktops the background and glowing walls fill the space beside the field, and the paddle follows your finger or mouse anywhere on screen. Tested on 7" tablets, iPad mini, iPad, Galaxy Tab, iPad Pro 12.9", Surface, phones and desktop, in portrait and landscape.

## Browser support

Built for current Chrome, Safari (iOS 14.5+), Samsung Internet, Firefox and Edge, plus the in-app browsers inside Instagram, TikTok and Facebook. Safari-specific handling: audio unlocks on the first tap, no double-tap zoom or pull-to-refresh, no long-press menu, and nothing drawn under the notch. Slow devices switch automatically to a low-effects mode (no glow, lower resolution).

## Testing as a new player

Open `https://brick-smasher-liart.vercel.app/?fresh=1` to clear this device's guest name, skins, best scores and login and start as a brand-new player.

## Security

Only the publishable Supabase key is in the client. Tables are locked; all writes go through validated database functions (`submit_score`, `save_progress`, `save_skins`). Sign-ups are rate-limited per network address (hashed). Security headers are set in `vercel.json`, and `.vercelignore` keeps `docs/` and `supabase/` off the website. Remaining items are listed in `docs/possible-future-improvements.md`.

## Project layout

```
index.html
src/main.js    game loop, physics, rendering, input
src/levels.js  level layouts (edit to add levels)
src/audio.js   synthesized sound effects
src/leaderboard.js  online leaderboard client and panel
src/vendor/supabase.js  self-hosted @supabase/supabase-js 2.45.4
src/account.js guest names, accounts (Supabase Auth)
src/skins.js   cosmetic skins and skins panel
src/style.css
```
