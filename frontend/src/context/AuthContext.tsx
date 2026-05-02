import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../api/auth";
import type { MacroTarget } from "../api/profile";
import { fetchMe, loginUser, registerUser } from "../api/auth";
import { fetchProfile } from "../api/profile";

interface AuthContextValue {
  user: User | null;
  macroTarget: MacroTarget | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [macroTarget, setMacroTarget] = useState<MacroTarget | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function loadProfile() {
    try {
      const { macro_target } = await fetchProfile();
      setMacroTarget(macro_target);
    } catch {
      // profile not yet created — that's fine
    }
  }

  // On mount, try to restore session from localStorage token
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    fetchMe()
      .then(async ({ user }) => {
        setUser(user);
        await loadProfile();
      })
      .catch(() => localStorage.removeItem("access_token"))
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const { access_token, user } = await loginUser({ email, password });
    localStorage.setItem("access_token", access_token);
    setUser(user);
    await loadProfile();
  };

  const register = async (email: string, password: string, displayName: string) => {
    const { access_token, user } = await registerUser({
      email,
      password,
      display_name: displayName,
    });
    localStorage.setItem("access_token", access_token);
    setUser(user);
    // New user has no profile yet — macroTarget stays null
  };

  const refreshProfile = async () => {
    await loadProfile();
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
    setMacroTarget(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        macroTarget,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
