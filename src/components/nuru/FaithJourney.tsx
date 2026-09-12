import { cn } from "@/lib/utils";

const JOURNEY_STAGES = ["Explorer", "Growing Disciple", "Active Member", "Kingdom Impact"] as const;

const STAGE_BLURBS = [
  "Learning the basics",
  "Building your foundation",
  "Serving and leading",
  "Making a difference for Christ",
] as const;

function journeyStage(streak: number): number {
  return streak >= 90 ? 3 : streak >= 30 ? 2 : streak >= 7 ? 1 : 0;
}

/** Compact progress strip — used on Profile. */
export function FaithJourneyStrip({ streak }: { streak: number }) {
  const stage = journeyStage(streak);
  return (
    <div className="nuru-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan/80">
          Faith journey
        </p>
        <p className="text-xs font-semibold text-foreground">{JOURNEY_STAGES[stage]}</p>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {JOURNEY_STAGES.map((label, i) => (
          <div key={label} className="flex-1">
            <div
              className={cn(
                "h-1.5 rounded-full transition-colors",
                i <= stage ? "bg-gradient-to-r from-cyan to-primary" : "bg-surface-2",
              )}
            />
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {stage < 3
          ? `Keep showing up — you're growing toward ${JOURNEY_STAGES[stage + 1]}.`
          : "You're living it out. Keep leading the way."}
      </p>
    </div>
  );
}

/** Wide milestone track from the reference's "Your Faith Journey" band. */
export function FaithJourneyTrack({ streak }: { streak: number }) {
  const stage = journeyStage(streak);
  return (
    <div className="nuru-card p-5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan">
        Your faith journey
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">Track your growth as you grow in faith.</p>
      <ol className="mt-5 grid grid-cols-4 gap-2">
        {JOURNEY_STAGES.map((label, i) => {
          const reached = i <= stage;
          return (
            <li key={label} className="relative flex flex-col items-center text-center">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-[-50%] top-5 h-0.5 w-full",
                    reached ? "bg-gradient-to-r from-cyan to-primary" : "bg-surface-2",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex h-10 w-10 items-center justify-center rounded-full border text-xs font-bold",
                  reached
                    ? "border-transparent nuru-gradient-bg text-primary-foreground nuru-glow-sm"
                    : "border-border bg-surface-2 text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  "mt-2 text-[11px] font-semibold leading-tight",
                  reached ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
              <span className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                {STAGE_BLURBS[i]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
