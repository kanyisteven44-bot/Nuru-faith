export const EMOJI_GROUPS = [
  {
    name: "Common",
    symbols:
      "😂 🤣 😊 😍 🥰 😭 😎 😅 😁 🙂 🙃 😉 😘 🤗 🤔 😮 😢 🥹 🫶 ❤️ 💙 💜 💚 💛 🧡 🤍 🖤 💔 ❤️‍🔥 🙏 🙌 👍 👎 👏 👋 🤝 💪 🔥 ✨ 🎉 💯 ✅ 👀 🥳 😇 🕊️",
  },
  {
    name: "Faces",
    symbols:
      "😀 😃 😄 😆 😋 😛 😜 🤪 😝 🤑 🤭 🫢 🫣 🤫 🤨 😐 😑 😶 🫥 😏 😒 🙄 😬 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🤧 🥵 🥶 🥴 😵 🤯 🥸 😕 🫤 😟 🙁 ☹️ 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😓 😩 😫 😤 😡 😠 🤬 😈 👿 💀 ☠️ 👻 🤖 😺 😸 😹 😻 😼 😽 🙀 😿 😾",
  },
  {
    name: "Hands",
    symbols:
      "🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ 🫵 ✊ 👊 🤛 🤜 🤚 👐 🤲 💅 ✍️ 👍🏻 👍🏼 👍🏽 👍🏾 👍🏿 🙏🏻 🙏🏼 🙏🏽 🙏🏾 🙏🏿 👋🏻 👋🏼 👋🏽 👋🏾 👋🏿 🫶🏻 🫶🏼 🫶🏽 🫶🏾 🫶🏿",
  },
  {
    name: "Love",
    symbols: "💕 💞 💓 💗 💖 💘 💝 💟 ❣️ ❤️‍🩹 🩷 🩵 🩶 💌 💋 🌹 🥀 🌷 🌺 🌸 🌼 🌻 💐 🧸 🎁 🎀 💍 🫂",
  },
  {
    name: "Faith",
    symbols: "✝️ 📖 🛐 ⛪ 🕯️ 🪔 🌅 🌄 🌈 🌟 ⭐ 💫 ☀️ 🌤️ 🌙 🕊️ 🙏 🙌 😇 🤲 🫶 💒 🎶 🎵 🎼 🎤 🎸 🎹",
  },
  {
    name: "Nature",
    symbols:
      "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🦋 🐝 🐢 🐬 🐳 🦅 🦉 🐣 🐥 🐧 🦆 🌍 🌎 🌏 🌊 🌴 🌳 🌿 🍀 🍃 🍂 🍁 🏔️ 🌋 🌠 🌌 ⚡ ❄️ ☔ 🌧️",
  },
  {
    name: "Food",
    symbols:
      "🍎 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍍 🥭 🥑 🥕 🌽 🥔 🥐 🍞 🥞 🧀 🍳 🍗 🍖 🍔 🍟 🍕 🌭 🥪 🌮 🌯 🍝 🍜 🍛 🍚 🍿 🍩 🍪 🎂 🍰 🧁 🍫 🍬 🍭 🍯 🥛 ☕ 🍵 🧃 🥤 🧋 💧",
  },
  {
    name: "Life",
    symbols:
      "⚽ 🏀 🏈 🎾 🏐 🏓 🏸 🏆 🥇 🥈 🥉 🎯 🎮 🎲 🧩 🎨 🎬 🎧 🥁 🪘 💃 🕺 🚶 🏃 🏋️ 🧘 🚴 🏊 🛌 🏠 🏫 🏥 🏢 🚗 🚕 🚌 🚲 🏍️ ✈️ 🚀 🚦 📱 💻 ⌨️ 📷 🎥 💡 📚 📝 ✏️ 📅 ⏰ 💰 💸 💼 🛍️ 🇰🇪",
  },
  {
    name: "Symbols",
    symbols:
      "❌ ❎ ✔️ ☑️ ➕ ➖ ➗ ✖️ ❓ ❔ ❗ ❕ ‼️ ⁉️ 💬 💭 🗨️ 🔔 🔕 📢 📣 🔒 🔓 🔑 🛡️ ⚠️ 🚫 ⛔ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🟤 🔷 🔶 🔹 🔸 ◀️ ▶️ ⏸️ ⏹️ 🔁 🔄 🔗 📍 🏳️ 🏁",
  },
] as const;

const emojiNames: Record<string, string> = {
  "😂": "laugh tears joy funny",
  "🤣": "rolling laugh funny",
  "😊": "smile happy blush",
  "😍": "love heart eyes",
  "🥰": "love hearts",
  "😭": "cry tears sad",
  "😎": "cool sunglasses",
  "🙏": "pray please thanks thank you",
  "🙌": "praise celebrate hands",
  "👍": "thumbs up yes okay",
  "👎": "thumbs down no",
  "❤️": "red heart love",
  "💙": "blue heart love",
  "🤔": "think question",
  "🥹": "touched happy tears",
  "🫶": "heart hands love",
  "🔥": "fire hot lit",
  "🎉": "party celebrate congratulations",
  "💯": "hundred perfect",
  "✅": "check yes done",
  "🕊️": "dove peace faith",
  "🇰🇪": "Kenya flag",
  "☕": "coffee tea",
  "📖": "Bible book read",
  "👀": "eyes looking",
  "👋": "wave hello goodbye",
  "🤝": "handshake agreement",
  "👏": "clap applause",
  "😇": "angel blessed",
  "🥳": "party birthday",
  "💔": "broken heart sad",
  "✝️": "cross Christian Jesus",
  "⛪": "church worship",
  "🫂": "hug comfort",
  "💪": "strong strength",
  "🤗": "hug welcome",
  "😢": "cry sad",
  "😅": "laugh nervous sweat",
  "🙂": "smile happy",
  "🙃": "upside down smile",
  "😉": "wink",
  "😘": "kiss love",
  "💀": "skull dead funny",
  "✨": "sparkles shine",
  "🎂": "cake birthday",
  "🎁": "gift present",
  "🌹": "rose flower love",
  "😴": "sleep tired",
  "😡": "angry mad",
  "🥺": "pleading please",
  "😮": "surprise wow",
  "💃": "dance",
  "📱": "phone",
  "💻": "laptop computer",
  "⚽": "football soccer",
  "🎶": "music song",
  "🌅": "sunrise morning",
  "🌙": "moon night",
  "💚": "green heart love",
  "💛": "yellow heart love",
  "💜": "purple heart love",
  "🧡": "orange heart love",
  "🤍": "white heart love",
  "🖤": "black heart love",
};
export const EMOJIS = [...new Set(EMOJI_GROUPS.flatMap((group) => group.symbols.split(" ")))];
export function emojiMatches(symbol: string, category: string, query: string) {
  const needle = query.trim().toLocaleLowerCase();
  return (
    !needle ||
    `${symbol} ${category} ${emojiNames[symbol] || ""}`.toLocaleLowerCase().includes(needle)
  );
}

