import { useState, type ReactNode } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Copy,
  HeartHandshake,
  Info,
  Languages,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Monitor,
  Moon,
  Music2,
  Phone,
  ShieldCheck,
  Sun,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, BoardHeader } from "@/components/nuru/AppShell";
import { AccountSecurityPanel } from "@/components/nuru/AccountSecurityPanel";
import { MfaSecurityPanel } from "@/components/nuru/MfaSecurity";
import { ProfileSettingsPanel } from "@/components/nuru/ProfileSettingsPanel";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import type { ThemePreference } from "@/lib/theme";
import { fetchMyRoles } from "@/services/content";
import { optionalOneOf } from "@/lib/searchParams";

export const Route = createFileRoute("/_authenticated/settings")({
  validateSearch: (search: Record<string, unknown>): { panel?: "profile" | undefined } => ({
    panel: optionalOneOf(search["panel"], ["profile"]),
  }),
  head: () => ({
    meta: [
      { title: "Settings — Nuru Faith" },
      { name: "description", content: "Manage your Nuru Faith account, privacy and preferences." },
    ],
  }),
  component: SettingsScreen,
});

const COMPANY_EMAIL = "vortiqoratechn@gmail.com";
const HELPLINES = [
  { display: "+254 117 499 067", tel: "+254117499067", wa: "254117499067" },
  { display: "+254 116 096 909", tel: "+254116096909", wa: "254116096909" },
] as const;

const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", hint: "Always the light theme", icon: Sun },
  { value: "dark", label: "Dark", hint: "Always the dark theme", icon: Moon },
  {
    value: "system",
    label: "Use device setting",
    hint: "Follow your phone or computer",
    icon: Monitor,
  },
];

