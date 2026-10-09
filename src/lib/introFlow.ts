/** A single, versioned intro flag. No auth tokens, user data or PWA state. */
export const INTRO_STORAGE_KEY = "nuru-faith-intro-v1-completed";

export function introWasCompleted(store?: Pick<Storage, "getItem"> | null): boolean {
  try {
    const target = store === undefined
      ? (typeof window !== "undefined" ? window.localStorage : null)
      : store;
    return target?.getItem(INTRO_STORAGE_KEY) === "1";
  } catch {
    // Private mode / disabled storage must never block app startup.
    return false;
  }
}

export function completeIntro(store?: Pick<Storage, "setItem"> | null): void {
  try {
    const target = store === undefined
      ? (typeof window !== "undefined" ? window.localStorage : null)
      : store;
    target?.setItem(INTRO_STORAGE_KEY, "1");
  } catch {
    // Continue even if storage is unavailable.
  }
}

export function firstEntryDestination(
  hasSession: boolean,
  introCompleted: boolean,
): "/home" | "/welcome" | "/auth" {
  if (hasSession) return "/home";
  return introCompleted ? "/auth" : "/welcome";
}
