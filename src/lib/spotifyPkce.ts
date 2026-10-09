// Spotify PKCE browser flow. The Client ID is public; never embed a Client Secret.
export const SPOTIFY_CLIENT_ID = ["87ee8128","53fd4bc3","b196a59d","dc6ad446"].join("");
export const SPOTIFY_CALLBACK_PATH = "/auth/spotify/callback";
export const spotifyRedirectUri = () => window.location.origin + SPOTIFY_CALLBACK_PATH;
const key = (part: string) => "nuru_spotify_" + part;
const encode = (data: Uint8Array) => btoa(String.fromCharCode(...data)).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
export async function startSpotifyConnect() {
  const verifier = encode(crypto.getRandomValues(new Uint8Array(48)));
  const state = encode(crypto.getRandomValues(new Uint8Array(24)));
  const digest = await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier));
  sessionStorage.setItem(key("verifier"),verifier);
  sessionStorage.setItem(key("state"),state);
  const query = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,response_type:"code",redirect_uri:spotifyRedirectUri(),
    code_challenge_method:"S256",code_challenge:encode(new Uint8Array(digest)),state,scope:"user-read-private"
  });
  window.location.assign("https://accounts.spotify.com/authorize?" + query.toString());
}
export async function finishSpotifyConnect(search: string): Promise<string> {
  const params = new URLSearchParams(search);
  const state = sessionStorage.getItem(key("state"));
  const verifier = sessionStorage.getItem(key("verifier"));
  sessionStorage.removeItem(key("state"));
  sessionStorage.removeItem(key("verifier"));
  if(params.has("error")) throw new Error("Spotify authorization was denied.");
  if(!state || !verifier || params.get("state") !== state || !params.get("code"))
    throw new Error("Spotify session expired. Please connect again.");
  const response = await fetch("https://accounts.spotify.com/api/token",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({grant_type:"authorization_code",code:params.get("code")!,client_id:SPOTIFY_CLIENT_ID,code_verifier:verifier,redirect_uri:spotifyRedirectUri()})
  });
  if(!response.ok) throw new Error("Spotify authorization failed. Check the registered redirect URI.");
  const data: {access_token?:string} = await response.json();
  if(!data.access_token) throw new Error("Spotify returned no access token.");
  return data.access_token;
}
