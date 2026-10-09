# African Bible narration — deployment & quality plan

Nuru Faith's existing Bible reader supports matching native text-to-speech voices installed on Android. This PR adds **opt-in** Azure AI Speech neural narration for some African Bible languages. It does not start using paid resources until the authorized project owner approves and configures the provider.

## Currently verified cloud languages

Voice catalog verified from Microsoft Azure Speech language directory, 9 October 2026:
https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=tts

| Language | Locale | Voice choices |
| --- | --- | --- |
| Kiswahili, Kenya | sw-KE | Zuri, Rafiki |
| Kiswahili, Tanzania | sw-TZ | Rehema, Daudi |
| Amharic | am-ET | Mekdes, Ameha |
| Somali | so-SO | Ubax, Muuse |
| Afrikaans | af-ZA | Adri, Willem |
| isiZulu | zu-ZA | Thando, Themba |

**Do not fake language coverage.** Kikuyu/Gikuyu, Dholuo/Luo, Kamba and Luganda do not have a confirmed provider voice in this integration and still require an installed native voice or newly licensed recordings. Nuru will not read Scripture in another language while claiming it is theirs.

## Activate only with an explicit approved budget

Nuru will not contact Azure unless all 3 production Vercel **server-side** variables are configured:

1. NURU_CLOUD_TTS_ENABLED=true
2. AZURE_SPEECH_KEY=your Speech resource key, stored securely as a server secret
3. AZURE_SPEECH_REGION=your Azure Speech region

Create an Azure Speech resource at https://portal.azure.com. First establish Azure billing budget alerts and provider-level throttling. Redeploy the app after configuring the secrets. Do not expose the key as a public/VITE environment value. This work does not create an Azure subscription or spend money.

Security constraints: only authenticated Supabase users, exact supported voice names, maximum 280 text characters per request, the existing 20 requests/10-minute AI limit (shared temporarily with AI requests), 12-second upstream timeout, limited MP3 responses, and explicit user-initiated Play. This is NOT a global monthly cost cap and does not replace an Azure spending ceiling.

## Community recorded Scripture for underserved languages

The next rollout phase should accept a verified catalog indexed by Bible edition, book, chapter, verse, and locale. Before adding a recording, obtain signed permission for the Scripture edition and distribution of the audio. Recordings should include narrator name, rights holder, language dialect, source/attribution, expiry date if applicable, and native speaker review. Use compressed MP3/Opus and limit downloads based on license. No recordings are bundled in this PR because no licensing or native narrator approvals have been supplied.

## Validation before enabling

- Test each Azure voice against a real Bible passage and the configured resource; review pronunciation with native speakers.
- Test offline/slow-network error handling, pausing, retries, session expiry and navigation.
- Confirm disabled feature causes zero paid provider requests.
- Monitor characters and billing under a limited pilot before rolling out to all members.
