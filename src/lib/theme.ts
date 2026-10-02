/**
 * Appearance: Light, Dark, or follow the device.
 *
 * The choice is stored under one key and applied by toggling a `dark` class on
 * <html>. The same key and the same logic are used by the blocking script in
 * the document head (see THEME_INIT_SCRIPT), so the correct theme is on the
 * element before first paint and there is no flash of the wrong one.
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "nuru-theme";

/** Page colour per theme, kept in step with --background in styles.css. */
export const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: "#F5F7FA",
  dark: "#14161A",
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

/** What is stored, or "system" when nothing valid is. */
export function readStoredTheme(): ThemePreference {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(raw) ? raw : "system";
  } catch {
    // Private mode or blocked storage — follow the device.
    return "system";
  }
}

export function storeTheme(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Not fatal: the choice simply will not survive a reload.
  }
}

export function prefersDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches === true
  );
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") return prefersDark() ? "dark" : "light";
  return preference;
}

/** Put the resolved theme on <html> and keep the browser chrome in step. */
export function applyTheme(resolved: ResolvedTheme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLOR[resolved]);
}

/**
 * Runs in the document head before anything paints. Deliberately small, with
 * no imports, and wrapped so a storage exception can never block rendering.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = null;
    try { stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)}); } catch (e) {}
    var pref = (stored === "light" || stored === "dark" || stored === "system") ? stored : "system";
    var dark = pref === "dark" ||
      (pref === "system" && window.matchMedia &&
       window.matchMedia("(prefers-color-scheme: dark)").matches);
    var root = document.documentElement;
    root.classList.toggle("dark", dark);
    root.style.colorScheme = dark ? "dark" : "light";
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? ${JSON.stringify(THEME_COLOR.dark)} : ${JSON.stringify(THEME_COLOR.light)});
  } catch (e) {}
})();
`.trim();
