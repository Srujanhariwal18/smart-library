import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import { setTokenResolver, setCurrentUser } from '../utils/api.js';

export const AuthContext = createContext(null);

const API_BASE = 'http://localhost:5000/api';

// ─── API Helpers ─────────────────────────────────────────────────────────────
async function apiClerkSync(clerkId, email, name, requestedRole = null) {
  const res = await fetch(`${API_BASE}/auth/clerk-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clerkId, email, name, requestedRole }),
  });
  const data = await res.json();
  if (!res.ok && res.status !== 202) throw new Error(data.message || 'Sync failed');
  return { httpStatus: res.status, ...data };
}

async function apiRolePick(clerkId, email, name, role) {
  const res = await fetch(`${API_BASE}/auth/clerk-role-pick`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clerkId, email, name, role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Role pick failed');
  return data;
}
// ─────────────────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════
// CLERK AUTH PROVIDER  (used when VITE_CLERK_PUBLISHABLE_KEY is set)
// ══════════════════════════════════════════════════════════════════
export const ClerkAuthProvider = ({ children }) => {
  const { isLoaded: isAuthLoaded, isSignedIn, signOut } = useClerkAuth();
  const { isLoaded: isUserLoaded, user: clerkUser } = useClerkUser();

  const [user, setUser]                     = useState(null);
  const [token, setToken]                   = useState(null);
  const [loading, setLoading]               = useState(true);
  const [pendingRolePick, setPendingRolePick]     = useState(false);
  const [pendingClerkData, setPendingClerkData]   = useState(null);
  const [syncError, setSyncError]           = useState(null);
  const [syncTrigger, setSyncTrigger]       = useState(0);

  const retrySync = useCallback(() => {
    setSyncTrigger(prev => prev + 1);
    setLoading(true);
  }, []);

  useEffect(() => {
    if (!isAuthLoaded || !isUserLoaded) { setLoading(true); return; }

    if (!isSignedIn || !clerkUser) {
      setUser(null); setToken(null); setCurrentUser(null);
      setPendingRolePick(false); setPendingClerkData(null);
      localStorage.removeItem('lib_token');
      localStorage.removeItem('lib_user');
      setLoading(false);
      return;
    }

    const email = (clerkUser.emailAddresses[0]?.emailAddress || '').toLowerCase();
    const name  = (`${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`).trim()
                  || clerkUser.username
                  || email.split('@')[0];

    let cancelled = false;

    const sync = async () => {
      try {
        setSyncError(null);
        const result = await apiClerkSync(clerkUser.id, email, name);

        if (cancelled) return;

        if (result.needsRolePick) {
          setPendingClerkData({ clerkId: clerkUser.id, email, name });
          setPendingRolePick(true);
          setLoading(false);
          return;
        }

        applySession(result.token, result.user);
      } catch (err) {
        if (!cancelled) {
          console.error('[Auth] Clerk sync failed:', err.message);
          setSyncError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    sync();
    return () => { cancelled = true; };
  }, [isAuthLoaded, isUserLoaded, isSignedIn, clerkUser?.id, syncTrigger]);

  const applySession = (tok, usr) => {
    setToken(tok);
    setUser(usr);
    setCurrentUser(usr);
    setTokenResolver(() => tok);
    localStorage.setItem('lib_token', tok);
    localStorage.setItem('lib_user', JSON.stringify(usr));
  };

  const confirmRolePick = useCallback(async (chosenRole) => {
    if (!pendingClerkData) return;
    try {
      const result = await apiRolePick(
        pendingClerkData.clerkId,
        pendingClerkData.email,
        pendingClerkData.name,
        chosenRole
      );
      applySession(result.token, result.user);
    } catch (err) {
      console.error('[Auth] Role pick failed:', err.message);
    } finally {
      setPendingRolePick(false);
      setPendingClerkData(null);
    }
  }, [pendingClerkData]);

  const logout = useCallback(() => {
    signOut();
    setUser(null); setToken(null); setCurrentUser(null);
    localStorage.removeItem('lib_token');
    localStorage.removeItem('lib_user');
  }, [signOut]);

  const isAuthenticated = useCallback(() => !!user, [user]);
  const hasRole = useCallback((roles) => !!user && roles.includes(user.role), [user]);

  return (
    <AuthContext.Provider value={{
      user, token, loading, isClerk: true, syncError,
      login: () => {},
      logout, isAuthenticated, hasRole,
      pendingRolePick, pendingClerkData, confirmRolePick,
      isSignedIn: !!isSignedIn, retrySync
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// ══════════════════════════════════════════════════════════════════
// MOCK / LOCAL AUTH PROVIDER  (used without Clerk)
// ══════════════════════════════════════════════════════════════════
export const MockAuthProvider = ({ children }) => {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('lib_token');
    const savedUser  = localStorage.getItem('lib_user');
    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsed);
        setCurrentUser(parsed);
      } catch { /* ignore corrupt data */ }
    }
    setTokenResolver(() => localStorage.getItem('lib_token'));
    setLoading(false);
  }, []);

  const login = useCallback((tok, userDetails) => {
    localStorage.setItem('lib_token', tok);
    localStorage.setItem('lib_user', JSON.stringify(userDetails));
    setToken(tok);
    setUser(userDetails);
    setCurrentUser(userDetails);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lib_token');
    localStorage.removeItem('lib_user');
    setToken(null); setUser(null); setCurrentUser(null);
  }, []);

  const isAuthenticated = useCallback(() => !!user, [user]);
  const hasRole = useCallback((roles) => !!user && roles.includes(user.role), [user]);

  return (
    <AuthContext.Provider value={{
      user, token, loading, isClerk: false,
      login, logout, isAuthenticated, hasRole,
      pendingRolePick: false, pendingClerkData: null,
      confirmRolePick: () => {}, syncError: null,
      isSignedIn: false, retrySync: () => {}
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// ══════════════════════════════════════════════════════════════════
// UNIFIED WRAPPER — picks the right provider automatically
// ══════════════════════════════════════════════════════════════════
export const AuthProvider = ({ children }) => {
  const isClerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  return isClerkEnabled
    ? <ClerkAuthProvider>{children}</ClerkAuthProvider>
    : <MockAuthProvider>{children}</MockAuthProvider>;
};

// ══════════════════════════════════════════════════════════════════
// HOOK
// ══════════════════════════════════════════════════════════════════
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
