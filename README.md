# 🎵 Spicy Player

A beautiful frosted glass Spotify player with community-contributed TTML lyrics from [spicylyrics.org](https://spicylyrics.org).

## One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Ryan-Gamin/spicy-player)

Just hit the button above, deploy to Vercel, then open your site — it will walk you through the setup.

## First-Time Setup Flow

When you first open the site, it guides you through 3 steps:

1. **Create a Spotify app** at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. **Add the Redirect URI** — the app shows you the exact URL to paste (your Vercel domain, auto-detected)
3. **Paste your Client ID** — saved in your browser, no server needed

That's it. Everything is stored locally — no environment variables, no backend.

## Features
- 🎨 Frosted glass UI with dynamic album art background
- 🎤 Synced karaoke lyrics (word-level when available)
- 👥 Community TTML lyrics from `public.storage.spicylyrics.org`
- ⏯ Playback controls (play/pause, skip, seek)
- 📱 Responsive layout
- 🔄 Works on any domain — Vercel, localhost, custom domain

## Local Dev

```bash
git clone https://github.com/Ryan-Gamin/spicy-player
cd spicy-player
npm install
npm run dev
# Open http://localhost:3000 and go through the setup flow
```

No `.env` files needed.
