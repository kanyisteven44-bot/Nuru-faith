import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SDK_URL = "https://accounts.google.com/gsi/client";
const GOOGLE_CLIENT_ID = import.meta.env["VITE_GOOGLE_CLIENT_ID"] as string | undefined;

type CredentialResponse = { credential?: string };
type GoogleIdentityApi = {
  initialize(config: {
    client_id: string;
    callback(response: CredentialResponse): void;
    nonce: string;
    ux_mode: "popup";
    auto_select: false;
    use_fedcm_for_button: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type: "standard";
      theme: "outline";
      size: "large";
      shape: "rectangular";
      text: "continue_with";
      width: number;
    },
  ): void;
};
type GoogleWindow = Window & { google?: { accounts?: { id?: GoogleIdentityApi } } };

let sdkPromise: Promise<GoogleIdentityApi> | null = null;
function loadGoogleIdentity(): Promise<GoogleIdentityApi> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<GoogleIdentityApi>((resolve, reject) => {
    const current = (window as GoogleWindow).google?.accounts?.id;
    if (current) return resolve(current);
    const script = document.createElement("script");
    script.src = SDK_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const api = (window as GoogleWindow).google?.accounts?.id;
      if (api) resolve(api);
      else reject(new Error("Google sign-in didn't finish loading."));
    };
    script.onerror = () => reject(new Error("Could not load Google's secure sign-in button."));
    document.head.appendChild(script);
  }).catch((error) => {
    sdkPromise = null; // Allow retry if connectivity returns.
    throw error;
  });
  return sdkPromise;
}

/** Google requires the SHA-256 hash in its ID token, while Supabase checks
 * the original unpredictable nonce. Generate a new nonce per button mount.
 */
export async function createGoogleNonce(): Promise<{ nonce: string; hashedNonce: string }> {
  const random = crypto.getRandomValues(new Uint8Array(32));
  const nonce = btoa(String.fromCharCode(...random));
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce));
  const hashedNonce = Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return { nonce, hashedNonce };
}

type Props = {
  onSuccess(): void;
  onError(error: string): void;
};

/**
 * A Google-issued button on Nuru's own installed-PWA page.
 * The credential callback is handled in-place, so it cannot leave the
 * signed-in Nuru Home screen inside an external Chrome Custom Tab.
 * Never activate when a Google web client ID isn't configured.
 */
export function GoogleEmbeddedSignIn({ onSuccess, onError }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onSuccess, onError });
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    callbacks.current = { onSuccess, onError };
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(GOOGLE_CLIENT_ID)) {
      setUnavailable(true);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        const [api, { nonce, hashedNonce }] = await Promise.all([
          loadGoogleIdentity(),
          createGoogleNonce(),
        ]);
        if (!active || !buttonRef.current) return;
        api.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: hashedNonce,
          ux_mode: "popup",
          auto_select: false,
          use_fedcm_for_button: true,
          callback: async (response) => {
            if (!active) return;
            if (!response.credential) {
              callbacks.current.onError("Google didn't return a sign-in credential. Try again.");
              return;
            }
            try {
              const { data, error } = await supabase.auth.signInWithIdToken({
                provider: "google",
                token: response.credential,
                nonce,
              });
              if (error) throw error;
              if (!data.session) throw new Error("Google sign-in did not create a Nuru session.");
              if (active) callbacks.current.onSuccess();
            } catch (error) {
              if (active) callbacks.current.onError(
                error instanceof Error ? error.message : "Google sign-in failed. Try again.",
              );
            }
          },
        });
        const width = Math.min(Math.max(buttonRef.current.clientWidth || 280, 200), 380);
        api.renderButton(buttonRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
          width,
        });
        setReady(true);
      } catch {
        if (active) setUnavailable(true);
      }
    };
    void load();
    return () => { active = false; };
  }, []);

  return (
    <div className="mt-6 space-y-2">
      {!unavailable && (
        <div
          ref={buttonRef}
          aria-label="Continue with Google inside Nuru Faith"
          className="flex min-h-11 w-full items-center justify-center overflow-hidden rounded-xl bg-white"
        />
      )}
      {!ready && !unavailable && (
        <p role="status" className="text-center text-xs text-muted-foreground">
          Preparing secure Google sign-in…
        </p>
      )}
      {unavailable && (
        <p role="status" className="text-center text-xs text-muted-foreground">
          In-app Google sign-in is unavailable on this device. You can use email or browser sign-in.
        </p>
      )}
    </div>
  );
}
