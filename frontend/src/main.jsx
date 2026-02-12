import React from 'react'
import ReactDOM from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import App from './App'
import './index.css'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './hooks/useAuth.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import i18n from './i18n'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <I18nextProvider i18n={i18n}>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </I18nextProvider>
        </ErrorBoundary>
        <Toaster
            position="bottom-right"
            toastOptions={{
                duration: 4000,
                className: 'font-sans text-sm font-medium rounded-2xl shadow-2xl border border-slate-100',
                success: {
                    iconTheme: { primary: '#10b981', secondary: '#fff' },
                },
            }}
        />
    </React.StrictMode>,
)
