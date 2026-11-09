import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { siteConfig } from './config'
import {
  backendConfig, deleteAdminComment, deleteAdminInquiry, exportRecords,
  fetchApprovedComments, getAdminActivity, getAdminComments, getAdminInquiries,
  getAnalyticsSummary, readStoredAdminSession, refreshAdminSession, signInAdmin,
  storeAdminSession, submitPublicRecord, updateAdminComment, updateAdminInquiry,
} from './backend'
import type { AdminActivity, AdminSession, PortfolioComment, PortfolioInquiry } from './backend'

type TurnstileAPI = {
  render: (element: HTMLElement, options: {
    sitekey: string
    callback: (token: string) => void
    'expired-callback'?: () => void
    'error-callback'?: () => void
    theme?: 'light' | 'dark' | 'auto'
  }) => string
  reset: (widgetId?: string) => void
  remove?: (widgetId?: string) => void
}

declare global { interface Window { turnstile?: TurnstileAPI } }

function TurnstileChallenge({ onToken, resetSignal }: { onToken: (token: string) => void; resetSignal: number }) {
  const [error, setError] = useState('')
  const elementId = useId().replace(/:/g, '')
  const widgetIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!backendConfig.turnstileSiteKey) return
    let cancelled = false
    let script: HTMLScriptElement | null = null
    const mount = () => {
      const container = document.getElementById(elementId)
      if (cancelled || !window.turnstile || !container || container.dataset.widgetMounted === 'yes') return
      try {
        container.dataset.widgetMounted = 'yes'
        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: backendConfig.turnstileSiteKey,
          theme: document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
          callback: onToken,
          'expired-callback': () => onToken(''),
          'error-callback': () => { onToken(''); setError('Verification could not be completed. Please retry.') },
        })
      } catch {
        container.dataset.widgetMounted = 'no'
        setError('Verification could not start. Please reload and try again.')
      }
    }
    const onError = () => { if (!cancelled) setError('Verification could not load. Check your content blocker or try again later.') }
    script = document.querySelector<HTMLScriptElement>('script[data-portfolio-turnstile]') ?? document.createElement('script')
    script.addEventListener('load', mount, { once: true })
    script.addEventListener('error', onError, { once: true })
    if (window.turnstile) mount()
    else if (!script.dataset.portfolioTurnstile) {
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
      script.dataset.portfolioTurnstile = 'yes'
      document.head.append(script)
    }
    return () => {
      cancelled = true
      script?.removeEventListener('load', mount)
      script?.removeEventListener('error', onError)
      if (widgetIdRef.current) {
        try { window.turnstile?.remove?.(widgetIdRef.current) } catch { /* Widget cleanup is best-effort. */ }
        widgetIdRef.current = null
      }
    }
  }, [elementId, onToken])

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current) {
      try { window.turnstile?.reset(widgetIdRef.current) } catch { /* Expired challenges can be retried manually. */ }
    }
  }, [resetSignal])

  if (!backendConfig.turnstileSiteKey) return null
  return <div className="turnstile-wrap"><div id={elementId}/><small>{error || 'Protected submission verification.'}</small></div>
}

