# 🎵 Spicy Player

A beautiful frosted glass Spotify player with community-contributed TTML lyrics from [spicylyrics.org](https://spicylyrics.org).

## Features
- 🎨 Frosted glass UI with dynamic album art background
- 🎤 Synced karaoke lyrics (word-level when available)
- 👥 Community TTML lyrics from `public.storage.spicylyrics.org`
- ⏯ Playback controls (play/pause, skip, seek)
- 📱 Responsive layout

## Setup

### 1. Spotify Developer App
1. Go to [developer.spotify.com](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://localhost:3000/callback` to Redirect URIs
4. Copy your **Client ID**

### 2. Environment
```bash
cp .env.example .env
# Add your VITE_SPOTIFY_CLIENT_ID to .env
```

### 3. Run
```bash
npm install
npm run dev
```

## Deploy to Vercel
1. Push to GitHub
2. Import in Vercel
3. Add `VITE_SPOTIFY_CLIENT_ID` and `VITE_REDIRECT_URI` as env vars
4. Update Redirect URI in Spotify dashboard to your Vercel URL
