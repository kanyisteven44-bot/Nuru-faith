// Read the PUBLIC Google OAuth client ID advertised by the Nuru Supabase
// authorization endpoint. This never logs tokens or user credentials.
const url = new URL("https://qnqkcqywvqzfkickezxd.supabase.co/auth/v1/authorize");
url.searchParams.set("provider", "google");
url.searchParams.set("redirect_to", "https://nurufaith.co.ke/auth-callback");
const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(15000) });
const location = response.headers.get("location") || "";
console.log("HTTP status", response.status);
if (response.status !== 302 || !location) throw new Error("Cannot inspect public provider redirect");
const redirect = new URL(location);
if (!["accounts.google.com","www.google.com"].includes(redirect.hostname)) {
  console.log("Unexpected provider redirect hostname", redirect.hostname);
  throw new Error("Unexpected OAuth provider redirect");
}
const id = redirect.searchParams.get("client_id") || "";
if (!/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(id)) {
  throw new Error("Google OAuth redirect missing well-formed public client ID");
}
console.log("PUBLIC_GOOGLE_CLIENT_ID=" + id);
