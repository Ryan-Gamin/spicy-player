// Client ID and redirect URI come from localStorage (set during setup)
export function getClientId(): string | null {
  return localStorage.getItem('spotify_client_id')
}

export function getRedirectUri(): string {
  // Always use the current origin so it works on any domain (Vercel, localhost, etc.)
  return `${window.location.origin}/callback`
}

export function saveClientId(clientId: string) {
  localStorage.setItem('spotify_client_id', clientId)
}

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
  const clientId = getClientId()
  if (!clientId) throw new Error('No client ID configured')

  const redirectUri = getRedirectUri()
  const verifier = generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  localStorage.setItem('pkce_verifier', verifier)

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
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
  const clientId = getClientId()
  if (!code || !verifier || !clientId) return null

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: getRedirectUri(),
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
