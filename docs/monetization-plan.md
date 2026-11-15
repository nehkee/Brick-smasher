# Monetization plan (on hold)

**Status:** parked on purpose. Don't build any of this until the owner asks for it.
The goal for now is to grow a loyal player base first.

**When to turn it on:** players come back without being asked (roughly a few
hundred players a day and an active Today leaderboard).

## The plan

1. **Cosmetic skins**
   - The skins system is already built (`src/skins.js`). Premium skins (Rainbow $0.99,
     Plasma $0.99, Shadow $1.99) show their price with a "Soon" button.
   - To turn it on: connect a payment provider (e.g. Stripe), switch the "Soon"
     buttons to real purchases, and record purchased skins on the player's account
     (accounts only, so purchases are never lost).

2. **One paid continue per run ($0.99, sold singly)**
   - A second chance after the last try is lost, not a power boost.
   - Limited to one per run; no packs of lives; **no ads** (owner's rule).
   - Only offered when the player is close to beating their high score.
   - Runs that used a continue are marked on the leaderboard to keep it fair.
   - Full details: `docs/possible-future-improvements.md`, section 3.

3. **Season pass (later)**
   - Monthly exclusive skins and ball trails for regular players.

## Already in place (no money involved yet)

- Premium skins have **flair only** (rainbow / plasma / shadow effects), never a gameplay boost, so the leaderboard stays fair.
- Completing the daily challenge gives a **24-hour free trial** of a premium skin: try before you buy. When purchases are switched on, the trial card and skins panel are where the "keep it" button goes.
- Free progression (XP, levels, titles, missions, streak badges) never runs out, so premium skins never need to be given away as rewards.

## Decided against

- **Paying for power-ups:** it would make the game too easy, break leaderboard
  trust and drive away free players.
