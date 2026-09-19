import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  BookOpen,
  Bookmark,
  Brain,
  ChevronRight,
  Church,
  Compass,
  Hand,
  HandHeart,
  History,
  ListChecks,
  Mic,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Square,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { askNuruAi } from "@/lib/ai.functions";
import { fetchProfile } from "@/services/content";
import {
  addPrayerJournalEntry,
  createConversation,
  deleteConversation,
  fetchConversations,
  fetchMessages,
  saveAiResponse,
  saveMessage,
  type AiMessage,
} from "@/services/ai";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";
import { NuruAiMark } from "@/components/nuru/NuruAiMark";
import { AiMarkdown } from "@/components/nuru/AiMarkdown";
import { CardSkeleton, IconTile } from "@/components/nuru/Primitives";
import heroBg from "@/assets/mountain-dawn.jpg";

type Search = {
  contextType?: string | undefined;
  contextId?: string | undefined;
  contextLabel?: string | undefined;
  q?: string | undefined;
};

export const Route = createFileRoute("/_authenticated/ai")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    contextType: typeof search["contextType"] === "string" ? search["contextType"] : undefined,
    contextId: typeof search["contextId"] === "string" ? search["contextId"] : undefined,
    contextLabel: typeof search["contextLabel"] === "string" ? search["contextLabel"] : undefined,
    q: typeof search["q"] === "string" ? search["q"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Nuru AI — Scripture, explained" },
      {
        name: "description",
        content:
          "Ask about any Bible passage, Christian teaching or question of faith and get a clear, honest answer.",
      },
      { property: "og:title", content: "Nuru AI — Scripture, explained" },
      {
        property: "og:description",
        content: "A Scripture companion that points you back to the Bible.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AiScreen,
});

const STARTERS: { prompt: string; hint: string; icon: LucideIcon; tint: string }[] = [
  {
    prompt: "Explain this verse",
    hint: "Get a clear explanation",
    icon: BookOpen,
    tint: "border-primary/45 bg-primary/15 text-cyan",
  },
  {
    prompt: "Help me pray",
    hint: "Guided and personal prayers",
    icon: HandHeart,
    tint: "border-violet/45 bg-violet/15 text-violet",
  },
  {
    prompt: "What does the Bible say about anxiety?",
    hint: "Find peace in God's Word",
    icon: Brain,
    tint: "border-magenta/45 bg-magenta/15 text-magenta",
  },
  {
    prompt: "Help me understand my church",
    hint: "Learn, grow, and get involved",
    icon: Church,
    tint: "border-growth/45 bg-growth/15 text-growth",
  },
  {
    prompt: "How do I read the Bible without getting lost?",
    hint: "Simple steps for beginners",
    icon: ListChecks,
    tint: "border-warning/45 bg-warning/15 text-warning",
  },
  {
    prompt: "How do I know if something is God's will?",
    hint: "Biblical guidance for decisions",
    icon: Compass,
    tint: "border-destructive/45 bg-destructive/15 text-destructive",
  },
];

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; pending?: boolean };

