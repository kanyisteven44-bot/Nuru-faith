import { NuruMark } from "./Logo";
import { MOBILE_NAV } from "./nav";

/**
 * The app frame as a static placeholder. Signed-in screens are client-only,
 * so this is what the server sends in their place: it paints with the HTML and
 * CSS alone instead of a blank page while the JavaScript and session load.
 * Plain links keep the bottom bar usable before the app takes over.
 */
export function AppFrameSkeleton() {
  return (
    <div className="relative min-h-dvh bg-background" aria-busy="true">
      <div className="mx-auto flex w-full max-w-[1480px] gap-6 lg:p-6">
        <aside className="hidden w-[232px] shrink-0 flex-col rounded-3xl border border-border bg-surface p-4 lg:flex">
          <span className="mb-6 flex items-center gap-2.5 px-2">
            <NuruMark className="h-9 w-9" />
            <span className="font-sans text-[19px] font-bold tracking-tight">Nuru Faith</span>
          </span>
        </aside>
        <div className="min-w-0 flex-1 lg:rounded-3xl lg:border lg:border-border lg:bg-surface lg:p-6">
          <main className="relative z-10 w-full px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-28 lg:px-0 lg:pt-0 lg:pb-0">
            <div className="flex items-center gap-2.5 lg:hidden">
              <NuruMark className="h-9 w-9" />
              <span className="font-sans text-[19px] font-bold tracking-tight">Nuru Faith</span>
            </div>
            <div className="mt-6 space-y-3" aria-label="Loading">
              <div className="h-24 animate-pulse rounded-2xl border border-border bg-surface-2/70" />
              <div className="h-20 animate-pulse rounded-2xl border border-border bg-surface-2/70" />
              <div className="h-20 animate-pulse rounded-2xl border border-border bg-surface-2/70" />
            </div>
          </main>
        </div>
      </div>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:hidden"
      >
        <ul className="nuru-nav-dock mx-auto grid max-w-xl grid-cols-5 gap-1 rounded-[26px] border border-border-strong p-1.5 backdrop-blur-xl">
          {MOBILE_NAV.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <a
                href={to}
                className="nuru-soft-control flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-[19px] px-0.5 text-[10px] font-semibold text-ink-2"
              >
                <Icon className="h-5 w-5" strokeWidth={1.8} />
                <span>{label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
