import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ShieldCheck } from "lucide-react";
import { AdminV3Screen } from "@/components/nuru/AdminV3Screen";
import { MfaChallenge, MfaSecurityPanel } from "@/components/nuru/MfaSecurity";
import { getMfaRequirement, type MfaRequirement } from "@/lib/accountSecurity";
import type { AdminSectionId } from "@/components/nuru/AdminCommandShell";

const ADMIN_SECTION_IDS = [
  "dashboard",
  "operations",
  "users",
  "churches",
  "content",
  "music",
  "reels",
  "community",
  "moderation",
  "roles",
] as const;

const adminSearchSchema = z.object({
  section: z.enum(ADMIN_SECTION_IDS).optional(),
});

export const Route = createFileRoute("/_authenticated/admin")({
  validateSearch: adminSearchSchema,
  head: () => ({
    meta: [
      { title: "Nuru Faith Admin" },
      { name: "robots", content: "noindex, nofollow" },
      {
        name: "description",
        content:
          "Nuru Faith administration is protected by a verified authenticator.",
      },
    ],
  }),
  component: AdminRoute,
});

type AccessState = MfaRequirement | "checking" | "error";

function AdminRoute() {
  const search = Route.useSearch();
  const [access, setAccess] = useState<AccessState>("checking");
  const [errorMessage, setErrorMessage] = useState("");

  const checkMfa = useCallback(async () => {
    setAccess("checking");
    setErrorMessage("");
    try {
      // Fail closed: the dashboard does not mount (or issue admin queries)
      // until MFA status is positively confirmed for this session.
      const requirement = await getMfaRequirement();
      setAccess(requirement);
    } catch {
      setErrorMessage("Could not verify your account security. Check your connection and retry.");
      setAccess("error");
    }
  }, []);

  useEffect(() => {
    void checkMfa();
  }, [checkMfa]);

  if (access === "none") {
    // Non-staff users still receive the role-based denial in AdminV3Screen.
    return <AdminV3Screen initialSection={(search.section ?? "dashboard") as AdminSectionId} />;
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <ShieldCheck className="h-7 w-7 shrink-0 text-leaf" aria-hidden="true" />
          <div>
            <h1 className="font-display text-lg font-semibold">
              Secure Nuru administration
            </h1>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your account needs a verified authenticator before the admin dashboard opens.
            </p>
          </div>
        </div>
        {access === "checking" && (
          <p role="status" className="rounded-xl border border-border p-5 text-sm">
            Checking your security settings…
          </p>
        )}
        {access === "challenge" && (
          <MfaChallenge title="Verify your admin session" onSuccess={() => void checkMfa()} />
        )}
        {access === "setup" && (
          <MfaSecurityPanel required onReady={() => void checkMfa()} />
        )}
        {access === "error" && (
          <div role="alert" className="space-y-3 rounded-xl border border-border p-5">
            <p className="text-sm text-destructive">{errorMessage}</p>
            <button
              type="button"
              onClick={() => void checkMfa()}
              className="min-h-11 w-full rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Retry security check
            </button>
          </div>
        )}
        <Link to="/settings" className="block text-center text-sm font-semibold text-leaf hover:underline">
          Account security settings
        </Link>
        <Link to="/home" className="block text-center text-sm text-muted-foreground hover:underline">
          Back to Nuru Faith
        </Link>
      </div>
    </main>
  );
}
