# Possible future improvements

Ideas discussed but **not built yet**. Don't implement until the owner asks.

## 1. Hype words on big moments (combo praise)

On-screen words that celebrate great play, like a puzzle game's "praise" pop-ups, in Brick Smasher's own arcade voice (not copying another game's words).

**Why:** it names the moment so players notice they did something impressive, and when it lands at the same instant as the shake, buzz, sound and hit-stop, it makes impacts feel physical. Escalating words also reward keeping a combo alive.

**Risks to avoid**
- Showing it too often turns it into noise. It must be earned.
- Covering the ball or bricks (especially in Berserk). It should be quick, slightly see-through, and away from the ball.
- Adding screen clutter after the menus were simplified.
- Copying another game's catchphrases.

**Proposed design**
- Combo tiers, each bigger, brighter and louder:
  - 5 bricks: NICE
  - 10: GREAT
  - 15: AWESOME
  - 20: INSANE
  - 30+: UNSTOPPABLE
- Special moments:
  - **BOOM!** for a chain of 4+ explosions
  - **CLUTCH!** for saving the last ball just above the bottom
  - **FLAWLESS!** for clearing a level without losing a try
  - **BUZZER BEATER!** for clearing a Berserk level with under 5 seconds left
- Each word arrives with its own rising sound, a vibration, and hit-stop on the biggest tiers.
- 2–3 word variants per tier so it doesn't repeat, all in the same style.
- An on/off switch in Settings.
- Limit: no recorded voice (that needs recordings or a paid voice service); a strong sound per tier gets most of the effect.

**Effort:** about half a day. Builds on the existing "10 COMBO!", "PERFECT!" and "NEW BEST!" pop-ups.

## 2. Starknet layer (for the Wolfpack League program)

**Why:** the owner is in the Wolfpack League (WPL) program on Starknet, which may pay builders whose projects show real traction (possibly around $3,000–4,000, or points toward it). The blockchain is for the owner's benefit; players shouldn't notice any difference.

**Order:** launch as is and get real players first, then add Starknet.

**Hard constraint: the owner can't pay fees.** Every option below must cost nothing, or have fees paid by a sponsor confirmed in writing before going live.

**What changes for players: nothing.**
- Gameplay stays in the browser. Blockchains are far too slow for 60-frames-a-second physics.
- Login, guest mode, skins and menus stay the same.
- Blockchain writes happen in the background after a run, never during play.
- Guests stay off-chain (their names expire after 12 hours).
- Mention Starknet plainly in the terms and privacy policy, even if not in the game screens.

**What could be recorded on Starknet (registered players only)**
- Completed daily challenges and streak badges
- Personal best scores
- Skin ownership (later makes paid skins truly owned and possibly tradeable)

**Player accounts with no wallet or seed phrase**
- Option A: **Cartridge Controller**, made for Starknet games: passkey accounts, background signing, sponsored fees.
- Option B: game-managed accounts with fees paid through the **AVNU** paymaster (avnu.fi) in sponsored mode.

**Zero-cost path**
1. **Build and demo on Starknet Sepolia (test network).** Fees are paid with free faucet tokens: $0.
2. **Ask WPL for fee sponsorship** before mainnet: "Can the program or a partner sponsor transaction fees for my game?" Also check Starknet Foundation grants, and whether AVNU or Cartridge give free credits to new projects. (Not confirmed; these offers change.)
3. **Fallback if nobody sponsors: a daily summary.** One on-chain record per day bundling that day's results costs a few cents a day. Cheapest by far, but shows few unique wallets.
4. Go to mainnet only once a sponsor has confirmed in writing that they'll cover fees.

**Questions for WPL before building**
1. What counts as traction: unique wallets, transactions, contract interactions, daily active users?
2. Must users knowingly connect a Starknet wallet, or is an invisible integration acceptable?
3. Is testnet activity accepted at any stage?
4. Can the program or a partner sponsor gas fees?
5. What's the timeline, and is the payout tied to specific milestones?

**Don't inflate numbers.** No wallets for throwaway guests and no transaction per brick. Programs check for this, and it can cost their trust and the payout.

**Rough costs (verify current prices):** Starknet fees are typically a fraction of a cent per transaction. About 1,000 players with a few on-chain moments a day would be roughly a few dollars a day on mainnet: small, but not zero, hence the need for a sponsor.

**Effort:** a few days. Needs a Starknet wallet to deploy the contract (free on testnet), the Cartridge vs AVNU decision, and a sponsor arrangement for mainnet.

## 3. Making money without ads (full plan)

**Hard rules from the owner**
- **No ads, ever.** They ruin the experience.
- **No unlimited lives.** Every run has 2 free tries. At most **one** extra life can be bought per run.
- **No packs of lives** (no 3-packs or 10-packs). Continues are sold one at a time, so money can't stockpile wins.
- **Nothing that makes the game easier for people with money:** no paid power-ups, no gameplay boosts on skins.
- Nothing that feels like a rip-off: no loot boxes, no gambling-style mechanics.

### 3a. One paid extra life per run ($0.99)

- **Price: $0.99 per continue, sold singly.** (At $0.50, card fees of about 30 cents would eat most of a web sale.)
- **Maximum one per run.** After it's used, that run ends normally.
- **Only offered when it matters:** when the player is **close to beating their high score** (for example within about 20% of their best, or already past it), so it appears at the moment it's worth the most and never on an ordinary early loss.
- **Leaderboard fairness:** runs that used a bought life get a small marker, so free players never feel beaten by a wallet.
- **Why it matters:** players can buy it again and again, unlike a skin, which is bought once.

### 3b. Other fair ways to earn

| Idea | How it works | Why it's fair |
|---|---|---|
| **Supporter Pass** ($2.99–4.99/month) | Each month: exclusive skin, trail, badge, supporter name colour on the leaderboard, one extra daily-challenge attempt | Mostly looks and status; **monthly income is the path to big numbers** |
| **New skins every month** | 2–3 new premium skins, some limited-time | Fans collect many skins, not one |
| **More cosmetic types** | Explosion styles, ball trails, backgrounds, sound packs | More to collect, no advantage |
| **"Pro" one-time unlock** ($2.99–4.99) | Bonus modes (e.g. Zen: no timer, no losing), level editor, extra stats | Free game stays complete; Pro adds extras |
| **Paid level packs** ($0.99–1.99) | Themed worlds of ~20 handmade levels | Clear value: new content |
| **Tip jar** | "Support the developer" | Some players want to help |

**Avoid:** paid power-ups, cash-prize tournaments with entry fees (gambling laws), loot boxes / random paid rewards.

### 3c. Apple App Store and Google Play

- **Approval is likely** if done properly: wrap the same game code as a real app (e.g. Capacitor), make it feel native (works offline, vibration, Apple Game Center leaderboards), and avoid looking like "a website in a box", which Apple rejects.
- **Payments inside apps must use Apple/Google's own systems** for digital items (skins, continues, passes). They take **15%** for developers earning under $1M/year (30% above).
- **Required:** privacy policy, **in-app account deletion** (Apple requires it when there's sign-up), accurate data labels on the store listing.
- **Costs:** Apple developer account **$99/year**; Google **$25 one-time**. iPhone builds normally need a Mac (or a cloud build service).
- The game is original (not BlackBerry's BrickBreaker), so the brick-breaker genre itself is fine.
- **Pricing:** a paid download ($1.99–4.99 would be fair) is **not recommended**: paid games sell poorly, and a price blocks friends from instantly playing challenge links. Better: **free download + in-app purchases**, with an optional one-time "Pro" unlock for people who like paying once.

### 3d. Honest maths toward $100K

- Free games typically see **1–5% of players pay**, spending roughly **$5–20 each** on average (more with a monthly pass).
- Rough guide: 10,000 players ≈ $1,000–5,000; 100,000 players ≈ $10,000–50,000.
- **$100K realistically needs a few hundred thousand players**, or a strong monthly pass with a loyal core. **Growth matters more than prices right now.**
- Treat this game as something that can earn and open doors (Wolfpack League grant, portfolio, future projects), not the only plan for clearing debt.
- **Keep costs at zero** until real traction: no paid developer accounts or ads before then.

### 3e. Recommended order

1. **Now:** free on the web, grow players, spend nothing.
2. **Once players return daily:** turn on premium skins + one $0.99 continue per run (offered near a high score) + Supporter Pass.
3. **If it takes off:** publish free on Apple and Google with in-app purchases; add Pro and level packs.

---

See also: `docs/monetization-plan.md` (parked money plan).
