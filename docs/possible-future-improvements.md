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

---

See also: `docs/monetization-plan.md` (parked money plan).