export function InquiryAndComments() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [captcha, setCaptcha] = useState('')
  const [captchaReset, setCaptchaReset] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [formStatus, setFormStatus] = useState('')
  const [commentName, setCommentName] = useState('')
  const [commentBody, setCommentBody] = useState('')
  const [commentStatus, setCommentStatus] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [commentCaptcha, setCommentCaptcha] = useState('')
  const [commentCaptchaReset, setCommentCaptchaReset] = useState(0)
  const [commentHoneypot, setCommentHoneypot] = useState('')
  const [comments, setComments] = useState<PortfolioComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(backendConfig.configured)
  const [commentsError, setCommentsError] = useState('')
  const commentsRequestInFlight = useRef(false)

  const refreshComments = useCallback(async (silent = false) => {
    if (!backendConfig.configured) {
      setComments([])
      setCommentsLoading(false)
      return
    }
    // Prevent overlapping refresh, focus, and polling requests from racing.
    if (commentsRequestInFlight.current) return
    commentsRequestInFlight.current = true
    if (!silent) setCommentsLoading(true)
    setCommentsError('')
    try {
      setComments(await fetchApprovedComments())
    } catch (error) {
      setCommentsError(error instanceof Error ? error.message : 'The public notes could not be loaded.')
    } finally {
      commentsRequestInFlight.current = false
      if (!silent) setCommentsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshComments()
    if (!backendConfig.configured) return

    // Keep the moderated feed current without requiring visitors to press Refresh.
    // Refresh on tab return and every 30 seconds while the page is visible.
    const refreshWhenVisible = () => {
      if (!document.hidden) void refreshComments(true)
    }
    const intervalId = window.setInterval(refreshWhenVisible, 30_000)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [refreshComments])

  async function handleInquiry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return
    if (!name.trim() || !email.trim() || !subject.trim() || message.trim().length < 10) {
      setFormStatus('Please complete every field. Your message needs at least 10 characters.')
      return
    }
    setSubmitting(true)
    setFormStatus('')
    try {
      if (!backendConfig.configured) {
        const mailSubject = encodeURIComponent(subject.trim())
        const mailBody = encodeURIComponent(`Name: ${name.trim()}\nEmail: ${email.trim()}\n\n${message.trim()}`)
        window.location.href = `mailto:${siteConfig.email}?subject=${mailSubject}&body=${mailBody}`
        setFormStatus('Your email app should open with the message prefilled. Persistent inquiry storage is not configured yet.')
      } else {
        await submitPublicRecord('inquiry', {
          name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim(),
          website: honeypot, turnstileToken: captcha,
        })
        setName(''); setEmail(''); setSubject(''); setMessage(''); setHoneypot(''); setCaptcha('')
        setFormStatus('Message received. It is stored privately for review. Thank you.')
      }
    } catch (error) {
      setFormStatus(error instanceof Error ? error.message : 'The message could not be sent. Please use the email link instead.')
    } finally {
      if (backendConfig.configured && backendConfig.turnstileSiteKey) { setCaptcha(''); setCaptchaReset((value) => value + 1) }
      setSubmitting(false)
    }
  }

  async function handleComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!backendConfig.configured) {
      setCommentStatus('Public comments are unavailable until the moderation backend is configured.')
      return
    }
    if (commentSubmitting || !commentName.trim() || commentBody.trim().length < 3) return
    setCommentSubmitting(true)
    setCommentStatus('')
    try {
      await submitPublicRecord('comment', { display_name: commentName.trim(), body: commentBody.trim(), website: commentHoneypot, turnstileToken: commentCaptcha })
      setCommentName(''); setCommentBody(''); setCommentHoneypot(''); setCommentCaptcha('')
      setCommentStatus('Your note is in the moderation queue. It will appear publicly after approval.')
    } catch (error) {
      setCommentStatus(error instanceof Error ? error.message : 'The comment could not be submitted.')
    } finally {
      if (backendConfig.configured && backendConfig.turnstileSiteKey) { setCommentCaptcha(''); setCommentCaptchaReset((value) => value + 1) }
      setCommentSubmitting(false)
    }
  }

  const captchaTokenHandler = useCallback((token: string) => setCaptcha(token), [])
  return (
    <div className="inquiry-suite" data-reveal>
      <div className="inquiry-main">
        <div className="feature-eyebrow"><span>DIRECT INQUIRY</span><i/> PRIVATE MESSAGE</div>
        <h3>Start with a <em>clear brief.</em></h3>
        <p className="inquiry-intro">For internships, entry-level opportunities, project collaborations, or a question about a build. Your message is not shown publicly.</p>
        <form className="inquiry-form" onSubmit={handleInquiry}>
          <label>YOUR NAME<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" maxLength={100} required placeholder="Name"/></label>
          <label>EMAIL ADDRESS<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" maxLength={254} required placeholder="you@example.com"/></label>
          <label className="inquiry-full">SUBJECT<input value={subject} onChange={(event) => setSubject(event.target.value)} maxLength={140} required placeholder="What would you like to discuss?"/></label>
          <label className="inquiry-full">MESSAGE<textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} minLength={10} maxLength={5000} required placeholder="Give a little context, goal, and any useful details."/></label>
          <label className="honeypot-field" aria-hidden="true">Leave this field empty<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)}/></label>
          <div className="inquiry-submit-row inquiry-full"><TurnstileChallenge onToken={captchaTokenHandler} resetSignal={captchaReset}/><button className="feature-button" type="submit" disabled={submitting}>{submitting ? 'SENDING…' : backendConfig.configured ? 'SEND PRIVATE INQUIRY ↗' : 'OPEN PREFILLED EMAIL ↗'}</button></div>
          {formStatus && <p className="form-status inquiry-full" role="status">{formStatus}</p>}
        </form>
        <p className="privacy-microcopy">{backendConfig.configured ? 'Stored privately and visible only to the approved site administrator.' : 'Backend not configured: this form opens your email application as a fallback. No message is stored by the website.'}</p>
      </div>
      <aside className="comments-panel" aria-labelledby="comments-title">
        <header className="comments-heading">
          <div className="feature-eyebrow"><span>PUBLIC NOTES</span><i/><span className="comments-moderated">MODERATED FEED</span></div>
          <div className="comments-title-row">
            <h3 id="comments-title">Leave a <em>thought.</em></h3>
            <span className="comments-count"><b>{String(comments.length).padStart(2, '0')}</b><small>PUBLISHED</small></span>
          </div>
          <p>Comments are reviewed before publication. No email address or contact details are requested for public notes.</p>
        </header>

        <section className="comments-feed" aria-label="Approved public notes" aria-live="polite" aria-busy={commentsLoading}>
          <div className="comments-feed-toolbar">
            <span><i className="comments-live-dot"/> COMMUNITY NOTES / {String(comments.length).padStart(2, '0')} <small>· AUTO-REFRESH 30S</small></span>
            <button type="button" onClick={() => void refreshComments()} disabled={!backendConfig.configured || commentsLoading} aria-label="Refresh public notes">
              {commentsLoading ? 'LOADING…' : '↻ REFRESH'}
            </button>
          </div>
          {!backendConfig.configured ? (
            <div className="comments-empty comments-system-state">
              <span className="comments-state-code">BACKEND / OFFLINE</span>
              <strong>Public notes are not connected yet.</strong>
              <p>Once the Supabase project and submission function are configured, approved notes will appear here. Submissions are not stored in this preview.</p>
            </div>
          ) : commentsLoading ? (
            <div className="comments-loading" role="status" aria-label="Loading approved public notes">
              <span/><span/><span/>
            </div>
          ) : commentsError && comments.length === 0 ? (
            <div className="comments-empty comments-system-state" role="status">
              <strong>Could not load public notes.</strong>
              <p>{commentsError}</p>
              <button type="button" onClick={() => void refreshComments()}>TRY AGAIN ↗</button>
            </div>
          ) : comments.length ? (
            <div className="approved-comments">
              {comments.map((comment) => (
                <article className="approved-comment" key={comment.id}>
                  <span className="comment-quote-mark" aria-hidden="true">“</span>
                  <p>{comment.body}</p>
                  <footer><strong>{comment.display_name}</strong><time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</time></footer>
                </article>
              ))}
            </div>
          ) : (
            <div className="comments-empty comments-system-state">
              <span className="comments-state-code">NO PUBLIC NOTES / YET</span>
              <strong>The board is quiet.</strong>
              <p>Be the first to leave a note. It will join the feed after a quick moderation review.</p>
            </div>
          )}
        </section>

        <section className="comment-composer" aria-label="Write a public note">
          <div className="comment-composer-heading">
            <span>ADD TO THE CONVERSATION</span>
            <small>PUBLIC AFTER APPROVAL</small>
          </div>
          <form className="comment-form" onSubmit={handleComment}>
            <label htmlFor="public-note-name">DISPLAY NAME<input id="public-note-name" value={commentName} onChange={(event) => setCommentName(event.target.value)} maxLength={60} autoComplete="nickname" required placeholder="How should this appear?" disabled={!backendConfig.configured}/></label>
            <label htmlFor="public-note-body">YOUR COMMENT<textarea id="public-note-body" value={commentBody} onChange={(event) => setCommentBody(event.target.value)} rows={4} minLength={3} maxLength={1000} required placeholder="Share a short, constructive note…" disabled={!backendConfig.configured}/></label>
            <div className="comment-compose-meta"><span>NO CONTACT DETAILS REQUIRED</span><small>{commentBody.length.toLocaleString()} / 1,000</small></div>
            <label className="honeypot-field" aria-hidden="true">Leave this field empty<input tabIndex={-1} autoComplete="off" value={commentHoneypot} onChange={(event) => setCommentHoneypot(event.target.value)}/></label>
            <TurnstileChallenge onToken={setCommentCaptcha} resetSignal={commentCaptchaReset}/>
            <button className="feature-button feature-button-quiet comment-submit" type="submit" disabled={!backendConfig.configured || commentSubmitting || !commentName.trim() || commentBody.trim().length < 3}>
              {commentSubmitting ? 'SENDING TO MODERATION…' : 'SUBMIT FOR REVIEW ↗'}
            </button>
            {commentStatus && <p className="form-status comment-form-status" role="status">{commentStatus}</p>}
            {!backendConfig.configured && <p className="comment-disabled-note">The form becomes active when the public moderation backend is configured.</p>}
          </form>
        </section>
      </aside>
    </div>
  )
}

