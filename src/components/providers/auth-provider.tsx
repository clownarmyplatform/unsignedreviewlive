"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import {
  resolveAccountRole,
  resolveHostAccount,
  type AccountRole,
  type HostAccount,
} from "@/lib/auth/roles";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthContextValue = {
  accountStatus: "active" | "suspended" | null;
  isLoading: boolean;
  hostAccount: HostAccount | null;
  isAdmin: boolean;
  role: AccountRole | null;
  session: Session | null;
  user: User | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [accountStatus, setAccountStatus] = useState<"active" | "suspended" | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let isMounted = true;

    async function syncSession(nextSession: Session | null) {
      if (!isMounted) {
        return;
      }

      if (!nextSession?.user) {
        setSession(null);
        setAccountStatus(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("account_status")
          .eq("auth_user_id", nextSession.user.id)
          .maybeSingle();

        if (!isMounted) {
          return;
        }

        if (!error && data?.account_status === "suspended") {
          window.sessionStorage.setItem(
            "auth_notice",
            "Your account is suspended. Contact the host/admin if you think this is a mistake.",
          );
          await supabase.auth.signOut();
          if (!isMounted) {
            return;
          }
          setSession(null);
          setAccountStatus("suspended");
          setIsLoading(false);
          return;
        }

        setSession(nextSession);
        setAccountStatus(data?.account_status ?? "active");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      void syncSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;

    return {
      accountStatus,
      hostAccount: resolveHostAccount(user?.email),
      isAdmin: resolveAccountRole(user?.email) === "admin",
      isLoading,
      role: resolveAccountRole(user?.email),
      session,
      user,
    };
  }, [accountStatus, isLoading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