function AiScreen() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const search = Route.useSearch();
  const ask = useServerFn(askNuruAi);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const seeded = useRef(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const voiceBaseRef = useRef("");

  const voice = useVoiceInput((text, isFinal) => {
    const base = voiceBaseRef.current;
    setInput(base ? `${base} ${text}` : text);
    if (isFinal) voiceBaseRef.current = base ? `${base} ${text}` : text;
  });

  function toggleVoice() {
    if (voice.listening) {
      voice.stop();
      return;
    }
    voiceBaseRef.current = input.trim();
    voice.start((message) => toast.error(message));
  }

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
  const conversations = useQuery({
    queryKey: ["ai-conversations", userId],
    queryFn: () => fetchConversations(userId!),
    enabled: !!userId,
  });

  const context = useMemo(() => {
    if (!search.contextType || !search.contextLabel) return null;
    const type = ["reel", "verse", "devotional", "lesson", "prayer"].includes(search.contextType)
      ? (search.contextType as "reel" | "verse" | "devotional" | "lesson" | "prayer")
      : ("general" as const);
    return { type, label: search.contextLabel };
  }, [search.contextType, search.contextLabel]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    const body = text.trim();
    if (!body || busy) return;
    if (!userId) {
      toast.error("Sign in to talk with Nuru AI");
      return;
    }
    setBusy(true);
    setInput("");

    const localId = crypto.randomUUID();
    const history: ChatMessage[] = [...messages, { id: localId, role: "user", content: body }];
    setMessages([
      ...history,
      { id: `${localId}-p`, role: "assistant", content: "", pending: true },
    ]);

    try {
      let convId = conversationId;
      if (!convId) {
        const conv = await createConversation({
          userId,
          title: context?.label ?? body,
          contextType: search.contextType ?? null,
          contextLabel: search.contextLabel ?? null,
          contextId: search.contextId ?? null,
        });
        convId = conv.id;
        setConversationId(conv.id);
      }
      await saveMessage({ conversationId: convId, userId, role: "user", content: body });

      const result = await ask({
        data: {
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          denomination: profile.data?.denomination ?? null,
          churchName: null,
          context: context ? { type: context.type, label: context.label } : null,
        },
      });

      const saved = await saveMessage({
        conversationId: convId,
        userId,
        role: "assistant",
        content: result.content,
      });
      setMessages([...history, { id: saved.id, role: "assistant", content: result.content }]);
      await qc.invalidateQueries({ queryKey: ["ai-conversations", userId] });
    } catch (e) {
      setMessages(history);
      toast.error(e instanceof Error ? e.message : "Nuru AI couldn't answer just now");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (seeded.current || !search.q || !userId) return;
    seeded.current = true;
    void send(search.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.q, userId]);

  async function openConversation(id: string) {
    setShowHistory(false);
    setConversationId(id);
    const rows: AiMessage[] = await fetchMessages(id);
    setMessages(rows.map((m) => ({ id: m.id, role: m.role, content: m.content })));
  }

  function newChat() {
    setConversationId(null);
    setMessages([]);
    setShowHistory(false);
  }

  return (
    <AppShell>
      {messages.length === 0 && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
          <img
            src={heroBg}
            alt=""
            loading="eager"
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/75 to-background" />
        </div>
      )}

      <ScreenHeader
        title="Nuru AI"
        subtitle="Scripture, explained honestly"
        right={
          <div className="flex items-center gap-2">
            <button
              onClick={newChat}
              aria-label="New chat"
              className="rounded-full bg-surface-2 p-2"
            >
              <Plus className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={() => setShowHistory((v) => !v)}
              aria-label="Chat history"
              className="rounded-full bg-surface-2 p-2"
            >
              <History className="h-4.5 w-4.5" />
            </button>
          </div>
        }
      />

      {showHistory && (
        <div className="border-b border-border/60 px-4 py-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            Your conversations are private to you.
          </p>
          {conversations.isLoading && <CardSkeleton count={2} height="h-12" />}
          {(conversations.data ?? []).length === 0 && !conversations.isLoading && (
            <p className="text-xs text-muted-foreground">No conversations yet.</p>
          )}
          <ul className="space-y-2">
            {(conversations.data ?? []).map((c) => (
              <li key={c.id} className="flex items-center gap-2">
                <button
                  onClick={() => void openConversation(c.id)}
                  className="min-w-0 flex-1 rounded-2xl bg-surface-2 px-3 py-2 text-left text-xs"
                >
                  <span className="block truncate font-medium">{c.title}</span>
                  {c.context_label && (
                    <span className="block truncate text-muted-foreground">{c.context_label}</span>
                  )}
                </button>
                <button
                  aria-label="Delete conversation"
                  onClick={async () => {
                    await deleteConversation(c.id);
                    if (conversationId === c.id) newChat();
                    await qc.invalidateQueries({ queryKey: ["ai-conversations", userId] });
                  }}
                  className="rounded-full p-2 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {context && (
        <div className="mx-4 mt-3 rounded-2xl border border-border bg-surface-2 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-cyan">
            Asking about this {context.type}
          </p>
          <p className="mt-1 text-sm">{context.label}</p>
        </div>
      )}

      <div className="space-y-4 px-4 py-4">
        {messages.length === 0 && (
          <>
            <div className="pb-2">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="script max-w-[6.5rem] text-[17px] leading-[1.15] text-white/80">
                    Closer to God
                    <span className="block">A Brighter Tomorrow</span>
                  </p>
                  <p className="script max-w-[6.5rem] text-right text-[17px] leading-[1.15] text-white/80">
                    Your Questions Matter
                  </p>
                </div>

                <NuruAiMark className="mx-auto mt-2 h-28 w-28" />

                <h2 className="mt-3 text-center font-display text-[24px] leading-tight font-bold">
                  Hello, I'm <span className="text-cyan">Nuru AI</span>{" "}
                  <span className="align-middle">👋</span>
                </h2>
                <p className="mx-auto mt-2 max-w-[20rem] text-center text-[13px] leading-relaxed text-secondary-foreground">
                  Ask me anything about the Bible, faith, prayer, life or church. I'll give you
                  clear, biblical answers and always point you to Scripture and real people in your
                  church.
                </p>
              </div>
            </div>

            <div className="nuru-card flex items-start gap-3 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/12 text-cyan">
                <ShieldCheck className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <p className="text-[12px] leading-relaxed text-secondary-foreground">
                Nuru AI is a study helper, not a pastor, priest or counsellor. It can be wrong.
                Always check with the Bible and trusted leaders in your church. If you are in danger
                or crisis, contact someone you trust or your local emergency services straight away.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {STARTERS.map(({ prompt, hint, icon: Icon, tint }) => (
                <button
                  key={prompt}
                  onClick={() => void send(prompt)}
                  className="nuru-card flex items-start gap-2 p-2.5 text-left transition-colors active:opacity-90"
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
                      tint,
                    )}
                  >
                    <Icon className="h-4.5 w-4.5" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[12.5px] leading-tight font-semibold">
                      {prompt}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
                      {hint}
                    </span>
                  </span>
                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </>
        )}

        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <p className="max-w-[85%] rounded-3xl rounded-br-md bg-primary px-4 py-2.5 text-sm text-primary-foreground nuru-glow-sm">
                {m.content}
              </p>
            </div>
          ) : (
            <div key={m.id} className="nuru-card p-4">
              {m.pending ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Sparkles className="h-4 w-4 animate-pulse text-cyan" /> Thinking through
                  Scripture…
                </p>
              ) : (
                <>
                  <AiMarkdown content={m.content} />
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                    <SmallAction
                      icon={<Bookmark className="h-3.5 w-3.5" />}
                      label="Save"
                      onClick={async () => {
                        if (!userId) return;
                        try {
                          await saveAiResponse(userId, m.id);
                          toast.success("Saved to your notes");
                        } catch {
                          toast.error("Couldn't save that");
                        }
                      }}
                    />
                    <SmallAction
                      icon={<Hand className="h-3.5 w-3.5" />}
                      label="Turn into a prayer"
                      onClick={async () => {
                        if (!userId) return;
                        try {
                          await addPrayerJournalEntry({
                            userId,
                            title: "Prayer from Nuru AI",
                            content: m.content.slice(0, 1500),
                            source: "ai",
                          });
                          toast.success("Added to your prayer journal");
                        } catch {
                          toast.error("Couldn't save that");
                        }
                      }}
                    />
                    <Link
                      to="/bible"
                      className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground"
                    >
                      <BookOpen className="h-3.5 w-3.5" /> Open Bible
                    </Link>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">
                    Nuru AI can make mistakes. Always check Scripture yourself.
                  </p>
                </>
              )}
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      <div className="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-xl px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="flex items-center gap-2 rounded-full border border-border-strong bg-surface/95 p-1.5 shadow-[var(--shadow-raised)] backdrop-blur-xl"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-cyan">
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={voice.listening ? "Listening…" : "Ask about a verse, a doubt, a decision…"}
            maxLength={2000}
            aria-label="Ask Nuru AI"
            className="min-h-11 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          {voice.supported && (
            <button
              type="button"
              onClick={toggleVoice}
              aria-label={voice.listening ? "Stop voice input" : "Ask by voice"}
              aria-pressed={voice.listening}
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors",
                voice.listening
                  ? "bg-destructive text-destructive-foreground animate-pulse"
                  : "bg-surface-2 text-secondary-foreground hover:text-foreground",
              )}
            >
              {voice.listening ? (
                <Square className="h-4 w-4" fill="currentColor" />
              ) : (
                <Mic className="h-4.5 w-4.5" />
              )}
            </button>
          )}
          <button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary nuru-glow-sm disabled:opacity-40 disabled:shadow-none"
          >
            <Send className="h-4.5 w-4.5 text-primary-foreground" />
          </button>
        </form>
      </div>
    </AppShell>
  );
}

function SmallAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-surface-2 px-3 py-1.5 text-[11px] font-semibold text-secondary-foreground",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
