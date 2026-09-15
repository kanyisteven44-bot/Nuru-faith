import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Info,
  Languages,
  Palette,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell, ScreenHeader } from "@/components/nuru/AppShell";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Nuru Faith" },
      { name: "description", content: "Manage your Nuru Faith account, privacy and preferences." },
    ],
  }),
  component: SettingsScreen,
});

const ROWS = [
  { icon: UserCog, label: "Account", to: "/profile" as const },
  { icon: ShieldCheck, label: "Privacy & Security", to: null, value: null },
  { icon: Bell, label: "Notifications", to: "/notifications" as const },
  { icon: Languages, label: "Language", to: null, value: "English" },
  { icon: Palette, label: "App Appearance", to: null, value: "Dark" },
  { icon: CircleHelp, label: "Help & Support", to: null, value: null },
  { icon: Info, label: "About Nuru Faith", to: null, value: null },
];

function SettingsScreen() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function logOut() {
    qc.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  return (
    <AppShell>
      <ScreenHeader title="Settings" back />

      <div className="space-y-2 px-4 pt-2">
        {ROWS.map(({ icon: Icon, label, to, value }) => {
          const inner = (
            <>
              <Icon className="h-4.5 w-4.5 shrink-0 text-cyan" strokeWidth={1.8} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>
              {value && <span className="shrink-0 text-[12px] text-muted-foreground">{value}</span>}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </>
          );
          return to ? (
            <Link key={label} to={to} className="nuru-card flex items-center gap-3 px-4 py-3.5">
              {inner}
            </Link>
          ) : (
            <button
              key={label}
              type="button"
              onClick={() => toast(`${label} isn't available yet.`)}
              className="nuru-card flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              {inner}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => void logOut()}
          className="mt-4 min-h-12 w-full rounded-xl border border-destructive/40 bg-destructive/10 text-sm font-semibold text-destructive"
        >
          Log Out
        </button>
      </div>
    </AppShell>
  );
}
