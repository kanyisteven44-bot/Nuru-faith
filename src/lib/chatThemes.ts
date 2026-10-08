export type ChatTheme = {
  id: string;
  name: string;
  category: "Classic" | "Gradients" | "Patterns" | "Colours" | "Photos";
  background: string;
  size?: string;
  position?: string;
};
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
export const CHAT_THEMES: ChatTheme[] = [
  { id: "classic", name: "Nuru classic", category: "Classic", background: "var(--background)" },
];
for (const [id, name, light, middle, ink] of palettes) {
  const variants: Omit<ChatTheme, "id" | "name">[] = [
    { category: "Gradients", background: `linear-gradient(135deg, ${light}, ${middle})` },
    {
      category: "Gradients",
      background: `radial-gradient(ellipse at top right, ${middle}, ${light} 75%)`,
    },
    { category: "Gradients", background: `linear-gradient(180deg, ${light}, ${middle}, ${light})` },
    {
      category: "Gradients",
      background: `radial-gradient(circle at 20% 30%, ${middle}, transparent 65%), linear-gradient(125deg, ${light}, ${middle})`,
    },
    {
      category: "Patterns",
      background: `radial-gradient(${ink}25 1px, transparent 1px), linear-gradient(${light},${light})`,
      size: "18px 18px, cover",
    },
    {
      category: "Patterns",
      background: `repeating-linear-gradient(45deg, ${middle}55 0 1px, transparent 1px 18px), linear-gradient(${light},${light})`,
    },
    {
      category: "Patterns",
      background: `linear-gradient(${ink}15 1px, transparent 1px), linear-gradient(90deg, ${ink}15 1px, transparent 1px), linear-gradient(${light},${light})`,
      size: "32px 32px, 32px 32px, cover",
    },
    { category: "Colours", background: light },
    { category: "Colours", background: middle },
  ];
  const labels = [
    "Soft horizon",
    "Light bloom",
    "Quiet tides",
    "Morning glow",
    "Gentle dots",
    "Fine lines",
    "Calm grid",
    "Light",
    "Deep",
  ];
  variants.forEach((v, i) =>
    CHAT_THEMES.push({ ...v, id: `${id}-${i}`, name: `${name} · ${labels[i]}` }),
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
    background: `linear-gradient(#f8fafccc,#f8fafccc), url("/photos/${id}.jpg")`,
    size: "cover",
    position: "center",
  });
export function findChatTheme(id?: string | null): ChatTheme {
  return CHAT_THEMES.find((t) => t.id === id) ?? CHAT_THEMES[0]!;
}
export function chatThemeStorageKey(userId: string, thread: string): string {
  return `nuru:chat-theme:v1:${userId}:${thread}`;
}
