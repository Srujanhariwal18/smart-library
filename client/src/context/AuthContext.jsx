import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import { setTokenResolver, setCurrentUser, apiClerkSync, apiRolePick, apiSwitchRole } from '../utils/api.js';

export const AuthContext = createContext(null);

// ══════════════════════════════════════════════════════════════════
// CLERK AUTH PROVIDER  (used when VITE_CLERK_PUBLISHABLE_KEY is set)
// ══════════════════════════════════════════════════════════════════
export const ClerkAuthProvider = ({ children }) => {
  const { isLoaded: isAuthLoaded, isSignedIn, signOut, getToken } = useClerkAuth();
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

    // FIX 2 — Always show the role picker for admin email on every login, not just first time
    const ADMIN_LIBRARIAN_EMAILS = ['your_admin_email@gmail.com'];
    if (ADMIN_LIBRARIAN_EMAILS.includes(email) && !user) {
      setPendingClerkData({ clerkId: clerkUser.id, email, name });
      setPendingRolePick(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const sync = async () => {
      try {
        setSyncError(null);
        let supabaseToken = null;
        if (import.meta.env.VITE_SUPABASE_URL) {
          try {
            supabaseToken = await getToken({ template: 'supabase' });
            if (!supabaseToken) {
              throw new Error('Failed to get Supabase token from Clerk. Check JWT template name is exactly: supabase');
            }
          } catch (tokenErr) {
            console.error('Clerk getToken Error:', tokenErr.message);
            throw new Error('Failed to fetch authentication token from Clerk. Please ensure the "supabase" JWT template is configured.');
          }
        }

        const result = await apiClerkSync(clerkUser.id, email, name, null, supabaseToken);

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
  }, [isAuthLoaded, isUserLoaded, isSignedIn, clerkUser?.id, syncTrigger, getToken]);

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
      let supabaseToken = null;
      if (import.meta.env.VITE_SUPABASE_URL) {
        supabaseToken = await getToken({ template: 'supabase' });
      }
      const result = await apiRolePick(
        pendingClerkData.clerkId,
        pendingClerkData.email,
        pendingClerkData.name,
        chosenRole,
        supabaseToken
      );
      applySession(result.token, result.user);
    } catch (err) {
      console.error('[Auth] Role pick failed:', err.message);
    } finally {
      setPendingRolePick(false);
      setPendingClerkData(null);
      setLoading(false);
    }
  }, [pendingClerkData, getToken]);

  const switchRole = useCallback(async (newRole) => {
    try {
      setLoading(true);
      let supabaseToken = null;
      if (import.meta.env.VITE_SUPABASE_URL) {
        supabaseToken = await getToken({ template: 'supabase' });
      }
      await apiSwitchRole(newRole, supabaseToken);
      
      const updatedUser = { ...user, role: newRole };
      setUser(updatedUser);
      setCurrentUser(updatedUser);
      localStorage.setItem('lib_user', JSON.stringify(updatedUser));
    } catch (err) {
      console.error('[Auth] Switch role failed:', err.message);
    } finally {
      setLoading(false);
    }
  }, [user, getToken]);

  const logout = useCallback(async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('[Auth] Clerk sign out error:', err);
    }
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
      switchRole,
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
      switchRole: () => {},
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
