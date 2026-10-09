/**
 * Regional voice allowlist checked against Microsoft Azure Speech's
 * published neural TTS locales, 9 October 2026.
 * Only explicit mappings are allowed: a Kikuyu, Dholuo, Kamba or Luganda
 * Bible must NEVER be read with a nearby language and labeled authentic.
 */
export type AfricanCloudVoice = {
  locale: string;
  voice: string;
  label: string;
};

export const AFRICAN_CLOUD_VOICES: readonly AfricanCloudVoice[] = [
  { locale: "sw-KE", voice: "sw-KE-ZuriNeural", label: "Kiswahili Kenya · Zuri" },
  { locale: "sw-KE", voice: "sw-KE-RafikiNeural", label: "Kiswahili Kenya · Rafiki" },
  { locale: "sw-TZ", voice: "sw-TZ-RehemaNeural", label: "Kiswahili Tanzania · Rehema" },
  { locale: "sw-TZ", voice: "sw-TZ-DaudiNeural", label: "Kiswahili Tanzania · Daudi" },
  { locale: "am-ET", voice: "am-ET-MekdesNeural", label: "Amharic · Mekdes" },
  { locale: "am-ET", voice: "am-ET-AmehaNeural", label: "Amharic · Ameha" },
  { locale: "so-SO", voice: "so-SO-UbaxNeural", label: "Somali · Ubax" },
  { locale: "so-SO", voice: "so-SO-MuuseNeural", label: "Somali · Muuse" },
  { locale: "af-ZA", voice: "af-ZA-AdriNeural", label: "Afrikaans · Adri" },
  { locale: "af-ZA", voice: "af-ZA-WillemNeural", label: "Afrikaans · Willem" },
  { locale: "zu-ZA", voice: "zu-ZA-ThandoNeural", label: "isiZulu · Thando" },
  { locale: "zu-ZA", voice: "zu-ZA-ThembaNeural", label: "isiZulu · Themba" },
] as const;

export function cloudVoicesForBibleLocale(locale: string | null): AfricanCloudVoice[] {
  if (!locale) return [];
  // Don't infer "sw-CD" or "sw-UG" voice support from sw-KE.
  return AFRICAN_CLOUD_VOICES.filter((entry) => entry.locale.toLowerCase() === locale.toLowerCase());
}

export function escapeSpeechXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
