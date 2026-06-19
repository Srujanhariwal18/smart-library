import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

// Only wrap with ClerkProvider if both Clerk and Supabase integration parameters are set
const isClerkSupabaseEnabled = !!PUBLISHABLE_KEY && !!SUPABASE_URL;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isClerkSupabaseEnabled ? (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <App />
      </ClerkProvider>
    ) : (
      <App />
    )}
  </StrictMode>,
)
