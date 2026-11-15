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

2. **One "continue" per run, paid or by watching an ad**
   - A second chance after the last try is lost, not a power boost.
   - Limited to one per run.
   - Runs that used a continue are marked on the leaderboard to keep it fair.

3. **Season pass (later)**
   - Monthly exclusive skins and ball trails for regular players.

## Decided against

- **Paying for power-ups:** it would make the game too easy, break leaderboard
  trust and drive away free players.
