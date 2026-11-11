import { useEffect, useRef, useState } from 'react'
import { backendConfig, submitPublicRecord } from './backend'

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
