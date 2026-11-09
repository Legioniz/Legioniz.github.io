import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { siteConfig } from './config'

interface Props { children: ReactNode }
interface State { failed: boolean }

/** Keeps contact and CV access available if an unexpected React render error occurs. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Diagnostic details stay in the browser console; no visitor data is collected.
    console.error('Portfolio interface fallback activated.', error, info.componentStack)
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="runtime-fallback" role="alert">
          <p className="runtime-fallback-kicker">LEGIONIZ / FIELD NOTES</p>
          <h1>Something interrupted the interface.</h1>
          <p>The portfolio's enhanced interface could not load. Your contact options are still available below.</p>
          <div className="runtime-fallback-actions">
            <a href="/?view=recruiter">Open recruiter profile</a>
            <a href={`mailto:${siteConfig.email}`}>Email King Art</a>
            <a href={siteConfig.github} target="_blank" rel="noopener noreferrer">Visit GitHub</a>
          </div>
        </main>
      )
    }
    return this.props.children
  }
}
