/**
 * Client-side Google auth using Google Identity Services (GIS) token model.
 * No client secret, no backend — the user supplies their own OAuth Client ID.
 * Access tokens live in memory only (~1h) and are silently refreshed.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client'

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
]

type TokenClient = {
  callback: (resp: TokenResponse) => void
  error_callback?: (err: { type?: string; message?: string }) => void
  requestAccessToken: (opts?: { prompt?: string }) => void
}
interface TokenResponse {
  access_token?: string
  expires_in?: number
  scope?: string
  error?: string
  error_description?: string
}
interface GoogleGlobal {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string
        scope: string
        callback: (resp: TokenResponse) => void
        error_callback?: (err: unknown) => void
      }) => TokenClient
      revoke: (token: string, done: () => void) => void
    }
  }
}

declare global {
  interface Window {
    google?: GoogleGlobal
  }
}

let gisReady: Promise<void> | null = null
function loadGis(): Promise<void> {
  if (gisReady) return gisReady
  gisReady = new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve()
    const s = document.createElement('script')
    s.src = GIS_SRC
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    s.onerror = () => {
      gisReady = null
      reject(new Error('Could not load Google sign-in script (network or blocker).'))
    }
    document.head.appendChild(s)
  })
  return gisReady
}

interface Token {
  accessToken: string
  expiry: number
  scopes: string[]
}

let tokenClient: TokenClient | null = null
let clientIdInUse: string | null = null
let token: Token | null = null

export async function initGoogle(clientId: string): Promise<void> {
  if (!clientId) throw new Error('Missing Google Client ID')
  await loadGis()
  if (tokenClient && clientIdInUse === clientId) return
  clientIdInUse = clientId
  tokenClient = window.google!.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: GOOGLE_SCOPES.join(' '),
    callback: () => {},
  })
}

function requestToken(prompt: '' | 'consent' | 'select_account'): Promise<Token> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject(new Error('Google not initialised'))
    tokenClient.callback = (resp) => {
      if (resp.error || !resp.access_token) {
        return reject(new Error(resp.error_description || resp.error || 'Authorisation failed'))
      }
      token = {
        accessToken: resp.access_token,
        expiry: Date.now() + (resp.expires_in ?? 3600) * 1000 - 90_000,
        scopes: (resp.scope ?? '').split(' ').filter(Boolean),
      }
      resolve(token)
    }
    tokenClient.error_callback = (err) => reject(new Error(err.message || err.type || 'Popup closed'))
    tokenClient.requestAccessToken({ prompt })
  })
}

/** Interactive: shows the Google consent / account chooser. Must run from a click. */
export function connectGoogle(): Promise<Token> {
  return requestToken('consent')
}

/** Non-interactive refresh; rejects if the user must re-consent. */
export async function getAccessToken(): Promise<string> {
  if (token && token.expiry > Date.now()) return token.accessToken
  const t = await requestToken('')
  return t.accessToken
}

export function currentScopes(): string[] {
  return token?.scopes ?? []
}

export async function gfetch(url: string, init?: RequestInit): Promise<Response> {
  let accessToken = await getAccessToken()
  let res = await fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${accessToken}` },
  })
  if (res.status === 401) {
    token = null
    accessToken = await getAccessToken()
    res = await fetch(url, {
      ...init,
      headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${accessToken}` },
    })
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Google API ${res.status}${body ? ` — ${body.slice(0, 200)}` : ''}`)
  }
  return res
}

export async function fetchProfile(): Promise<{ email: string; name?: string; picture?: string }> {
  const res = await gfetch('https://www.googleapis.com/oauth2/v3/userinfo')
  const j = (await res.json()) as { email: string; name?: string; picture?: string }
  return { email: j.email, name: j.name, picture: j.picture }
}

export function forgetToken() {
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token.accessToken, () => {})
  }
  token = null
}
