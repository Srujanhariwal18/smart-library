import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth as useClerkAuth, useUser as useClerkUser } from '@clerk/clerk-react';
import { supabase } from '../utils/supabase.js';
import { setTokenResolver, setCurrentUser } from '../utils/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const isClerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY && !!import.meta.env.VITE_SUPABASE_URL;

  // Shared state
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  if (isClerkEnabled) {
    return (
      <ClerkAuthProviderWrapper {...{ user, setUser, token, setToken, loading, setLoading }}>
        {children}
      </ClerkAuthProviderWrapper>
    );
  } else {
    return (
      <MockAuthProviderWrapper {...{ user, setUser, token, setToken, loading, setLoading }}>
        {children}
      </MockAuthProviderWrapper>
    );
  }
};

const ClerkAuthProviderWrapper = ({ user, setUser, token, setToken, loading, setLoading, children }) => {
  const { isLoaded: isAuthLoaded, isSignedIn, userId, getToken, signOut } = useClerkAuth();
  const { isLoaded: isUserLoaded, user: clerkUser } = useClerkUser();

  useEffect(() => {
    if (!isAuthLoaded || !isUserLoaded) {
      setLoading(true);
      return;
    }

    const syncUser = async () => {
      try {
        setTokenResolver(() => getToken({ template: 'supabase' }).catch(() => getToken()));
        const jwt = await getToken({ template: 'supabase' }).catch(() => null) || await getToken();
        setToken(jwt);

        // Connect Supabase client to Clerk session
        if (jwt) {
          await supabase.auth.setSession({
            access_token: jwt,
            refresh_token: ''
          }).catch((err) => console.warn('Supabase session initialization bypassed:', err.message));
        }

        const email = clerkUser.emailAddresses[0]?.emailAddress;
        const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username || 'Clerk User';

        // Try fetching user from Supabase using Clerk ID
        let { data: dbUser } = await supabase
          .from('users')
          .select('*')
          .eq('clerk_id', clerkUser.id)
          .maybeSingle();

        if (!dbUser) {
          // Check by email to see if we should link an existing seeded user
          const { data: emailUser } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();

          if (emailUser) {
            const { data: updatedUser } = await supabase
              .from('users')
              .update({ clerk_id: clerkUser.id })
              .eq('id', emailUser.id)
              .select()
              .single();
            dbUser = updatedUser;
          } else {
            // New user registration. Determine default roles:
            let role = 'student';
            if (email === 'admin@library.com') role = 'admin';
            else if (email === 'librarian@library.com') role = 'librarian';

            const { data: newUser } = await supabase
              .from('users')
              .insert({
                name,
                email,
                role,
                status: 'active',
                clerk_id: clerkUser.id
              })
              .select()
              .single();
            dbUser = newUser;
          }
        }

        setUser(dbUser);
        setCurrentUser(dbUser);
      } catch (err) {
        console.error('Clerk Profile Sync Error:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isSignedIn && clerkUser) {
      syncUser();
    } else {
      setUser(null);
      setToken(null);
      setCurrentUser(null);
      setLoading(false);
    }
  }, [isAuthLoaded, isUserLoaded, isSignedIn, clerkUser]);

  const logout = () => {
    signOut();
  };

  const isAuthenticated = () => !!user;

  const hasRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ token, user, login: () => {}, logout, loading, isAuthenticated, hasRole, isClerk: true }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

const MockAuthProviderWrapper = ({ user, setUser, token, setToken, loading, setLoading, children }) => {
  useEffect(() => {
    const savedToken = localStorage.getItem('lib_token');
    const savedUser = localStorage.getItem('lib_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setCurrentUser(parsedUser);
    }

    setTokenResolver(() => localStorage.getItem('lib_token'));
    setLoading(false);
  }, []);

  const login = (mockToken, userDetails) => {
    localStorage.setItem('lib_token', mockToken);
    localStorage.setItem('lib_user', JSON.stringify(userDetails));
    setToken(mockToken);
    setUser(userDetails);
    setCurrentUser(userDetails);
  };

  const logout = () => {
    localStorage.removeItem('lib_token');
    localStorage.removeItem('lib_user');
    setToken(null);
    setUser(null);
    setCurrentUser(null);
  };

  const isAuthenticated = () => !!user;

  const hasRole = (roles) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, logout, loading, isAuthenticated, hasRole, isClerk: false }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
