import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let receivedEvent = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      receivedEvent = true;
      if (!active) return;
      setSession(next);
      setLoading(false);
    });
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || receivedEvent) return;
        setSession(error ? null : data.session);
        setLoading(false);
      })
      .catch(() => {
        if (active && !receivedEvent) setLoading(false);
      });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const user: User | null = session?.user ?? null;
  return { session, user, userId: user?.id ?? null, loading };
}
