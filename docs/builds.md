# Saved builds

## Build One

Saved on **18 Nov 2026**: the version that was live at that moment.

| | |
|---|---|
| **GitHub branch** | `build-1` (frozen copy; never commit to it) |
| **Commit** | `4b8f65e5b94c205238c0b9634e5cb7d559bd06d7`: "Intensity worlds, musical bricks, FOCUS; ready for Cloudflare Pages" |
| **Vercel deployment** | `dpl_2XPr6nf8Gkqd1okPa6zuric9FyeW` (https://brick-smasher-9hfqp6zvd-chukwunekeprince-gmailcoms-projects.vercel.app) |
| **Live site at the time** | https://brick-smasher-liart.vercel.app |

**What's in it:** five intensity worlds (Neon City, Deep Ocean, Solar Flare, Aurora, Cosmic Void), musical bricks, FOCUS meter, Easy / Normal / Hard / Berserk with score bonuses, daily challenge with streaks and skin trials, XP/levels/missions, skins (first unlock at player level 10), 13 power-ups incl. Mega Paddle and Mystery, guest (12 h) and username accounts, all-time / today leaderboards with podium, one-button share with score card and challenge links, settings (music/sound/vibration), Vercel Web Analytics, security hardening, Cloudflare-ready build (`build.sh`, `_headers`).

**Database it expects (Supabase project `odgnmpicwhyewxhclpxf`):** migrations up to and including `signup_rate_limit` (20261115110014): `create_leaderboard`, `accounts_guests_skins`, `name_taken_check`, `per_player_limits_and_guest_ids`, `add_berserk_difficulty`, `player_progress`, `my_best_rank`, `signup_rate_limit`; plus the `signup` edge function (version with the rate limit). The later `zenith_*` migrations belong to a separate project sharing this database and don't affect Brick Smasher.

### How to restore Build One

When the owner says **"restore build one"**:

1. **Fastest (site only, seconds):** in Vercel, promote/roll back production to deployment `dpl_2XPr6nf8Gkqd1okPa6zuric9FyeW` (Vercel dashboard → Deployments → that deployment → "Promote" / "Instant Rollback"). Note: the next push to `main` would replace it again, so also do step 2.
2. **Make it permanent (code):** on `main`, restore the files from `build-1` in a new commit (no force-push, history is kept):
   ```
   git fetch origin build-1
   git checkout origin/build-1 -- .
   git commit -m "Restore Build One"
   git push origin main
   ```
   Files added after Build One that aren't in it can be removed in the same commit if they belong to newer features.
3. **Database:** Build One's code works with the database as it was; later database changes should be additive (new tables/functions), so nothing needs undoing unless a later change altered a function Build One uses (check `submit_score`, `get_leaderboard`, `my_best`, `save_progress`, `save_skins`, `name_taken`, `allow_signup`).
4. Verify on the live site (game loads, a run ends with a score saved, leaderboard opens).
