/**
 * Screenshots the app's screens against a local dev server, with a signed-in
 * session and Supabase reads answered from fixtures. The sandbox this runs in
 * cannot reach Supabase, and most screens are behind the login wall, so
 * without this there is no way to see a screen render before shipping it.
 *
 * Usage: npx vite dev --port 4321 & node scripts/ui-preview.mjs [outDir]
 */
import { chromium } from "playwright";
import fs from "node:fs/promises";

const BASE = process.env["PREVIEW_BASE"] ?? "http://127.0.0.1:4321";
const OUT = process.argv[2] ?? "/tmp/shots";
const PROJECT_REF = "cafttwtlqdnglzlznltm";
const USER_ID = "11111111-1111-4111-8111-111111111111";

const img = (key) => `asset:${key}`;

/** One representative row shape per table the screens read. */
const FIXTURES = {
  profiles: [
    {
      id: USER_ID,
      full_name: "Alex Kanyi",
      username: "alexkanyi",
      avatar_url: null,
      bio: "Following Jesus, one day at a time.",
      church_id: "c1",
      onboarded: true,
      created_at: "2026-01-04T08:00:00Z",
    },
  ],
  devotionals: [
    {
      id: "d1",
      title: "Finding Peace in His Presence",
      slug: "finding-peace",
      summary: "Five minutes to steady your heart before the day starts.",
      body: "Be still, and know that I am God.",
      cover_url: img("topic-hope-healing"),
      topic: "Anxiety & Peace",
      read_minutes: 5,
      published_at: "2026-09-16T05:00:00Z",
    },
    {
      id: "d2",
      title: "Morning Grace",
      slug: "morning-grace",
      summary: "His mercies are new every morning.",
      body: "Great is your faithfulness.",
      cover_url: img("topic-prayer"),
      topic: "Prayer",
      read_minutes: 3,
      published_at: "2026-09-15T05:00:00Z",
    },
    {
      id: "d3",
      title: "Walking in Purpose",
      slug: "walking-in-purpose",
      summary: "You were made on purpose, for a purpose.",
      body: "For we are God's handiwork.",
      cover_url: img("topic-faith-purpose"),
      topic: "Purpose",
      read_minutes: 6,
      published_at: "2026-09-14T05:00:00Z",
    },
  ],
  scripture_series: [
    {
      id: "s1",
      title: "Finding Your Purpose",
      slug: "finding-your-purpose",
      description: "Living with intentional faith.",
      cover_image: img("topic-faith-purpose"),
      category: "Purpose & Calling",
      difficulty: "beginner",
      estimated_duration: 40,
      session_count: 8,
      status: "published",
      is_featured: true,
      church_id: null,
    },
    {
      id: "s2",
      title: "When You're Anxious",
      slug: "when-youre-anxious",
      description: "Scripture for the nights that feel heavy.",
      cover_image: img("topic-mental-health"),
      category: "Mental Health",
      difficulty: "beginner",
      estimated_duration: 30,
      session_count: 6,
      status: "published",
      is_featured: true,
      church_id: null,
    },
    {
      id: "s3",
      title: "Foundations of Following Jesus",
      slug: "foundations-of-following-jesus",
      description: "Where discipleship actually begins.",
      cover_image: img("topic-discipleship"),
      category: "Discipleship",
      difficulty: "beginner",
      estimated_duration: 55,
      session_count: 10,
      status: "published",
      is_featured: false,
      church_id: null,
    },
    {
      id: "s4",
      title: "Relationships and Dating",
      slug: "relationships-and-dating",
      description: "Honouring God with your heart.",
      cover_image: img("topic-relationships"),
      category: "Relationships",
      difficulty: "beginner",
      estimated_duration: 45,
      session_count: 7,
      status: "published",
      is_featured: false,
      church_id: null,
    },
    {
      id: "s5",
      title: "Wisdom for Everyday Life",
      slug: "wisdom-for-everyday-life",
      description: "Proverbs for real decisions.",
      cover_image: img("topic-life-skills"),
      category: "Life Skills",
      difficulty: "beginner",
      estimated_duration: 50,
      session_count: 9,
      status: "published",
      is_featured: false,
      church_id: null,
    },
  ],
  scripture_series_sessions: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
    id: `ss${n}`,
    series_id: "s1",
    position: n,
    title: [
      "Called for More",
      "Overcoming Fear",
      "Walking in Purpose",
      "Daily Obedience",
      "When Doors Close",
      "Serving Others",
      "Staying Rooted",
      "Finishing Well",
    ][n - 1],
    introduction: "A short way in.",
    context_note: null,
    main_teaching: "God's call is rarely loud, but it is always clear enough for the next step.",
    connections: null,
    reflection_questions: ["Where is God asking you to take one step?"],
    prayer: "Lord, make me willing.",
    practical_action: "Write down one step you'll take this week.",
    discussion_prompt: "What holds you back?",
  })),
  series_progress: [
    { id: "p1", user_id: USER_ID, series_id: "s1", last_position: 3, completed: false },
  ],
  session_progress: [],
  session_scriptures: [
    {
      id: "sc1",
      session_id: "ss1",
      reference: "Jeremiah 29:11",
      book: "Jeremiah",
      scripture_role: "primary",
      explanation: "God's intent toward you is good.",
      position: 1,
    },
  ],
  posts: [
    {
      id: "po1",
      author_id: USER_ID,
      body: "Grateful for today's message 🙏 God is faithful always.",
      image_url: null,
      created_at: "2026-09-18T09:10:00Z",
      like_count: 124,
      comment_count: 12,
      profiles: { id: USER_ID, full_name: "Grace Wanjiku", username: "gracew", avatar_url: null },
    },
    {
      id: "po2",
      author_id: "u2",
      body: "His grace is enough.",
      image_url: img("topic-hope-healing"),
      created_at: "2026-09-18T07:40:00Z",
      like_count: 86,
      comment_count: 9,
      profiles: { id: "u2", full_name: "David Kamau", username: "davidk", avatar_url: null },
    },
  ],
  groups: [
    {
      id: "g1",
      name: "Youth Fellowship",
      description: "Every Friday, 6pm.",
      member_count: 324,
      church_id: "c1",
      cover_url: null,
      category: "Fellowship",
    },
    {
      id: "g2",
      name: "Bible Study",
      description: "Working through Romans.",
      member_count: 186,
      church_id: "c1",
      cover_url: null,
      category: "Study",
    },
    {
      id: "g3",
      name: "Prayer Warriors",
      description: "Daily prayer chain.",
      member_count: 412,
      church_id: "c1",
      cover_url: null,
      category: "Prayer",
    },
    {
      id: "g4",
      name: "Campus Ministry",
      description: "For students.",
      member_count: 205,
      church_id: "c1",
      cover_url: null,
      category: "Campus",
    },
  ],
  mentors: [
    {
      id: "m1",
      display_name: "Ruth Muita",
      role_title: "Spiritual Mentor",
      church_name: "ACK Cathedral Nyahururu",
      church_id: "c1",
      specialties: ["Leadership", "Youth", "Prayer"],
      bio: "Walking with young people for fifteen years.",
      photo_url: null,
      phone_number: null,
      verified: true,
    },
    {
      id: "m2",
      display_name: "David Kamau",
      role_title: "Youth Pastor",
      church_name: "ACK Cathedral Nyahururu",
      church_id: "c1",
      specialties: ["Faith", "Purpose", "Growth"],
      bio: "Here for the questions nobody else will answer.",
      photo_url: null,
      phone_number: null,
      verified: true,
    },
  ],
  mentorship_requests: [],
  churches: [
    {
      id: "c1",
      name: "ACK Cathedral Nyahururu",
      slug: "ack-nyahururu",
      denomination: "Anglican",
      city: "Nyahururu",
      verified: true,
      cover_url: img("church-interior"),
      description: "Work and Pray.",
    },
  ],
  church_members: [],
  events: [
    {
      id: "e1",
      title: "Uamsho Festival 2026",
      description: "A Generation Arising.",
      starts_at: "2026-10-15T15:00:00Z",
      ends_at: "2026-10-15T20:00:00Z",
      location: "KICC Nairobi",
      host: "Nuru Faith",
      cover_url: img("worship-night"),
      church_id: "c1",
      churches: { name: "ACK Cathedral Nyahururu" },
    },
    {
      id: "e2",
      title: "Youth Conference",
      description: "Faith. Purpose. Action.",
      starts_at: "2026-11-12T08:00:00Z",
      ends_at: "2026-11-12T17:00:00Z",
      location: "ACK Cathedral",
      host: "ACK Cathedral",
      cover_url: img("church-interior"),
      church_id: "c1",
      churches: { name: "ACK Cathedral Nyahururu" },
    },
  ],
  event_attendees: [],
  notifications: [
    {
      id: "n1",
      user_id: USER_ID,
      title: "New devotional available",
      body: "Finding Peace in His Presence",
      kind: "content",
      read: false,
      created_at: "2026-09-18T12:00:00Z",
    },
    {
      id: "n2",
      user_id: USER_ID,
      title: "Your group has a new post",
      body: "Youth Fellowship",
      kind: "group",
      read: false,
      created_at: "2026-09-18T10:00:00Z",
    },
    {
      id: "n3",
      user_id: USER_ID,
      title: "Event reminder",
      body: "Uamsho Festival 2026",
      kind: "event",
      read: true,
      created_at: "2026-09-18T08:00:00Z",
    },
  ],
  music_playlists: [
    {
      id: "mp1",
      title: "Morning Worship",
      description: "50 songs",
      cover_url: img("worship-night"),
      track_count: 50,
      category: "Worship",
    },
    {
      id: "mp2",
      title: "Peaceful Moments",
      description: "32 songs",
      cover_url: img("quiet-night"),
      track_count: 32,
      category: "Chill",
    },
    {
      id: "mp3",
      title: "Top Gospel Hits",
      description: "40 songs",
      cover_url: img("friends-dusk"),
      track_count: 40,
      category: "Praise",
    },
  ],
  music_tracks: [
    {
      id: "mt1",
      title: "Grace Like This",
      artist: "Elevation Worship",
      cover_url: img("worship-night"),
      duration: 254,
      playlist_id: "mp1",
      audio_url: null,
    },
    {
      id: "mt2",
      title: "Daily Peace",
      artist: "Nuru Devotional",
      cover_url: img("quiet-night"),
      duration: 180,
      playlist_id: "mp2",
      audio_url: null,
    },
  ],
  serve_opportunities: [
    {
      id: "so1",
      title: "Volunteer Opportunities",
      category: "Serve",
      description: "Find a place to serve.",
      church_id: "c1",
    },
    {
      id: "so2",
      title: "Mission Trips",
      category: "Missions",
      description: "Go where you're sent.",
      church_id: "c1",
    },
  ],
  user_roles: [{ id: "r1", user_id: USER_ID, role: "member", church_id: "c1" }],
  user_interests: [],
  prayer_requests: [],
  prayer_journal: [],
  reading_plans: [],
  reading_plan_days: [],
  reels: [],
  ai_conversations: [],
  ai_messages: [],
};

