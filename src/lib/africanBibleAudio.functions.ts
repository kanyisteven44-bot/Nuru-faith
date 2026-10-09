import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceNuruRateLimit } from "./rateLimit";
import { AFRICAN_CLOUD_VOICES, escapeSpeechXml } from "./africanCloudVoices";

/**
 * OPTIONAL paid provider.
 * No Azure credentials or costs are required for the existing browser voices.
 * Cloud TTS MUST NOT run until an administrator intentionally sets all three:
 * NURU_CLOUD_TTS_ENABLED=true, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION.
 *
 * Small 280-character utterances and an existing authenticated rate limit
 * protect the upstream service. For large-scale launch, also set Azure-side
 * spending limits and monitor billing; these checks are not a monthly cap.
 */
const AzureInput = z.object({
  text: z.string().trim().min(1).max(280),
  voice: z.string().max(80),
});
const enabled = () =>
  process.env["NURU_CLOUD_TTS_ENABLED"] === "true" &&
  !!process.env["AZURE_SPEECH_KEY"] &&
  !!process.env["AZURE_SPEECH_REGION"];

export const getAfricanCloudAudioStatus = createServerFn({ method: "GET" })
  .handler(async () => ({
    enabled: enabled(),
    // Safe public data: voice names, never provider secrets.
    voices: AFRICAN_CLOUD_VOICES,
  }));

export const synthesizeAfricanBibleAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((value: unknown) => AzureInput.parse(value))
  .handler(async ({ data, context }): Promise<{ audioBase64: string; mime: string }> => {
    if (!enabled()) throw new Error("Cloud narration is not enabled yet. Use a device voice for now.");

    const voice = AFRICAN_CLOUD_VOICES.find((v) => v.voice === data.voice);
    if (!voice) throw new Error("That language does not have an approved cloud voice.");
    const region = process.env["AZURE_SPEECH_REGION"]!;
    if (!/^[a-z0-9-]{2,32}$/.test(region))
      throw new Error("Invalid cloud Speech region configuration.");

    await enforceNuruRateLimit(
      context.supabase, "ai",
      "You have reached the short audio playback limit. Please try again in a few minutes.",
    );

    const ssml = \`<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="\${voice.locale}"><voice name="\${voice.voice}">\${escapeSpeechXml(data.text)}</voice></speak>\`;
    const res = await fetch(\`https://\${region}.tts.speech.microsoft.com/cognitiveservices/v1\`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": process.env["AZURE_SPEECH_KEY"]!,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3",
        "User-Agent": "NuruFaithBible/1.0",
      },
      body: ssml,
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      console.error("[Bible TTS] Azure rejected request", res.status);
      throw new Error("Cloud voice is temporarily unavailable. Please try a device voice.");
    }

    if (!(res.headers.get("content-type") ?? "").toLowerCase().includes("audio/"))
      throw new Error("The cloud provider returned an invalid audio response.");

    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 180_000)
      throw new Error("Cloud narration returned an unexpected audio size.");

    // Small per-verse MP3 only. No credentials or arbitrary audio URLs exposed.
    return { audioBase64: bytes.toString("base64"), mime: "audio/mpeg" };
  });