function SettingsScreen() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const qc = useQueryClient();
  const { userId } = useAuth();
  const { preference, setPreference } = useTheme();
  const profileOpen = search.panel === "profile";
  const [securityOpen, setSecurityOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  const roles = useQuery({
    queryKey: ["roles", userId],
    queryFn: () => fetchMyRoles(userId!),
    enabled: !!userId,
  });
  const isStaff = (roles.data ?? []).some((row) =>
    ["super_admin", "moderator", "church_admin"].includes(String(row.role)),
  );
  const staffMfaRequired = isStaff;

  if (profileOpen) {
    return (
      <AppShell>
        <ProfileSettingsPanel
          onBack={() => void navigate({ to: "/settings", search: {}, replace: true })}
        />
      </AppShell>
    );
  }

  async function logOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Could not sign out. Please retry.");
      return;
    }
    qc.clear();
    void navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error(`Couldn't copy ${label.toLowerCase()}`);
    }
  }

  return (
    <AppShell>
      <BoardHeader back />

      <div className="px-5 pb-8">
        <h1 className="font-display text-[30px] leading-tight font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account, security, app preferences and Nuru Faith support.
        </p>

        <Section title="Account">
          {isStaff && <RowLink icon={LayoutDashboard} label="Admin Dashboard" to="/admin" />}
          <RowButton
            icon={UserCog}
            label="Profile"
            description="Photo, username, display name and bio"
            onClick={() =>
              void navigate({ to: "/settings", search: { panel: "profile" }, replace: true })
            }
          />
          <RowButton
            icon={ShieldCheck}
            label="Privacy & Security"
            onClick={() => setSecurityOpen((open) => !open)}
            expanded={securityOpen}
          />
          <RowLink icon={Bell} label="Notifications" to="/notifications" />
        </Section>

        {securityOpen && (
          <Panel>
            <h3 className="font-display text-lg font-semibold">Privacy & Security</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Change your password, manage two-factor authentication or delete your account.
            </p>
            <div className="mt-4">
              <MfaSecurityPanel required={staffMfaRequired} />
              <AccountSecurityPanel />
            </div>
          </Panel>
        )}

        <Section title="Appearance">
          <fieldset className="px-1 py-1">
            <legend className="sr-only">Theme</legend>
            {THEME_OPTIONS.map(({ value, label, hint, icon: Icon }) => {
              const active = preference === value;
              return (
                <label
                  key={value}
                  className={cn(
                    "flex min-h-14 cursor-pointer items-center gap-3.5 rounded-xl px-3 transition-colors",
                    "focus-within:ring-2 focus-within:ring-ring",
                    active ? "bg-accent" : "hover:bg-surface-2",
                  )}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={value}
                    checked={active}
                    onChange={() => setPreference(value)}
                    className="sr-only"
                  />
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      active ? "text-primary" : "text-ink-3",
                    )}
                    strokeWidth={1.9}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold">{label}</span>
                    <span className="block truncate text-[12.5px] text-ink-3">{hint}</span>
                  </span>
                  {active && (
                    <Check className="h-4.5 w-4.5 shrink-0 text-primary" strokeWidth={2.4} />
                  )}
                </label>
              );
            })}
          </fieldset>
        </Section>

        <Section title="Preferences">
          <RowButton
            icon={Languages}
            label="Language"
            value="English"
            onClick={() => setLanguageOpen((open) => !open)}
            expanded={languageOpen}
          />
        </Section>

        {languageOpen && (
          <Panel>
            <h3 className="font-display text-lg font-semibold">Language</h3>
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/8 p-3">
              <Languages className="h-5 w-5 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">English</span>
                <span className="block text-xs text-muted-foreground">
                  Current interface language
                </span>
              </span>
              <Check className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Nuru can still show multilingual Scripture, music and media when the source provides
              it. The app interface is currently maintained in English so controls stay consistent.
            </p>
          </Panel>
        )}

        <Section title="About">
          <RowButton
            icon={CircleHelp}
            label="Help & Support"
            onClick={() => setSupportOpen((open) => !open)}
            expanded={supportOpen}
          />
          <RowButton
            icon={Info}
            label="About Nuru Faith"
            onClick={() => setAboutOpen((open) => !open)}
            expanded={aboutOpen}
          />
        </Section>

        {supportOpen && (
          <Panel>
            <h3 className="font-display text-xl font-semibold">Help & Support</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Nuru Faith support is handled by Vortiqora Technologies. You can call, WhatsApp or
              email the team directly.
            </p>

            <div className="mt-4 space-y-3">
              {HELPLINES.map((line, index) => (
                <div key={line.tel} className="rounded-2xl border border-border bg-surface-2 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
                    Helpline {index + 1}
                  </p>
                  <p className="mt-1 text-base font-semibold">{line.display}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <a
                      href={`tel:${line.tel}`}
                      className="nuru-soft-control inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold"
                    >
                      <Phone className="h-4 w-4" /> Call
                    </a>
                    <a
                      href={`https://wa.me/${line.wa}`}
                      target="_blank"
                      rel="noreferrer"
                      className="nuru-soft-control inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold"
                    >
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-border bg-surface-2 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">
                  Company email
                </p>
                <p className="mt-1 break-all text-base font-semibold">{COMPANY_EMAIL}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`mailto:${COMPANY_EMAIL}?subject=Nuru%20Faith%20Support`}
                    className="nuru-soft-control inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold"
                  >
                    <Mail className="h-4 w-4" /> Email support
                  </a>
                  <button
                    type="button"
                    onClick={() => void copy(COMPANY_EMAIL, "Email")}
                    className="nuru-soft-control inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold"
                  >
                    <Copy className="h-4 w-4" /> Copy
                  </button>
                </div>
              </div>
            </div>
          </Panel>
        )}

        {aboutOpen && (
          <Panel>
            <div className="flex items-start gap-3">
              <span className="nuru-disc h-11 w-11 shrink-0">
                <HeartHandshake className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold">Nuru Faith</h3>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  Faith. Community. Purpose.
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Nuru Faith is a Christian platform for young people to grow closer to God, understand
              Scripture, build healthy Christian community, receive mentorship, learn through
              courses and devotionals, worship through music, discover events and serve with
              purpose.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              The platform brings Bible reading, guided learning, Reels, community conversations,
              mentorship, music and podcasts, events and faith-focused AI tools into one connected
              experience. Nuru Faith is developed by Vortiqora Technologies.
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <AboutLink to="/bible" icon={BookOpen} label="Bible" />
              <AboutLink to="/faith-courses" icon={BookOpen} label="Courses" />
              <AboutLink to="/community" icon={Users} label="Community" />
              <AboutLink to="/mentors" icon={HeartHandshake} label="Mentorship" />
              <AboutLink to="/music" icon={Music2} label="Music & media" />
              <AboutLink to="/reels" icon={MessageCircle} label="Reels" />
            </div>

            <div className="mt-5 rounded-xl border border-border bg-surface-2 p-4 text-xs leading-relaxed text-muted-foreground">
              <p>
                <strong className="text-foreground">Company:</strong> Vortiqora Technologies
              </p>
              <p className="mt-1">
                <strong className="text-foreground">Email:</strong> {COMPANY_EMAIL}
              </p>
              <p className="mt-1">
                <strong className="text-foreground">Helpline:</strong>{" "}
                {HELPLINES.map((line) => line.display).join(" · ")}
              </p>
            </div>
          </Panel>
        )}

        <button
          type="button"
          onClick={() => void logOut()}
          className="mt-6 min-h-12 w-full rounded-full border border-destructive/40 bg-destructive/10 text-[14px] font-semibold text-destructive transition-colors hover:bg-destructive/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Log out
        </button>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Log out is intentionally kept here in Settings so account actions stay in one place.
        </p>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="px-1 pb-2 text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
        {title}
      </h2>
      <div className="rounded-2xl border border-border bg-card p-1">{children}</div>
    </section>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="nuru-card mt-3 p-5">{children}</section>;
}

const ROW_CLASS =
  "flex min-h-13 w-full items-center gap-3.5 rounded-xl px-3 text-left transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function RowLink({
  icon: Icon,
  label,
  description,
  to,
}: {
  icon: LucideIcon;
  label: string;
  description?: string;
  to: string;
}) {
  return (
    <Link to={to} className={ROW_CLASS}>
      <Icon className="h-[18px] w-[18px] shrink-0 text-ink-3" strokeWidth={1.9} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{label}</span>
        {description && (
          <span className="mt-0.5 block truncate text-[11px] text-ink-3">{description}</span>
        )}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={2} />
    </Link>
  );
}

function RowButton({
  icon: Icon,
  label,
  value,
  description,
  onClick,
  expanded,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  description?: string;
  onClick: () => void;
  expanded?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} aria-expanded={expanded} className={ROW_CLASS}>
      <Icon className="h-[18px] w-[18px] shrink-0 text-ink-3" strokeWidth={1.9} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">{label}</span>
        {description && (
          <span className="mt-0.5 block truncate text-[11px] text-ink-3">{description}</span>
        )}
      </span>
      {value && <span className="shrink-0 text-[13px] text-ink-3">{value}</span>}
      <ChevronRight
        className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform", expanded && "rotate-90")}
        strokeWidth={2}
      />
    </button>
  );
}

function AboutLink({
  to,
  icon: Icon,
  label,
}: {
  to: "/bible" | "/faith-courses" | "/community" | "/mentors" | "/music" | "/reels";
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="nuru-soft-control flex min-h-12 items-center gap-2 rounded-xl px-3 text-sm font-semibold"
    >
      <Icon className="h-4 w-4 text-primary" />
      <span>{label}</span>
    </Link>
  );
}
