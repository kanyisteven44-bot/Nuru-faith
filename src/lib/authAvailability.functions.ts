import { createServerFn } from "@tanstack/react-start";

/** Only public provider flags, never credentials or management settings. */
export const authAvailability = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env["SUPABASE_URL"] || import.meta.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return { google: null, phone: null };
  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return { google: null, phone: null };
    const settings = (await response.json()) as {
      external?: { google?: boolean; phone?: boolean };
    };
    return {
      google: typeof settings.external?.google === "boolean" ? settings.external.google : null,
      phone: typeof settings.external?.phone === "boolean" ? settings.external.phone : null,
    };
  } catch {
    return { google: null, phone: null };
  }
});
