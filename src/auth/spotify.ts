const CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string
const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI as string
const SCOPES = 'user-read-currently-playing user-read-playback-state user-modify-playback-state'

function generateCodeVerifier(length = 128): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  let result = ''
  const randomValues = crypto.getRandomValues(new Uint8Array(length))
  for (const v of randomValues) result += chars[v % chars.length]
  return result
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function redirectToAuth() {
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  localStorage.setItem('pkce_verifier', verifier)

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })

  window.location.href = `https://accounts.spotify.com/authorize?${params}`
}

export async function handleCallback(): Promise<string | null> {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const verifier = localStorage.getItem('pkce_verifier')
  if (!code || !verifier) return null

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  })

  const data = await res.json()
  if (data.access_token) {
    localStorage.setItem('spotify_token', data.access_token)
    localStorage.setItem('spotify_token_expiry', String(Date.now() + data.expires_in * 1000))
    if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token)
    return data.access_token
  }
  return null
}

export function getAccessToken(): string | null {
  const token = localStorage.getItem('spotify_token')
  const expiry = localStorage.getItem('spotify_token_expiry')
  if (!token || !expiry) return null
  if (Date.now() > Number(expiry)) {
    localStorage.removeItem('spotify_token')
    return null
  }
  return token
}
