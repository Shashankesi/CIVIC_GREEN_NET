import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { RealtimeProvider } from './context/RealtimeContext'
import { LanguageProvider } from './utils/i18n'
import ErrorBoundary from './components/ErrorBoundary'

// Ensure Leaflet global is available for plugins (e.g. leaflet.markercluster, leaflet.heat)
if (typeof window !== 'undefined') {
  window.L = L
}

// Register Service Worker for PWA if supported
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err)
    })
  })
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <RealtimeProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </RealtimeProvider>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
