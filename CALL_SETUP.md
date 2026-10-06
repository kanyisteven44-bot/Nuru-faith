# Call connectivity

Incoming calls are checked across all signed-in pages using Realtime, with a two-second polling fallback. A ringtone can play after the person interacts with the app.

When a user has enabled Nuru browser notifications, creating a call also creates a critical Web Push alert. That alert can arrive while Nuru is minimized or closed on browsers/PWAs that support background Web Push, and tapping **Open call** deep-links back to the caller's message thread where the normal Answer/Decline UI takes over. Call alerts use a short push TTL so an old missed call is not delivered much later.

This is still a web/PWA implementation, not a native telephony integration. A fully suspended browser cannot present the same OS-level full-screen incoming-call surface as WhatsApp/FaceTime. Native Android/iOS incoming-call UI requires a native wrapper plus platform push/call APIs (FCM/APNs with Android Telecom/ConnectionService or iOS CallKit).

For calls across restrictive NAT/mobile/workplace networks, configure a managed TURN relay in Vercel production:

- `TURN_URLS`: comma-separated TURN endpoints, including TLS on port 443 when supported.
- `TURN_USERNAME`: relay account username.
- `TURN_CREDENTIAL`: relay account password.

Credentials are server environment variables, served through an authenticated function. Prefer short-lived provider-issued credentials for a larger deployment; this initial configuration uses a dedicated, quota-limited static account. Without these variables, calls use STUN and direct connections only. Never claim every network is supported without a real two-device test on different networks.

Test audio and video separately: caller opens a direct conversation; recipient stays on Home or Profile; verify ringing, decline, answer, both media directions, mute, camera, hangup, and permission refusal. Then repeat with one phone on mobile data and the other on Wi-Fi.

# Post music

The initial picker includes 64 Kevin MacLeod tracks sourced from the publisher catalogue at https://incompetech.com/music/royalty-free/pieces.json, retrieved October 5, 2026. The publisher lists them under CC BY 4.0. Attribution and the license link appear with each selected/published soundtrack. Audio is streamed from the publisher and starts at the selected offset. Music is a separate soundtrack player rather than a baked-in exported video. Commercial song search requires a licensed catalogue provider.
