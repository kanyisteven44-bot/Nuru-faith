export type SharePayload = {
  title: string;
  text?: string | undefined;
  url: string;
};

/**
 * Tries the OS share sheet (every installed app that registers as a share
 * target — WhatsApp, Instagram, Messages, Mail, etc. — not just a fixed
 * list). Returns true when the share was handled, including a user
 * cancelling it, so the caller only falls back to `ShareSheet` when the API
 * is genuinely unavailable or actually failed.
 */
export async function tryNativeShare(payload: SharePayload): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    await navigator.share(
      payload.text
        ? { title: payload.title, text: payload.text, url: payload.url }
        : { title: payload.title, url: payload.url },
    );
    return true;
  } catch (e) {
    return e instanceof Error && e.name === "AbortError";
  }
}

export function shareIntentUrls(payload: SharePayload) {
  const url = payload.url;
  const text = payload.text ?? payload.title;
  const combined = `${text} ${url}`.trim();
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(combined)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    email: `mailto:?subject=${encodeURIComponent(payload.title)}&body=${encodeURIComponent(`${text}\n\n${url}`)}`,
    sms: `sms:?body=${encodeURIComponent(combined)}`,
  };
}
