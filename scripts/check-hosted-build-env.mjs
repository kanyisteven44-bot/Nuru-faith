// Fail hosted builds before publishing a client that cannot initialize auth.
// Never print key values. Offline/local verification does not need live credentials.
export function hostedBuildEnvErrors(env) {
  if (env.NETLIFY !== "true" && env.VERCEL !== "1") return [];
  const errors = [];
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url) errors.push("VITE_SUPABASE_URL is required for the browser build");
  else {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.pathname !== "/" || parsed.search || parsed.hash)
        errors.push("VITE_SUPABASE_URL must be an HTTPS origin without credentials or query parameters");
    } catch { errors.push("VITE_SUPABASE_URL must be a valid HTTPS URL"); }
  }
  if (!key) errors.push("VITE_SUPABASE_PUBLISHABLE_KEY is required for the browser build");
  else if (!key.startsWith("sb_publishable_")) {
    let role;
    try { role = JSON.parse(Buffer.from(key.split(".")[1] ?? "", "base64url").toString()).role; }
    catch { /* Reject unknown keys without logging their contents. */ }
    if (role !== "anon") errors.push("VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable or legacy anon key; privileged keys are forbidden");
  }
  return errors;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  const errors = hostedBuildEnvErrors(process.env);
  if (errors.length) {
    console.error("Hosted build configuration failed:\n" + errors.map(error => "- " + error).join("\n"));
    process.exitCode = 1;
  }
}
