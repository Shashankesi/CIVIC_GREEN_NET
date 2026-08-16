import React, { createContext, useEffect, useState, useCallback } from 'react'
import api, { getTokens, setTokens, clearTokens, unwrapResponse } from '../services/api'

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const response = await api.get('/auth/me')
      const profile = unwrapResponse(response)
      if (profile && profile.newTokens) {
        setTokens(profile.newTokens)
      }
      setUser(profile || null)
      return profile
    } catch (e) {
      clearTokens()
      setUser(null)
      throw e
    }
  }, [])

  useEffect(() => {
    const tokens = getTokens();

    if (!tokens?.accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetchProfile()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function loginWithTokens({ accessToken, refreshToken, user }) {
    setTokens({ accessToken, refreshToken });
    setUser(user || null);
  }

  function logout() {
    clearTokens();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, loginWithTokens, logout, refreshUser: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;
