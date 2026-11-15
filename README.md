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

Catch green capsules and dodge red ones.

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

Six free skins are unlocked by playing (level 5, endless mode, 15-combo, level 20, 50,000 points). Three premium skins are shown with prices but can't be bought yet.

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
