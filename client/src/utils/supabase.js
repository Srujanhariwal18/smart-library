import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// FIX 5 — Check environment variables are being read correctly
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars missing — falling back to local mock mode');
}

// Global static client (no token / anon key only)
const baseClient = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// FIX 1 — Pattern to create a standard Supabase client with custom access token
export const supabaseClient = async (supabaseAccessToken) => {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${supabaseAccessToken}`,
      },
    },
  });
};

// Dynamic client proxy that automatically injects the Clerk JWT token if logged in
const clientCache = {};
export const supabase = new Proxy({}, {
  get(target, prop) {
    if (!baseClient) return null;
    const token = localStorage.getItem('lib_token');
    if (token) {
      if (!clientCache[token]) {
        clientCache[token] = createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        });
      }
      return clientCache[token][prop];
    }
    return baseClient[prop];
  }
});
