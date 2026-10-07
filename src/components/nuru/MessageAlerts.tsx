import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchChatProfiles } from "@/services/messaging";

export function MessageAlerts() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const seen = useRef(new Set<string>());
  const initialized = useRef(false);
  const unread = useQuery({
    queryKey: ["unread-message-alerts", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("direct_messages")
        .select("id,sender_id,body,message_type,created_at", { count: "exact" })
        .eq("recipient_id", userId!)
        .is("read_at", null)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return { messages: data ?? [], count: count ?? 0 };
    },
    // Realtime invalidates this on every new message; the poll is a fallback.
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    seen.current.clear();
    initialized.current = false;
  }, [userId]);
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`message-alerts-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "direct_messages",
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ["unread-message-alerts", userId] });
          void qc.invalidateQueries({ queryKey: ["direct-threads", userId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, qc]);
  useEffect(() => {
    if (!unread.data) return;
    const newMessages = unread.data.messages.filter((message) => !seen.current.has(message.id));
    for (const message of unread.data.messages) seen.current.add(message.id);
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    const peer = (location.search as { user?: string }).user;
    for (const message of newMessages.slice(0, 3)) {
      if (location.pathname === "/messages" && peer === message.sender_id) continue;
      const preview =
        message.message_type === "text"
          ? message.body.slice(0, 100)
          : ({
              image: "Sent a photo",
              video: "Sent a video",
              voice: "Sent a voice note",
              sticker: "Sent a sticker",
              location: "Shared a location",
            }[message.message_type] ?? "New message");
      void fetchChatProfiles([message.sender_id])
        .then((profiles) => {
          const profile = profiles[message.sender_id];
          toast(profile?.full_name || profile?.username || "New message", {
            id: `message-${message.id}`,
            description: preview,
            action: {
              label: "Open",
              onClick: () =>
                void navigate({ to: "/messages", search: { user: message.sender_id } }),
            },
          });
        })
        .catch(() => toast("New message", { description: preview }));
    }
  }, [unread.data, location.pathname, location.search, navigate]);
  if (!unread.data?.count || location.pathname === "/messages") return null;
  return (
    <Link
      to="/messages"
      search={{}}
      aria-label={`${unread.data.count} unread messages`}
      className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-[60] flex min-h-11 items-center gap-2 rounded-full border border-primary/30 bg-card px-4 text-sm font-semibold shadow-xl"
    >
      <MessageCircle className="h-5 w-5 text-primary" />
      <span>{unread.data.count > 99 ? "99+" : unread.data.count}</span>
      <span className="sr-only">unread messages</span>
    </Link>
  );
}
