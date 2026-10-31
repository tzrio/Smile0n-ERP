/**
 * Application entry point.
 * Providers order matters (theme → toast → firebase gate → router → auth).
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext'
import { ErrorBoundary } from './app/ErrorBoundary'
import { FirebaseConfigGate } from './app/FirebaseConfigGate'
import { ToastProvider } from './app/ToastContext'
import { ThemeProvider } from './app/ThemeContext'
import { DivisionProvider } from './app/DivisionContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <FirebaseConfigGate>
          <HashRouter>
            <AuthProvider>
              <DivisionProvider>
                <ErrorBoundary>
                  <App />
                </ErrorBoundary>
              </DivisionProvider>
            </AuthProvider>
          </HashRouter>
        </FirebaseConfigGate>
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>,
)
