import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { LOCAL_CHANGE_EVENT, getCurrentProfile, getCurrentUser, localSignOut, type LocalProfile, type LocalUser } from "@/lib/localApp";

interface AuthContextValue {
  session: { user: LocalUser } | null;
  user: LocalUser | null;
  profile: LocalProfile | null;
  loading: boolean;
  /** True once we've checked for the user's profile row. */
  profileChecked: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<{ user: LocalUser } | null>(null);
  const [user, setUser] = useState<LocalUser | null>(null);
  const [profile, setProfile] = useState<LocalProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileChecked, setProfileChecked] = useState(true);

  const syncLocalAuth = useCallback(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setSession(currentUser ? { user: currentUser } : null);
    setProfile(getCurrentProfile());
    setProfileChecked(true);
    setLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    syncLocalAuth();
  }, [syncLocalAuth]);

  useEffect(() => {
    syncLocalAuth();
    window.addEventListener(LOCAL_CHANGE_EVENT, syncLocalAuth);
    window.addEventListener("storage", syncLocalAuth);
    return () => {
      window.removeEventListener(LOCAL_CHANGE_EVENT, syncLocalAuth);
      window.removeEventListener("storage", syncLocalAuth);
    };
  }, [syncLocalAuth]);

  const signOut = async () => {
    localSignOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, profileChecked, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
