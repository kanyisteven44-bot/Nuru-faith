import { Mail, Link2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Sheet } from "@/components/nuru/reels/Sheet";
import { shareIntentUrls, type SharePayload } from "@/lib/share";

/**
 * Fallback for browsers without the native OS share sheet (`navigator.share`
 * — mainly desktop). Opens each platform's own share-intent URL in a new
 * tab/app; nothing is posted on the person's behalf without them confirming
 * it there.
 */
export function ShareSheet({ payload, onClose }: { payload: SharePayload; onClose: () => void }) {
  const urls = shareIntentUrls(payload);

  function openIntent(href: string) {
    window.open(href, "_blank", "noopener,noreferrer");
    onClose();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(payload.url);
    toast.success("Link copied");
    onClose();
  }

  return (
    <Sheet label="Share" onClose={onClose} height="max-h-[60dvh]" title={<Title />}>
      <div className="grid grid-cols-4 gap-3 px-4 pt-1 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <Option label="WhatsApp" tint="bg-[#25D366]" onClick={() => openIntent(urls.whatsapp)}>
          <WhatsAppIcon />
        </Option>
        <Option label="Facebook" tint="bg-[#1877F2]" onClick={() => openIntent(urls.facebook)}>
          <FacebookIcon />
        </Option>
        <Option label="X" tint="bg-black" onClick={() => openIntent(urls.x)}>
          <XIcon />
        </Option>
        <Option label="Telegram" tint="bg-[#26A5E4]" onClick={() => openIntent(urls.telegram)}>
          <TelegramIcon />
        </Option>
        <Option label="Messages" tint="bg-surface-2" onClick={() => openIntent(urls.sms)}>
          <MessageSquare className="h-5 w-5 text-secondary-foreground" />
        </Option>
        <Option label="Email" tint="bg-surface-2" onClick={() => openIntent(urls.email)}>
          <Mail className="h-5 w-5 text-secondary-foreground" />
        </Option>
        <Option label="Copy link" tint="bg-surface-2" onClick={() => void copyLink()}>
          <Link2 className="h-5 w-5 text-secondary-foreground" />
        </Option>
      </div>
    </Sheet>
  );
}

function Title() {
  return <h2 className="font-display text-base font-semibold">Share</h2>;
}

function Option({
  label,
  tint,
  onClick,
  children,
}: {
  label: string;
  tint: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 text-center active:opacity-80"
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-full ${tint}`}>
        {children}
      </span>
      <span className="text-[11px] font-medium text-secondary-foreground">{label}</span>
    </button>
  );
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M12.05 2c-5.523 0-10 4.477-10 10 0 1.77.46 3.49 1.334 5.008L2 22l5.13-1.345A9.96 9.96 0 0 0 12.05 22c5.523 0 10-4.477 10-10s-4.477-10-10-10zm0 18.153a8.13 8.13 0 0 1-4.147-1.136l-.297-.176-3.043.799.812-2.968-.193-.305A8.14 8.14 0 1 1 20.19 12a8.15 8.15 0 0 1-8.14 8.153z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="white">
      <path d="M13.5 21v-7.5h2.5l.5-3h-3V8.5c0-.87.24-1.46 1.5-1.46H16.5V4.36C16.02 4.3 15.24 4.24 14.33 4.24c-2.14 0-3.6 1.31-3.6 3.72V10.5H8v3h2.73V21h2.77z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="white">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="white">
      <path d="M21.9 3.6 2.6 11.1c-.9.35-.9 1.6.03 1.92l4.72 1.62 1.83 5.62c.24.73 1.17.94 1.7.38l2.45-2.6 4.63 3.4c.7.51 1.7.13 1.9-.72l3.1-14.7c.22-1.02-.8-1.86-1.76-1.42zM8.6 13.7l9.2-5.8c.16-.1.32.12.18.24l-7.6 6.9-.3 3.2z" />
    </svg>
  );
}