export function PrivacyNotice() {
  const [choice, setChoice] = useState<'accepted' | 'declined' | null>(() => {
    try {
      const saved = localStorage.getItem('legion-portfolio-analytics-consent-v1')
      return saved === 'accepted' ? 'accepted' : saved === 'declined' ? 'declined' : null
    } catch { return null }
  })
  const [showSettings, setShowSettings] = useState(false)
  const [trackingStatus, setTrackingStatus] = useState('')
  const trackedRef = useRef(false)

  useEffect(() => {
    if (choice !== 'accepted' || !backendConfig.configured || trackedRef.current) return
    trackedRef.current = true
    void (async () => {
      try {
        let sessionId = ''
        try {
          sessionId = sessionStorage.getItem('legion-portfolio-analytics-session-v1') ?? ''
          if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem('legion-portfolio-analytics-session-v1', sessionId) }
        } catch { sessionId = crypto.randomUUID() }
        await submitPublicRecord('page_view', { path: window.location.pathname, session_id: sessionId })
        setTrackingStatus('Anonymous page-view counting is enabled for this session.')
      } catch { setTrackingStatus('Consent saved, but analytics is unavailable right now.') }
    })()
  }, [choice])

  function choose(next: 'accepted' | 'declined') {
    setChoice(next)
    trackedRef.current = false
    try { localStorage.setItem('legion-portfolio-analytics-consent-v1', next) } catch { /* Privacy preference remains session-local. */ }
    setShowSettings(false)
  }

  if (!backendConfig.configured) return null
  if (choice !== null && !showSettings) return <button className="privacy-settings-reopen" onClick={() => setShowSettings(true)}>PRIVACY SETTINGS</button>
  return <aside className="privacy-notice" aria-label="Privacy settings"><div><span>PRIVACY / ANALYTICS</span><p>Analytics are off by default. Optional analytics store only a random session ID, page path, and timestamp—no IP address, fingerprint, or precise location.</p>{trackingStatus && <small>{trackingStatus}</small>}</div><div className="privacy-actions"><button onClick={() => choose('declined')}>KEEP OFF</button><button onClick={() => choose('accepted')}>ALLOW ANONYMOUS COUNTS</button><button className="privacy-close" onClick={() => setShowSettings(false)} aria-label="Close privacy settings">×</button></div></aside>
}