function tableFrom(url) {
  const m = url.match(/\/rest\/v1\/([a-z_]+)/);
  return m ? m[1] : null;
}

const session = {
  access_token: "preview.access.token",
  refresh_token: "preview.refresh.token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: {
    id: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "alex@example.com",
    email_confirmed_at: "2026-01-04T08:00:00Z",
    created_at: "2026-01-04T08:00:00Z",
    updated_at: "2026-01-04T08:00:00Z",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { full_name: "Alex Kanyi" },
    identities: [],
  },
};

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "en-KE",
  timezoneId: "Africa/Nairobi",
});

await ctx.addInitScript(
  ([ref, value]) => {
    try {
      localStorage.setItem(`sb-${ref}-auth-token`, value);
      // Skip the once-per-tab boot splash so it never covers the screenshot.
      sessionStorage.setItem("nuru-splash-shown", "1");
    } catch {
      /* preview only */
    }
  },
  [PROJECT_REF, JSON.stringify(session)],
);

// The public Bible API is unreachable from the sandbox; answer it locally.
await ctx.route("**://bible-api.com/**", (route) =>
  route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      reference: "Psalm 46:10",
      text: "Be still, and know that I am God.",
      translation_name: "World English Bible",
      verses: [
        {
          book_name: "Psalms",
          chapter: 46,
          verse: 10,
          text: "Be still, and know that I am God.",
        },
      ],
    }),
  }),
);

