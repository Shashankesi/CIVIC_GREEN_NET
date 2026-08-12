import React, { createContext, useEffect, useState } from 'react'
import api, { getTokens, setTokens, clearTokens, unwrapResponse } from '../services/api'

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tokens = getTokens();

    if (!tokens?.accessToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    api
      .get('/auth/me')
      .then((response) => {
        const profile = unwrapResponse(response);
        setUser(profile || null);
      })
      .catch(() => {
        clearTokens();
        setUser(null);
      })
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
    <AuthContext.Provider value={{ user, setUser, loading, loginWithTokens, logout }}>{children}</AuthContext.Provider>
  );
}

export default AuthContext;
