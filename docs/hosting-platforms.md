# Hosting platforms

Brick Smasher is a **static site** (HTML, CSS, JavaScript files, no server of its own). Its online features (accounts, leaderboard, progress) run on **Supabase**, which works the same whichever host serves the game. So any static host can run it.

## Comparison (free tiers, as of late 2026; check current terms)

| Platform | Good at | Free tier highlights | Watch out for |
|---|---|---|---|
| **Vercel** (current) | Simplest deploys from GitHub, preview links per change, built-in Web Analytics | Generous for hobby projects | Hobby plan is for non-commercial use; paid plan needed once the game earns money |
| **Cloudflare Pages** | Very fast worldwide network, **unlimited bandwidth** on free, built-in Web Analytics, strong security/DDoS protection | Unlimited static requests & bandwidth; build minutes limited | Config is different from Vercel (`_headers` file instead of `vercel.json`) |
| **Netlify** | Similar to Vercel; forms and simple functions built in | Monthly bandwidth/build limits | Usage over the free limits gets charged or paused |
| **GitHub Pages** | Free, simple, lives next to the code | Free for public repos | No custom security headers, no server features, public repo needed on free accounts |
| **Firebase Hosting** (Google) | Pairs with other Firebase services | Small free storage/bandwidth quota | Overlaps with Supabase; pay-as-you-go above quota |

**Recommendation:** keep **Vercel** as the main link for now, and add **Cloudflare Pages** as a second deployment. Cloudflare's unlimited free bandwidth is the safer home if the game goes viral, and once a commercial version launches (in-app purchases), Vercel's Hobby terms would require a paid plan while Cloudflare's free plan allows commercial use.

## Deploying to Cloudflare Pages (owner steps, ~3 minutes, free)

The repo is already prepared: `build.sh` builds the site into `dist/` (game files only; `docs/` and `supabase/` are never published), and `_headers` sets the same security headers as Vercel.

1. Create a free account at https://dash.cloudflare.com/sign-up (no card needed).
2. Go to **Workers & Pages → Create → Pages → Connect to Git** (wording may vary slightly).
3. Authorise GitHub and pick the **nehkee/brick-smasher** repository.
4. Build settings:
   - **Project name:** `brick-smasher` (the address becomes `https://brick-smasher.pages.dev`, or a variant if the name is taken)
   - **Production branch:** `main`
   - **Framework preset:** None
   - **Build command:** `bash build.sh`
   - **Build output directory:** `dist`
5. Click **Save and Deploy**. Every push to `main` then updates both Vercel and Cloudflare automatically.
6. Optional: in the Pages project, open **Metrics / Web Analytics** and enable Cloudflare Web Analytics (free, no cookies). The security headers already allow it.

**Notes**
- Players' progress lives in Supabase, so accounts, leaderboards and missions are shared across both sites. Guest progress is per site (saved in the browser).
- Share links point to whichever site the player is on.
- The link preview image/text (`og:` tags in `index.html`) still names the Vercel address; switch it if Cloudflare becomes the main site.