await ctx.route("**://*.supabase.co/**", async (route) => {
  const req = route.request();
  const url = req.url();

  if (url.includes("/auth/v1/")) {
    if (url.includes("/user"))
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(session.user),
      });
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(session),
    });
  }

  const table = tableFrom(url);
  let rows = (table && FIXTURES[table]) || [];

  // Honour `col=eq.value` and `col=in.(a,b)` filters so detail screens, which
  // look a single row up by id or slug, get the row they asked for.
  for (const [key, value] of new URL(url).searchParams) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    if (value.startsWith("eq.")) {
      const want = value.slice(3);
      rows = rows.filter((r) => String(r[key]) === want);
    } else if (value.startsWith("in.")) {
      const wanted = new Set(
        value
          .slice(3)
          .replace(/^\(|\)$/g, "")
          .split(",")
          .map((v) => v.replace(/^"|"$/g, "")),
      );
      rows = rows.filter((r) => wanted.has(String(r[key])));
    }
  }

  const single = (req.headers()["accept"] ?? "").includes("pgrst.object");
  const body = single ? JSON.stringify(rows[0] ?? null) : JSON.stringify(rows);
  return route.fulfill({
    status: single && !rows[0] ? 406 : 200,
    contentType: "application/json",
    headers: { "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}` },
    body,
  });
});