const packs = [
  {
    name: "Everyday",
    color: "#dbeafe",
    items: [
      ["👋", "Hey there!"],
      ["😊", "Good morning"],
      ["🌙", "Good night"],
      ["🤝", "Thank you!"],
      ["👍", "Got it!"],
      ["🫶", "You're welcome"],
      ["☕", "Coffee time"],
      ["👀", "I'm listening"],
      ["🏃", "On my way"],
      ["💬", "Let's talk"],
    ],
  },
  {
    name: "Reactions",
    color: "#fef3c7",
    items: [
      ["😂", "Too funny!"],
      ["🤣", "Can't stop laughing"],
      ["😮", "WOW!"],
      ["🔥", "That's fire!"],
      ["🤔", "Thinking…"],
      ["🙈", "Oops!"],
      ["😎", "So cool"],
      ["🥹", "Happy tears"],
      ["😅", "My bad"],
      ["🤯", "Mind blown"],
    ],
  },
  {
    name: "Faith",
    color: "#e0e7ff",
    items: [
      ["🙏", "Praying for you"],
      ["🙌", "Amen!"],
      ["✝️", "Jesus loves you"],
      ["📖", "Stay in the Word"],
      ["🕊️", "Peace be with you"],
      ["😇", "Stay blessed"],
      ["🌅", "New mercies"],
      ["🌟", "Let your light shine"],
      ["🎶", "Praise the Lord"],
      ["❤️", "God is faithful"],
    ],
  },
  {
    name: "Love",
    color: "#fce7f3",
    items: [
      ["❤️", "Sending love"],
      ["🫂", "Big hug"],
      ["🥰", "You're loved"],
      ["💙", "Here for you"],
      ["🌹", "For you"],
      ["🫶", "Love this!"],
      ["💖", "You matter"],
      ["💌", "Thinking of you"],
      ["🧸", "Take care"],
      ["💕", "Love you lots"],
    ],
  },
  {
    name: "Encourage",
    color: "#dcfce7",
    items: [
      ["💪", "You got this!"],
      ["🌱", "Keep growing"],
      ["✨", "Keep shining"],
      ["🏆", "Proud of you!"],
      ["🤲", "One day at a time"],
      ["🌈", "There is hope"],
      ["🛡️", "Stay strong"],
      ["🚀", "Keep going"],
      ["💯", "Believe in yourself"],
      ["🌻", "Better days ahead"],
    ],
  },
  {
    name: "Celebrate",
    color: "#ffedd5",
    items: [
      ["🎉", "Congratulations!"],
      ["🎂", "Happy birthday!"],
      ["👏", "Well done!"],
      ["🥳", "Let's celebrate"],
      ["🎓", "You did it!"],
      ["🥇", "Champion!"],
      ["🎁", "A little surprise"],
      ["🎊", "Big win!"],
      ["💃", "Happy dance"],
      ["⭐", "Superstar!"],
    ],
  },
  {
    name: "Feelings",
    color: "#ede9fe",
    items: [
      ["😴", "Need some rest"],
      ["🥺", "Please?"],
      ["😭", "Not okay today"],
      ["😤", "Deep breaths"],
      ["😌", "Feeling peaceful"],
      ["🤗", "So happy!"],
      ["😬", "Awkward…"],
      ["🥴", "What a day"],
      ["😔", "I'm sorry"],
      ["🤍", "Be gentle"],
    ],
  },
  {
    name: "Community",
    color: "#cffafe",
    items: [
      ["🇰🇪", "Karibu!"],
      ["🤝", "Tuko pamoja"],
      ["🙌", "Sawa sawa!"],
      ["💙", "Our Nuru family"],
      ["🎤", "Worship together"],
      ["📅", "See you there"],
      ["⛪", "Church time"],
      ["📚", "Study together"],
      ["👋", "Catch you later"],
      ["🕊️", "Peace & love"],
    ],
  },
] as const;
export type ChatSticker = { id: string; emoji: string; label: string; pack: string; color: string };
// IDs remain stable as packs grow; saved messages store the ID and a readable body.
export const STICKERS: ChatSticker[] = packs.flatMap((pack) =>
  pack.items.map(([emoji, label]) => ({
    id: `nuru:${pack.name.toLowerCase()}:${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    emoji,
    label,
    pack: pack.name,
    color: pack.color,
  })),
);
export const STICKER_PACKS = packs.map((pack) => pack.name);
export const STICKER_BY_ID = new Map(STICKERS.map((sticker) => [sticker.id, sticker]));