export function AdminPortal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<'inquiries' | 'comments' | 'analytics' | 'activity'>('inquiries')
  const [inquiries, setInquiries] = useState<PortfolioInquiry[]>([])
  const [comments, setComments] = useState<PortfolioComment[]>([])
  const [activity, setActivity] = useState<AdminActivity[]>([])
  const [analytics, setAnalytics] = useState<{ views: number; uniqueSessions: number; pathCounts: Record<string, number> } | null>(null)
  const [editInquiryId, setEditInquiryId] = useState<string | null>(null)
  const [inquiryDraft, setInquiryDraft] = useState<Partial<PortfolioInquiry>>({})
  const [editCommentId, setEditCommentId] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState<Partial<PortfolioComment>>({})
  const [commentFilter, setCommentFilter] = useState<'all' | PortfolioComment['status']>('pending')
  const [commentSearch, setCommentSearch] = useState('')
  const [dashboardError, setDashboardError] = useState('')
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFirst = () => {
      const panel = dialogRef.current
      if (!panel) return
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.getClientRects().length > 0)
      ;(focusable[0] ?? panel).focus()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.getClientRects().length > 0)
      if (!focusable.length) { event.preventDefault(); dialogRef.current.focus(); return }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    const frame = window.requestAnimationFrame(focusFirst)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus()
    }
  }, [open])

  async function loadDashboard(nextSession: AdminSession) {
    setBusy(true)
    setDashboardError('')
    try {
      const [nextInquiries, nextComments, nextActivity, nextAnalytics] = await Promise.all([
        getAdminInquiries(nextSession), getAdminComments(nextSession), getAdminActivity(nextSession), getAnalyticsSummary(nextSession),
      ])
      setSession(nextSession); storeAdminSession(nextSession)
      setInquiries(nextInquiries); setComments(nextComments); setActivity(nextActivity); setAnalytics(nextAnalytics)
    } catch (error) {
      if (error instanceof Error && /JWT|token|expired/i.test(error.message)) {
        try {
          const refreshed = await refreshAdminSession(nextSession)
          setSession(refreshed); storeAdminSession(refreshed)
          const [nextInquiries, nextComments, nextActivity, nextAnalytics] = await Promise.all([
            getAdminInquiries(refreshed), getAdminComments(refreshed), getAdminActivity(refreshed), getAnalyticsSummary(refreshed),
          ])
          setInquiries(nextInquiries); setComments(nextComments); setActivity(nextActivity); setAnalytics(nextAnalytics)
        } catch (refreshError) { storeAdminSession(null); setSession(null); setDashboardError(refreshError instanceof Error ? refreshError.message : 'Your administrator session expired.') }
      } else setDashboardError(error instanceof Error ? error.message : 'The dashboard data could not be loaded.')
    } finally { setBusy(false) }
  }

  useEffect(() => {
    if (!open || !backendConfig.configured) return
    const stored = readStoredAdminSession()
    if (stored) void loadDashboard(stored)
    // Load only when the admin panel is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setLoginError('')
    try {
      const nextSession = await signInAdmin(email.trim(), password)
      setPassword('')
      await loadDashboard(nextSession)
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Sign-in failed. Check the account and backend configuration.')
    } finally { setBusy(false) }
  }

  async function refresh() { if (session) await loadDashboard(session) }
  async function updateInquiry(id: string, patch: Partial<PortfolioInquiry>) {
    if (!session) return
    try { await updateAdminInquiry(session, id, patch); setEditInquiryId(null); setInquiryDraft({}); await refresh() }
    catch (error) { setDashboardError(error instanceof Error ? error.message : 'Inquiry update failed.') }
  }
  async function removeInquiry(id: string) {
    if (!session || !window.confirm('Permanently delete this inquiry? This cannot be undone.')) return
    try { await deleteAdminInquiry(session, id); await refresh() }
    catch (error) { setDashboardError(error instanceof Error ? error.message : 'Inquiry deletion failed.') }
  }
  async function updateComment(id: string, patch: Partial<PortfolioComment>) {
    if (!session) return
    try { await updateAdminComment(session, id, patch); setEditCommentId(null); setCommentDraft({}); await refresh() }
    catch (error) { setDashboardError(error instanceof Error ? error.message : 'Comment update failed.') }
  }
  async function removeComment(id: string) {
    if (!session || !window.confirm('Permanently delete this comment? This cannot be undone.')) return
    try { await deleteAdminComment(session, id); await refresh() }
    catch (error) { setDashboardError(error instanceof Error ? error.message : 'Comment deletion failed.') }
  }

  if (!open) return null
  const newInquiryCount = inquiries.filter((item) => item.status === 'new').length
  const pendingCommentCount = comments.filter((item) => item.status === 'pending').length
  const commentFilters = ['pending', 'approved', 'hidden', 'archived', 'all'] as const
  const normalizedCommentSearch = commentSearch.trim().toLocaleLowerCase()
  const visibleComments = comments.filter((item) => {
    const matchesStatus = commentFilter === 'all' || item.status === commentFilter
    const matchesSearch = !normalizedCommentSearch || [item.display_name, item.body].some((value) => value.toLocaleLowerCase().includes(normalizedCommentSearch))
    return matchesStatus && matchesSearch
  })
  return (
    <div className="admin-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="admin-panel" role="dialog" aria-modal="true" aria-labelledby="admin-title" tabIndex={-1}>
        <header className="admin-head"><div><span className="feature-code">OWNER CONSOLE / PRIVATE</span><h2 id="admin-title">Portfolio <em>control room.</em></h2></div><button className="feature-close" onClick={onClose} aria-label="Close admin panel">×</button></header>
        {!backendConfig.configured ? <div className="admin-unconfigured"><strong>Backend connection required.</strong><p>No administrator mode is enabled in this build. Configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, apply the SQL schema, deploy the Edge Function, and add the owner’s Auth user ID to the admin allowlist. The site deliberately does not use a client-side password or fake administrator switch.</p><a href="/BACKEND-SETUP.md" target="_blank" rel="noopener noreferrer">Open backend setup instructions ↗</a></div> : !session ? <form className="admin-login" onSubmit={handleLogin}><p>Sign in with the owner account created in Supabase Auth. Access is checked against the database allowlist and enforced again by Row Level Security.</p><label>ADMIN EMAIL<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required/></label><label>PASSWORD<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required/></label><button className="feature-button" type="submit" disabled={busy}>{busy ? 'VERIFYING…' : 'SIGN IN SECURELY ↗'}</button>{(loginError || dashboardError) && <p className="form-status" role="alert">{loginError || dashboardError}</p>}</form> : <>
          <div className="admin-session-bar"><span>AUTHENTICATED / {session.user.email ?? session.user.id}</span><div><button onClick={() => void refresh()}>REFRESH</button><button onClick={() => { setSession(null); storeAdminSession(null); setInquiries([]); setComments([]); setActivity([]); setAnalytics(null) }}>SIGN OUT</button></div></div>
          <div className="admin-metrics"><span><small>NEW INQUIRIES</small><b>{newInquiryCount}</b></span><span><small>PENDING COMMENTS</small><b>{pendingCommentCount}</b></span><span><small>RECORDED VIEWS</small><b>{analytics?.views ?? '—'}</b></span></div>
          <nav className="admin-tabs" aria-label="Admin data views">{(['inquiries', 'comments', 'analytics', 'activity'] as const).map((item) => <button key={item} className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item.toUpperCase()}</button>)}</nav>
          {busy && <p className="admin-loading">SYNCING PRIVATE RECORDS…</p>}
          {dashboardError && <p className="form-status" role="alert">{dashboardError}</p>}
          {tab === 'inquiries' && <div className="admin-record-list">{inquiries.length ? inquiries.map((item) => <article className="admin-record" key={item.id}><div className="admin-record-top"><span>{new Date(item.created_at).toLocaleString()}</span><select aria-label={`Status for ${item.name}`} value={item.status} onChange={(event) => void updateInquiry(item.id, { status: event.target.value as PortfolioInquiry['status'] })}><option value="new">New</option><option value="in_progress">In progress</option><option value="resolved">Resolved</option><option value="archived">Archived</option></select></div>{editInquiryId === item.id ? <div className="admin-edit-fields"><input value={String(inquiryDraft.name ?? item.name)} onChange={(event) => setInquiryDraft((draft) => ({ ...draft, name: event.target.value }))} aria-label="Edit sender name"/><input value={String(inquiryDraft.email ?? item.email)} onChange={(event) => setInquiryDraft((draft) => ({ ...draft, email: event.target.value }))} aria-label="Edit sender email"/><input value={String(inquiryDraft.subject ?? item.subject)} onChange={(event) => setInquiryDraft((draft) => ({ ...draft, subject: event.target.value }))} aria-label="Edit inquiry subject"/><textarea value={String(inquiryDraft.message ?? item.message)} onChange={(event) => setInquiryDraft((draft) => ({ ...draft, message: event.target.value }))} aria-label="Edit inquiry message"/><textarea value={String(inquiryDraft.admin_notes ?? item.admin_notes ?? '')} onChange={(event) => setInquiryDraft((draft) => ({ ...draft, admin_notes: event.target.value }))} aria-label="Administrator notes" placeholder="Private admin notes"/><div><button onClick={() => void updateInquiry(item.id, inquiryDraft)}>SAVE</button><button onClick={() => { setEditInquiryId(null); setInquiryDraft({}) }}>CANCEL</button></div></div> : <><h3>{item.subject}</h3><p>{item.message}</p><div className="admin-contact-line">{item.name} · <a href={`mailto:${item.email}`}>{item.email}</a></div>{item.admin_notes && <small className="admin-note">PRIVATE NOTE: {item.admin_notes}</small>}<div className="admin-record-actions"><button onClick={() => { setEditInquiryId(item.id); setInquiryDraft({}) }}>EDIT RECORD / NOTES</button><button onClick={() => void removeInquiry(item.id)}>DELETE</button></div></>}</article>) : <div className="admin-empty">No inquiry records.</div>}</div>}
          {tab === 'comments' && <section className="admin-comments-workspace" aria-label="Comment moderation workspace">
            <div className="admin-comment-toolbar">
              <label>SEARCH PUBLIC NOTES<input type="search" value={commentSearch} onChange={(event) => setCommentSearch(event.target.value)} placeholder="Name or comment text…" aria-label="Search public notes"/></label>
              <div className="admin-comment-filters" role="group" aria-label="Filter comments by moderation status">
                {commentFilters.map((filter) => <button type="button" key={filter} className={commentFilter === filter ? 'active' : ''} aria-pressed={commentFilter === filter} onClick={() => setCommentFilter(filter)}>
                  {filter.toUpperCase()} <b>{filter === 'all' ? comments.length : comments.filter((item) => item.status === filter).length}</b>
                </button>)}
              </div>
            </div>
            <div className="admin-record-list">
              {visibleComments.length ? visibleComments.map((item) => <article className="admin-record admin-comment-record" data-status={item.status} key={item.id}>
                <div className="admin-record-top">
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                  <select aria-label={`Moderation status for ${item.display_name}`} value={item.status} onChange={(event) => void updateComment(item.id, { status: event.target.value as PortfolioComment['status'] })}>
                    <option value="pending">Pending review</option><option value="approved">Approved / public</option><option value="hidden">Hidden</option><option value="archived">Archived</option>
                  </select>
                </div>
                {editCommentId === item.id ? <div className="admin-edit-fields">
                  <label>DISPLAY NAME<input maxLength={60} value={String(commentDraft.display_name ?? item.display_name)} onChange={(event) => setCommentDraft((draft) => ({ ...draft, display_name: event.target.value }))} aria-label="Edit display name"/></label>
                  <label>COMMENT TEXT<textarea maxLength={1000} rows={4} value={String(commentDraft.body ?? item.body)} onChange={(event) => setCommentDraft((draft) => ({ ...draft, body: event.target.value }))} aria-label="Edit comment body"/></label>
                  <div><button type="button" onClick={() => void updateComment(item.id, commentDraft)}>SAVE CHANGES</button><button type="button" onClick={() => { setEditCommentId(null); setCommentDraft({}) }}>CANCEL</button></div>
                </div> : <>
                  <h3>{item.display_name}</h3><p>{item.body}</p>
                  <div className="admin-comment-status-line"><span>{item.status === 'pending' ? 'AWAITING REVIEW' : item.status === 'approved' ? 'VISIBLE ON PUBLIC SITE' : item.status === 'hidden' ? 'HIDDEN FROM PUBLIC' : 'ARCHIVED'}</span><span>{item.body.length.toLocaleString()} / 1,000 CHARACTERS</span></div>
                  <div className="admin-record-actions">
                    <button type="button" onClick={() => { setEditCommentId(item.id); setCommentDraft({}) }}>EDIT</button>
                    {item.status !== 'approved' && <button type="button" onClick={() => void updateComment(item.id, { status: 'approved' })}>APPROVE / PUBLISH</button>}
                    {item.status === 'approved' && <button type="button" onClick={() => void updateComment(item.id, { status: 'hidden' })}>HIDE</button>}
                    {item.status !== 'archived' && <button type="button" onClick={() => void updateComment(item.id, { status: 'archived' })}>ARCHIVE</button>}
                    <button type="button" onClick={() => void removeComment(item.id)}>DELETE</button>
                  </div>
                </>}
              </article>) : <div className="admin-empty">{comments.length ? 'No comments match this filter.' : 'No comment records yet. New public submissions will arrive here for review.'}</div>}
            </div>
          </section>}
          {tab === 'analytics' && <div className="admin-analytics"><div><span>RECORDED PAGE VIEWS</span><strong>{analytics?.views ?? 0}</strong></div><div><span>SESSION IDS IN SAMPLE</span><strong>{analytics?.uniqueSessions ?? 0}</strong></div><h3>Views by path</h3>{Object.entries(analytics?.pathCounts ?? {}).sort((a, b) => b[1] - a[1]).map(([path, count]) => <div className="analytics-path" key={path}><span>{path}</span><b>{count}</b></div>)}<p>Counts are approximate and include only visitors who opted in. The dashboard does not collect IP addresses, device fingerprints, or precise location.</p></div>}
          {tab === 'activity' && <div className="admin-record-list">{activity.length ? activity.map((item) => <article className="admin-activity-row" key={item.id}><time>{new Date(item.created_at).toLocaleString()}</time><strong>{item.action} / {item.record_type}</strong><p>{item.summary}</p></article>) : <div className="admin-empty">No administrator activity has been recorded yet.</div>}</div>}
          <div className="admin-export-row"><button onClick={() => exportRecords('portfolio-inquiries.json', inquiries)}>EXPORT INQUIRIES</button><button onClick={() => exportRecords('portfolio-comments.json', comments)}>EXPORT COMMENTS</button><button onClick={() => exportRecords('portfolio-admin-activity.json', activity)}>EXPORT ACTIVITY</button></div>
        </>}
      </section>
    </div>
  )
}
