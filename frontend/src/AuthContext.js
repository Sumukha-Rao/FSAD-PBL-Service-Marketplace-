import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api.js";
const e = React.createElement;
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, updateUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const revision = useRef(0);
  const setUser = useCallback((value) => {
    revision.current += 1;
    updateUser(value);
    setLoading(false);
  }, []);
  useEffect(() => {
    let current = true;
    const started = revision.current;
    api("/api/auth/me").then((value) => {
      if (current && started === revision.current) setUser(value);
    }).catch(() => {
      if (current && started === revision.current) setUser(null);
    }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [setUser]);
  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    setUser(null);
  }
  return e(AuthContext.Provider, { value: { user, setUser, loading, logout } }, children);
}
export function useAuth() { return useContext(AuthContext); }
