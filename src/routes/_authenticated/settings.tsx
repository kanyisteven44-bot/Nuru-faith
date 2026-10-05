import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Info,
  Languages,
  Monitor,
  Moon,
  ShieldCheck,
  Sun,
  UserCog,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, BoardHeader } from "@/components/nuru/AppShell";
import { MfaSecurityPanel } from "@/components/nuru/MfaSecurity";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import type { ThemePreference } from "@/lib/theme";
import { fetchMyRoles } from "@/services/content";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Nuru Faith" },
      { name: "description", content: "Manage your Nuru Faith account, privacy and preferences." },
    ],
  }),
  component: SettingsScreen,
});

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
  const qc = useQueryClient();
  const { userId } = useAuth();
  const { preference, setPreference } = useTheme();
  const [securityOpen, setSecurityOpen] = useState(false);

  const roles = useQuery({
    queryKey: ["roles", userId],
    queryFn: () => fetchMyRoles(userId!),
    enabled: !!userId,
  });
  const isStaff = (roles.data ?? []).some((row) =>
    ["super_admin", "moderator", "church_admin"].includes(String(row.role)),
  );
  const staffMfaRequired = isStaff;

  async function logOut() {
    qc.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  return (
    <AppShell>
      <BoardHeader back />

      <div className="px-5 pb-8">
        <h1 className="font-display text-[30px] leading-tight font-semibold">Settings</h1>

        {/* Account */}
        <Section title="Account">
          {isStaff && <RowLink icon={LayoutDashboard} label="Admin Dashboard" to="/admin" />}
          <RowLink icon={UserCog} label="Account" to="/profile" />
          <RowButton
            icon={ShieldCheck}
            label="Privacy & Security"
            onClick={() => setSecurityOpen((open) => !open)}
            expanded={securityOpen}
          />
          <RowLink icon={Bell} label="Notifications" to="/notifications" />
        </Section>

        {securityOpen && (
          <div className="mt-2">
            <MfaSecurityPanel required={staffMfaRequired} />
          </div>
        )}

        {/* Appearance — the real control, wired to the theme provider. */}
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

        {/* Preferences */}
        <Section title="Preferences">
          <RowButton
            icon={Languages}
            label="Language"
            value="English"
            onClick={() => toast("Only English is available for now.")}
          />
        </Section>

        {/* About */}
        <Section title="About">
          <RowButton
            icon={CircleHelp}
            label="Help & Support"
            onClick={() => toast("Support contact details haven't been set up yet.")}
          />
          <RowButton
            icon={Info}
            label="About Nuru Faith"
            onClick={() => toast("Faith. Community. Purpose.")}
          />
        </Section>

        <button
          type="button"
          onClick={() => void logOut()}
          className="mt-6 min-h-12 w-full rounded-full border border-destructive/40 bg-destructive/10 text-[14px] font-semibold text-destructive transition-colors hover:bg-destructive/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Log out
        </button>
      </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="px-1 pb-2 text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
        {title}
      </h2>
      <div className="rounded-2xl border border-border bg-card p-1">{children}</div>
    </section>
  );
}

const ROW_CLASS =
  "flex min-h-13 w-full items-center gap-3.5 rounded-xl px-3 text-left transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

function RowLink({ icon: Icon, label, to }: { icon: LucideIcon; label: string; to: string }) {
  return (
    <Link to={to} className={ROW_CLASS}>
      <Icon className="h-[18px] w-[18px] shrink-0 text-ink-3" strokeWidth={1.9} />
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={2} />
    </Link>
  );
}

function RowButton({
  icon: Icon,
  label,
  value,
  onClick,
  expanded,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  onClick: () => void;
  expanded?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} aria-expanded={expanded} className={ROW_CLASS}>
      <Icon className="h-[18px] w-[18px] shrink-0 text-ink-3" strokeWidth={1.9} />
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{label}</span>
      {value && <span className="shrink-0 text-[13px] text-ink-3">{value}</span>}
      <ChevronRight
        className={cn("h-4 w-4 shrink-0 text-ink-3 transition-transform", expanded && "rotate-90")}
        strokeWidth={2}
      />
    </button>
  );
}
