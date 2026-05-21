import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const STORAGE_KEY = "price-comparison-auth";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const rawValue = localStorage.getItem(STORAGE_KEY);
      if (rawValue) {
        const parsed = JSON.parse(rawValue);
        setUser(parsed.user || null);
        setToken(parsed.token || "");
      }
    } catch (error) {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setToken("");
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (payload) => {
    setUser(payload.user);
    setToken(payload.token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  };

  const logout = () => {
    setUser(null);
    setToken("");
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("price-comparison-result");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: Boolean(token),
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
