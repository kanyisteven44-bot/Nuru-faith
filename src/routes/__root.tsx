import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { OfflineNotice } from "@/components/nuru/OfflineNotice";
import { LegacyDomainNotice } from "@/components/nuru/LegacyDomainNotice";
import { canonicalBrowserDestination, isInstalledApp, isLegacyNuruHost, LEGACY_CANONICAL_INIT_SCRIPT } from "@/lib/pwaMode";
import { supabase } from "@/integrations/supabase/client";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { ThemeProvider } from "@/hooks/useTheme";
import { createAuthRefreshHandler } from "@/lib/authRefresh";

// Read directly (not through the `supabase` proxy, which throws if unset) so a
// missing env var can never break page rendering — this link is a pure
// speed optimization, never a requirement.
const SUPABASE_URL: string | undefined =
  import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold nuru-gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">This page isn't here</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground nuru-glow-sm"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. Try again or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground nuru-glow-sm"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-border bg-surface-2 px-5 text-sm font-medium text-secondary-foreground"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Nuru Faith — Faith. Community. Purpose." },
      {
        name: "description",
        content:
          "Nuru Faith is a Christian platform for young people: Scripture, devotionals, community, mentorship, music and events.",
      },
      { name: "theme-color", content: "#F5F7FA" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "Nuru" },
      { name: "application-name", content: "Nuru Faith" },
      { name: "author", content: "Vortiqora Technologies" },
      { property: "og:site_name", content: "Nuru Faith" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "en_KE" },
      { property: "og:image", content: "https://app.nurufaith.co.ke/photos/friends-outdoors.jpg" },
      { property: "og:image:alt", content: "Nuru Faith — Christian faith, learning and community" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://app.nurufaith.co.ke/photos/friends-outdoors.jpg" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      {
        rel: "preload",
        as: "font",
        type: "font/woff2",
        href: "/fonts/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2",
        crossOrigin: "anonymous",
      },
      // Nearly every screen calls Supabase (data + media) as soon as it mounts;
      // starting the connection while the JS bundle is still loading shaves
      // real latency off the first request instead of starting it cold.
      ...(SUPABASE_URL
        ? [
            { rel: "preconnect", href: SUPABASE_URL },
            { rel: "dns-prefetch", href: SUPABASE_URL },
          ]
        : []),
      { rel: "icon", type: "image/png", href: "/favicon.png?v=cross2" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.png?v=cross2" },
      { rel: "manifest", href: "/manifest.webmanifest" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Sets the theme class before anything paints, so there is never a
            flash of the wrong one. Must stay ahead of HeadContent. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: LEGACY_CANONICAL_INIT_SCRIPT }} />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  // The official public experience lives only at .co.ke. Redirect old-domain
  // browser visits while leaving already-installed legacy PWAs on their origin.
  // Sensitive OAuth/password-reset callbacks must never switch origins.
  useEffect(() => {
    // People following an old emailed reset/confirmation link must be able to
    // finish the whole authentication flow on that origin. Keep this tab on
    // legacy for the rest of its session to avoid losing a fresh login after
    // the callback navigates to Home.
    let finishingOldAuth = false;
    try {
      const current = new URL(window.location.href);
      const authPath = ["/auth-callback", "/reset-password", "/verify", "/confirm", "/auth/confirm"]
        .includes(current.pathname);
      const authQuery = ["code", "token", "token_hash", "access_token", "refresh_token", "state"]
        .some((key) => current.searchParams.has(key));
      const authHash = /(?:^|[&#])(?:access_token|refresh_token|code|token_hash)=/.test(current.hash);
      if (isLegacyNuruHost(current.hostname) && (authPath || authQuery || authHash)) {
        sessionStorage.setItem("nuru-legacy-auth-in-progress", "1");
      }
      finishingOldAuth = sessionStorage.getItem("nuru-legacy-auth-in-progress") === "1";
    } catch {
      // Private storage may be blocked: the stateless helper still protects
      // the sensitive auth/callback URL itself.
    }
    const destination = canonicalBrowserDestination(
      window.location.href,
      isInstalledApp() || finishingOldAuth,
    );
    if (destination) window.location.replace(destination);
  }, [pathname]);

  useEffect(() => {
    // Browser visitors who are about to move to .co.ke do not need to install
    // the deprecated origin's service worker. Existing standalone apps still do.
    if (isLegacyNuruHost(window.location.hostname) && !isInstalledApp()) return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.warn("[PWA] Service worker registration failed", error);
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  useEffect(() => {
    const refresh = createAuthRefreshHandler((accountChanged) => {
      if (accountChanged) queryClient.clear();
      else void queryClient.invalidateQueries();
      void router.invalidate();
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      refresh.handle(event, session?.user.id ?? null);
    });
    return () => {
      refresh.dispose();
      data.subscription.unsubscribe();
    };
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Outlet />
        <LegacyDomainNotice />
        <Toaster position="top-center" />
        <OfflineNotice />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
