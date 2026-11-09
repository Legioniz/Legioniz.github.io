type ServiceWorkerWithState = ServiceWorker & { state: string }

export function registerPortfolioServiceWorker() {
  const env = (import.meta as ImportMeta & { env?: { PROD?: boolean } }).env
  if (!env?.PROD || !('serviceWorker' in navigator)) return

  navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registration) => {
    const notifyIfReady = (worker: ServiceWorkerWithState | null) => {
      if (!worker || worker.state !== 'installed' || !navigator.serviceWorker.controller) return
      window.dispatchEvent(new CustomEvent('portfolio-update-ready', { detail: { worker } }))
    }
    if (registration.waiting) notifyIfReady(registration.waiting as ServiceWorkerWithState)
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing as ServiceWorkerWithState | null
      worker?.addEventListener('statechange', () => notifyIfReady(worker))
    })
  }).catch((error: unknown) => {
    // The portfolio remains fully usable without offline caching.
    console.warn('Portfolio offline cache is unavailable:', error)
  })
}
