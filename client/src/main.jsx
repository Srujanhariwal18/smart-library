import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Only require the Clerk key — Supabase is no longer needed for auth
const isClerkEnabled = !!PUBLISHABLE_KEY;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isClerkEnabled ? (
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        fallbackRedirectUrl="/"
        signInUrl="/login"
        signUpUrl="/register"
      >
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)
