import { useEffect, useState } from "react";
import { isInstalledApp } from "@/lib/pwaMode";

interface PwaPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

/** Only browser visitors get an installation option; installed apps never
 * render this banner. Chrome owns its address bar and outside-app windows.
 */
export function PwaInstallGuide() {
  const [ready, setReady] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [promptEvent, setPromptEvent] = useState<PwaPromptEvent | null>(null);
  const [instructions, setInstructions] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setInstalled(isInstalledApp());
    setReady(true);

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as PwaPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setInstructions(false);
    };
    const mode = window.matchMedia("(display-mode: standalone)");
    const onMode = () => setInstalled(isInstalledApp());
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    mode.addEventListener?.("change", onMode);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      mode.removeEventListener?.("change", onMode);
    };
  }, []);

  // A user who installed Nuru on their phone should never see "Install app"
  // while using Nuru. Only show this on the verified official site.
  if (!ready || installed || window.location.hostname !== "app.nurufaith.co.ke") return null;

  const install = async () => {
    if (!promptEvent) {
      setInstructions((show) => !show);
      return;
    }
    setBusy(true);
    try {
      await promptEvent.prompt();
      await promptEvent.userChoice;
      setPromptEvent(null);
    } catch {
      setInstructions(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      aria-label="Install Nuru Faith on your phone"
      className="mt-5 rounded-2xl border border-primary/25 bg-card/80 p-4"
    >
      <p className="text-sm font-semibold text-foreground">Use Nuru Faith without a browser bar</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Install Nuru Faith from Chrome, then open it using its home-screen icon.
        The standalone app does not show Chrome's address bar while using Nuru.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void install()}
        className="mt-3 min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-60"
      >
        {busy ? "Opening installer…" : promptEvent ? "Install Nuru Faith" : "How to install Nuru Faith"}
      </button>
      {instructions && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          In Chrome, open the three-dot menu, select <strong>Install app</strong> or
          <strong> Add to Home screen</strong>, and confirm. Then open the new Nuru
          icon from your phone's home screen. If Chrome only creates a shortcut
          that still shows its address bar, use Chrome's Install app option on
          this official domain when available.
        </p>
      )}
    </section>
  );
}
