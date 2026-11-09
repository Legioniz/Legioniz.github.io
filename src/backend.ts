/**
 * Thin, dependency-free Supabase client for the static portfolio.
 * Only the anon/publishable key is exposed to the browser. Authorization is
 * enforced by PostgreSQL RLS and Edge Functions, never by this client.
 */
type EnvBag = Record<string, string | undefined>
const env = (import.meta as ImportMeta & { env?: EnvBag }).env ?? {}

const rawUrl = env.VITE_SUPABASE_URL?.trim() ?? ''
const publicKey = env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
const configuredUrl = (() => {
  try {
    const parsed = new URL(rawUrl)
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.origin : ''
  } catch { return '' }
})()

export const backendConfig = {
  url: configuredUrl,
  anonKey: publicKey,
  turnstileSiteKey: env.VITE_TURNSTILE_SITE_KEY?.trim() ?? '',
  configured: Boolean(configuredUrl && publicKey),
}

export type PortfolioInquiry = {
  id: string
  name: string
  email: string
  subject: string
  message: string
  status: 'new' | 'in_progress' | 'resolved' | 'archived'
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export type PortfolioComment = {
  id: string
  display_name: string
  body: string
  status: 'pending' | 'approved' | 'hidden' | 'archived'
  created_at: string
  updated_at: string
}

export type AdminActivity = {
  id: string
  actor_id: string
  action: string
  record_type: string
  record_id: string | null
  summary: string
  created_at: string
}

export type AdminSession = {
  access_token: string
  refresh_token: string
  expires_at: number
  user: { id: string; email?: string }
}

class BackendError extends Error {
  status?: number
  constructor(message: string, status?: number) {
    super(message)
    this.name = 'BackendError'
    this.status = status
  }
}

function requireBackend() {
  if (!backendConfig.configured) throw new BackendError('The portfolio backend is not configured yet.')
}

async function request<T>(path: string, options: RequestInit = {}, accessToken?: string): Promise<T> {
  requireBackend()
  const headers = new Headers(options.headers)
  headers.set('apikey', backendConfig.anonKey)
  // Publishable API keys are not JWTs. Anonymous calls use only the apikey header;
  // authenticated admin calls attach the real Supabase Auth access token.
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  else headers.delete('Authorization')
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const response = await fetch(`${backendConfig.url}${path}`, { ...options, headers, cache: options.cache ?? 'no-store' })
  const raw = await response.text()
  let payload: unknown = null
  if (raw) {
    try { payload = JSON.parse(raw) } catch { payload = raw }
  }
  if (!response.ok) {
    const detail = typeof payload === 'object' && payload !== null
      ? payload as Record<string, unknown>
      : null
    const detailMessage = detail
      ? [detail.message, detail.msg, detail.error_description].find(
        (value): value is string => typeof value === 'string' && value.trim().length > 0,
      )
      : null
    const message = detail?.error_code === 'over_email_send_rate_limit'
      ? 'The Supabase authentication email limit for this project has been reached. Please wait before requesting another link or ask the site owner to configure custom SMTP.'
      : detailMessage || (typeof payload === 'string' ? payload : `Request failed (${response.status})`)
    throw new BackendError(message, response.status)
  }
  return payload as T
}

export async function submitPublicRecord(kind: 'inquiry' | 'comment' | 'page_view', payload: Record<string, unknown>) {
  requireBackend()
  const result = await request<{ ok: boolean; message?: string }>('/functions/v1/portfolio-submit', {
    method: 'POST',
    body: JSON.stringify({ kind, ...payload }),
  })
  if (result?.ok !== true) {
    throw new BackendError(result?.message || 'The submission service did not confirm that the record was saved.')
  }
  return result
}

export async function fetchApprovedComments(): Promise<PortfolioComment[]> {
  if (!backendConfig.configured) return []
  return request<PortfolioComment[]>('/rest/v1/comments?select=id,display_name,body,status,created_at,updated_at&status=eq.approved&order=created_at.desc&limit=30')
}

const ADMIN_PASSWORD_RECOVERY_REDIRECT = 'https://legioniz.github.io/?auth=recovery'

export async function requestAdminPasswordRecovery(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) throw new BackendError('Enter the administrator email address first.')
  await request<unknown>(`/auth/v1/recover?redirect_to=${encodeURIComponent(ADMIN_PASSWORD_RECOVERY_REDIRECT)}`, {
    method: 'POST',
    body: JSON.stringify({ email: normalizedEmail }),
  })
}