await fs.mkdir(OUT, { recursive: true });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

const SCREENS = JSON.parse(process.env["PREVIEW_SCREENS"] ?? "null") ?? [
  ["05-home", "/home"],
  ["06-explore", "/explore"],
  ["08-devotionals", "/devotionals"],
  ["09-series", "/series"],
  ["12-bible", "/bible"],
  ["13-music", "/music"],
  ["14-ai", "/ai"],
  ["15-community", "/community"],
  ["16-groups", "/groups"],
  ["17-mentors", "/mentors"],
  ["21-notifications", "/notifications"],
  ["25-events", "/events"],
  ["26-church", "/church"],
  ["profile", "/profile"],
  ["settings", "/settings"],
  ["serve", "/serve"],
];

for (const [name, route] of SCREENS) {
  try {
    await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2600);
    if (process.env["PREVIEW_DIAG"]) {
      const big = await page.evaluate(() =>
        [...document.querySelectorAll("*")]
          .map((el) => {
            const r = el.getBoundingClientRect();
            const cls = el.className?.baseVal ?? el.className ?? "";
            return {
              t: el.tagName,
              c: String(cls).slice(0, 80),
              h: Math.round(r.height),
              w: Math.round(r.width),
              src: (el.getAttribute?.("src") ?? "").slice(0, 60),
            };
          })
          .filter((x) => x.h > 600),
      );
      console.log("DIAG", name, JSON.stringify(big));
      const text = await page.evaluate(() => document.body.innerText);
      console.log("TEXT", name, text.slice(0, 400).replace(/\n+/g, " | "));
    }
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    console.log("OK  ", name, "->", page.url());
  } catch (e) {
    console.log("FAIL", name, String(e.message).split("\n")[0]);
  }
}

await browser.close();
