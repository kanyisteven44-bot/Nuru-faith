export type ChatTheme = {
  id: string;
  name: string;
  category: "Classic" | "Gradients" | "Patterns" | "Colours" | "Photos" | "Photo library";
  background: string;
  size?: string;
  position?: string;
  sentBackground?: string;
  sentColor?: string;
  receivedBackground?: string;
  receivedColor?: string;
  imageUrl?: string;
  photoCredit?: string;
  photoSource?: string;
};
function motif(ink: string, design: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><g fill="none" stroke="${ink}" stroke-width="1.15" stroke-opacity="0.25">${design}</g></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
const botanical =
  '<path d="M15 110Q60 70 65 8M34 88Q10 69 21 58Q48 63 43 80M50 63Q79 62 87 43Q58 38 54 55M60 35Q40 26 46 14Q66 13 64 30"/><path d="M102 113q-8-22-26-28m10 8q16-14 23-3q-4 13-16 10"/>';
const arches =
  '<path d="M0 60a60 60 0 0 1 120 0M12 60a48 48 0 0 1 96 0M24 60a36 36 0 0 1 72 0M36 60a24 24 0 0 1 48 0M48 60a12 12 0 0 1 24 0M0 120a60 60 0 0 1 120 0M12 120a48 48 0 0 1 96 0M24 120a36 36 0 0 1 72 0"/>';
const stars =
  '<path d="M25 20v12m-6-6h12M87 82v18m-9-9h18M62 47v8m-4-4h8"/><circle cx="20" cy="86" r="1.3"/><circle cx="100" cy="25" r="1.3"/><circle cx="52" cy="108" r="1"/><circle cx="48" cy="9" r="1"/><path d="M20 86l42-35 25 40" stroke-dasharray="2 5"/>';
const palettes = [
  ["ocean", "Ocean", "#e5f2ff", "#b9d7f0", "#3f74a4"],
  ["sage", "Sage", "#edf4e9", "#c6dac0", "#54785b"],
  ["rose", "Rose", "#fff0f3", "#f1cbd5", "#a75471"],
  ["lavender", "Lavender", "#f2edff", "#d3c8ee", "#8066ac"],
  ["sand", "Sand", "#faf3e7", "#e8d4b7", "#a98759"],
  ["sky", "Sky", "#e8f8ff", "#bfebef", "#438f9e"],
  ["peach", "Peach", "#fff2e9", "#f5cdb9", "#b77857"],
  ["pearl", "Pearl", "#f6f7fb", "#dce1eb", "#7a8da9"],
  ["mint", "Mint", "#e6f9f0", "#b9e3d2", "#4c927c"],
  ["midnight", "Midnight", "#182740", "#253f60", "#577da0"],
] as const;
const bubbleColours: Record<string, string> = {
  ocean: "#245b94",
  sage: "#365c42",
  rose: "#963a61",
  lavender: "#68469b",
  sand: "#745329",
  sky: "#256679",
  peach: "#914726",
  pearl: "#435572",
  mint: "#28664f",
  midnight: "#315f91",
};
export const CHAT_THEMES: ChatTheme[] = [
  { id: "classic", name: "Nuru classic", category: "Classic", background: "var(--background)" },
];
for (const [id, name, light, middle, ink] of palettes) {
  const variants: Omit<ChatTheme, "id" | "name">[] = [
    {
      category: "Gradients",
      background: `radial-gradient(ellipse at 5% 5%, ${light} 15%, transparent 60%), radial-gradient(ellipse at 95% 85%, ${ink}44, transparent 65%), linear-gradient(140deg, ${light}, ${middle})`,
    },
    {
      category: "Gradients",
      background: `radial-gradient(ellipse at 90% 10%, ${middle} 5%, transparent 60%), radial-gradient(ellipse at 10% 95%, ${ink}33, transparent 55%), linear-gradient(25deg, ${light}, ${middle})`,
    },
    {
      category: "Gradients",
      background: `radial-gradient(ellipse at 50% 125%, ${ink}55, transparent 60%), linear-gradient(180deg, ${light}, ${middle}, ${light})`,
    },
    {
      category: "Gradients",
      background: `radial-gradient(circle at 20% 30%, ${middle}, transparent 65%), linear-gradient(125deg, ${light}, ${middle})`,
    },
    {
      category: "Patterns",
      background: `${motif(ink, botanical)}, linear-gradient(135deg, ${light}, ${middle})`,
      size: "180px 180px, cover",
    },
    {
      category: "Patterns",
      background: `${motif(ink, arches)}, linear-gradient(150deg, ${light}, ${middle})`,
      size: "160px 160px, cover",
    },
    {
      category: "Patterns",
      background: `${motif(ink, stars)}, linear-gradient(175deg, ${light}, ${middle})`,
      size: "170px 170px, cover",
    },
    { category: "Colours", background: light },
    { category: "Colours", background: middle },
  ];
  const labels = [
    "Soft horizon",
    "Light bloom",
    "Quiet tides",
    "Morning glow",
    "Botanical",
    "Art deco",
    "Constellations",
    "Light",
    "Deep",
  ];
  variants.forEach((v, i) =>
    CHAT_THEMES.push({
      ...v,
      id: `${id}-${i}`,
      name: `${name} · ${labels[i]}`,
      sentBackground: bubbleColours[id] ?? "#245b94",
      sentColor: "#ffffff",
      receivedBackground: id === "midnight" ? "#1e3049" : "#ffffff",
      receivedColor: id === "midnight" ? "#f1f5f9" : "#182638",
    }),
  );
}
const photos = [
  ["mountain-lake", "Mountain lake"],
  ["alpine-reflections", "Alpine reflections"],
  ["church-sunlight", "Church sunlight"],
  ["open-bible", "Open Bible"],
  ["reading-scripture", "Scripture"],
  ["prayer-community", "Together in prayer"],
  ["friends-outdoors", "Friends outdoors"],
  ["forest-walk", "Forest walk"],
  ["worship-gathering", "Worship night"],
];
for (const [id, name] of photos)
  CHAT_THEMES.push({
    id: `photo-${id}`,
    name: name!,
    category: "Photos",
    background: `linear-gradient(#f8fafc66,#f8fafc66), url("/photos/${id}.jpg")`,
    size: "cover",
    position: "center",
    sentBackground: "#245b94",
    sentColor: "#ffffff",
    receivedBackground: "#ffffff",
    receivedColor: "#182638",
  });
/**
 * A selected real photograph resolves from its validated numeric ID even after
 * refresh or app relaunch: a chat does not need to re-download all metadata.
 */
export function realPhotoTheme(id: string, author?: string, sourceUrl?: string): ChatTheme {
  if (!/^\d{1,6}$/.test(id)) return CHAT_THEMES[0]!;
  const url = `https://picsum.photos/id/${id}/640/960.webp`;
  return {
    id: `real-photo-${id}`,
    name: author ? `Photo · ${author}` : `Photograph #${id}`,
    category: "Photos",
    background: `linear-gradient(#0a1e3520,#0a1e3520), url("${url}")`,
    imageUrl: `https://picsum.photos/id/${id}/240/320.webp`,
    photoCredit: author,
    photoSource: sourceUrl,
    size: "cover",
    position: "center",
    sentBackground: "#245b94",
    sentColor: "#ffffff",
    receivedBackground: "#ffffff",
    receivedColor: "#182638",
  };
}
export function findChatTheme(id?: string | null): ChatTheme {
  const existing = CHAT_THEMES.find((t) => t.id === id);
  if (existing) return existing;
  const match = id?.match(/^real-photo-(\d{1,6})$/);
  return match ? realPhotoTheme(match[1]!) : CHAT_THEMES[0]!;
}
export function chatThemeStorageKey(userId: string, thread: string): string {
  return `nuru:chat-theme:v1:${userId}:${thread}`;
}

export const FEATURED_CHAT_THEMES = [
  "midnight-0",
  "ocean-0",
  "lavender-1",
  "rose-1",
  "mint-0",
  "photo-mountain-lake",
  "sage-4",
  "sand-5",
  "peach-3",
  "midnight-6",
  "photo-forest-walk",
  "photo-worship-gathering",
];
export function customPhotoTheme(url: string): ChatTheme {
  return {
    id: "custom",
    name: "Your photo",
    category: "Photos",
    background: `linear-gradient(#f8fafc55,#f8fafc55), url("${url}")`,
    size: "cover",
    position: "center",
    sentBackground: "#245b94",
    sentColor: "#ffffff",
    receivedBackground: "#ffffff",
    receivedColor: "#182638",
  };
}

export function chatBubbleStyle(theme: ChatTheme, sent: boolean) {
  return sent
    ? {
        background: theme.sentBackground ?? "var(--primary)",
        color: theme.sentColor ?? "var(--primary-foreground)",
      }
    : {
        background: theme.receivedBackground ?? "var(--card)",
        color: theme.receivedColor ?? "var(--secondary-foreground)",
      };
}

export function chatWallpaperStyle(theme: ChatTheme) {
  const hasImage = /gradient\(|url\(/.test(theme.background);
  return {
    backgroundImage: hasImage ? theme.background : "none",
    backgroundColor: hasImage ? "transparent" : theme.background,
    backgroundSize: theme.size ?? "auto",
    backgroundPosition: theme.position ?? "center",
  };
}