export async function updateAdminPassword(accessToken: string, password: string): Promise<void> {
  if (!accessToken) throw new BackendError('The password-reset session is missing. Request a fresh recovery email.')
  if (password.length < 8) throw new BackendError('Choose a password with at least 8 characters.')
  await request<unknown>('/auth/v1/user', {
    method: 'PUT',
    body: JSON.stringify({ password }),
  }, accessToken)
}

export async function signInAdmin(email: string, password: string): Promise<AdminSession> {
  const payload = await request<{
    access_token: string; refresh_token: string; expires_in: number;
    user: { id: string; email?: string }
  }>('/auth/v1/token?grant_type=password', {
    method: 'POST', body: JSON.stringify({ email, password }),
  })
  const session: AdminSession = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: Date.now() + payload.expires_in * 1000,
    user: payload.user,
  }
  await verifyAdmin(session)
  return session
}

export async function refreshAdminSession(session: AdminSession): Promise<AdminSession> {
  const payload = await request<{
    access_token: string; refresh_token: string; expires_in: number;
    user: { id: string; email?: string }
  }>('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }),
  })
  const next: AdminSession = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_at: Date.now() + payload.expires_in * 1000,
    user: payload.user,
  }
  await verifyAdmin(next)
  return next
}

export async function verifyAdmin(session: AdminSession): Promise<void> {
  const rows = await request<Array<{ user_id: string }>>(
    `/rest/v1/admin_users?select=user_id&user_id=eq.${encodeURIComponent(session.user.id)}&limit=1`,
    {}, session.access_token,
  )
  if (!rows.length || rows[0]?.user_id !== session.user.id) {
    throw new BackendError('This account is not on the portfolio administrator allowlist.', 403)
  }
}

export async function getAdminInquiries(session: AdminSession) {
  return request<PortfolioInquiry[]>('/rest/v1/inquiries?select=*&order=created_at.desc&limit=250', {}, session.access_token)
}

export async function updateAdminInquiry(session: AdminSession, id: string, patch: Partial<Pick<PortfolioInquiry, 'name' | 'email' | 'subject' | 'message' | 'status' | 'admin_notes'>>) {
  return request<PortfolioInquiry[]>(`/rest/v1/inquiries?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch),
  }, session.access_token)
}

export async function deleteAdminInquiry(session: AdminSession, id: string) {
  return request<null>(`/rest/v1/inquiries?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }, session.access_token)
}

export async function getAdminComments(session: AdminSession) {
  return request<PortfolioComment[]>('/rest/v1/comments?select=*&order=created_at.desc&limit=250', {}, session.access_token)
}

export async function updateAdminComment(session: AdminSession, id: string, patch: Partial<Pick<PortfolioComment, 'display_name' | 'body' | 'status'>>) {
  return request<PortfolioComment[]>(`/rest/v1/comments?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch),
  }, session.access_token)
}

export async function deleteAdminComment(session: AdminSession, id: string) {
  return request<null>(`/rest/v1/comments?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' }, session.access_token)
}

export async function getAdminActivity(session: AdminSession) {
  return request<AdminActivity[]>('/rest/v1/admin_activity?select=*&order=created_at.desc&limit=100', {}, session.access_token)
}

export async function getAnalyticsSummary(session: AdminSession) {
  const rows = await request<Array<{ path: string; viewed_at: string; session_id: string }>>(
    '/rest/v1/page_views?select=path,viewed_at,session_id&order=viewed_at.desc&limit=1000', {}, session.access_token,
  )
  const uniqueSessions = new Set(rows.map((item) => item.session_id)).size
  const pathCounts = rows.reduce<Record<string, number>>((result, item) => {
    result[item.path] = (result[item.path] ?? 0) + 1
    return result
  }, {})
  return { views: rows.length, uniqueSessions, pathCounts }
}

export function exportRecords(filename: string, rows: unknown[]) {
  const content = JSON.stringify(rows, null, 2)
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1200)
}

export function readStoredAdminSession(): AdminSession | null {
  try {
    const raw = sessionStorage.getItem('legion-portfolio-admin-session-v1')
    if (!raw) return null
    const parsed = JSON.parse(raw) as AdminSession
    if (!parsed?.access_token || !parsed?.refresh_token || !parsed?.user?.id) return null
    return parsed
  } catch { return null }
}

export function storeAdminSession(session: AdminSession | null) {
  try {
    if (session) sessionStorage.setItem('legion-portfolio-admin-session-v1', JSON.stringify(session))
    else sessionStorage.removeItem('legion-portfolio-admin-session-v1')
  } catch { /* Private browsing may restrict session storage. */ }
}
