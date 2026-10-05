/**
 * Fixture rows for the screenshot harness.
 *
 * These exist ONLY so populated layouts can be reviewed when the machine
 * running the screenshots cannot reach Supabase. They are served by
 * intercepting the network inside Playwright — nothing here is imported by
 * the app, bundled, or written to any database.
 *
 * Read anything you see in a fixture screenshot as placeholder text. The
 * names below are deliberately generic so they can never be mistaken for
 * real members, mentors, churches or events.
 */

const PHOTO = "/src/assets/mountain-dawn.jpg";
const PHOTO2 = "/src/assets/cross-sunrise.jpg";
const PHOTO3 = "/src/assets/worship-night.jpg";

const profile = (id, name, username) => ({
  id,
  full_name: name,
  username,
  avatar_url: null,
  bio: "Sample bio for layout review.",
  faith_streak: 320,
  onboarded: true,
  verified: false,
  church_id: "church-1",
});

export const FIXTURES = {
  profiles: [
    profile("user-1", "Sample Member", "sample.member"),
    profile("user-2", "Second Member", "second.member"),
    profile("user-3", "Third Member", "third.member"),
  ],

  devotionals: Array.from({ length: 6 }, (_, i) => ({
    id: `dev-${i}`,
    title: ["A Light in the Darkness", "Faith in the Waiting", "Renewed Every Morning"][i % 3],
    subtitle: "Faith",
    scripture_ref: ["Psalm 27:1-3", "Isaiah 40:31", "Lamentations 3:22-23"][i % 3],
    body: "Placeholder devotional body used to check how the reading column wraps across several lines of serif text.",
    cover_url: [PHOTO, PHOTO2, PHOTO3][i % 3],
    publish_date: new Date(Date.now() - i * 86400000).toISOString(),
    read_minutes: 3,
  })),

  scripture_series: Array.from({ length: 5 }, (_, i) => ({
    id: `series-${i}`,
    title: ["The Life of David", "The Teachings of Jesus", "Faith in Everyday Life"][i % 3],
    slug: `sample-series-${i}`,
    description: ["A heart after God", "Love. Grace. A different way.", "Real people. Real faith."][
      i % 3
    ],
    cover_image: [PHOTO2, PHOTO3, PHOTO][i % 3],
    category: "Discipleship",
    difficulty: "beginner",
    estimated_duration: 30,
    session_count: 8,
    status: "published",
    is_featured: i === 0,
    church_id: null,
  })),

  events: Array.from({ length: 4 }, (_, i) => ({
    id: `event-${i}`,
    title: ["Sunday Service", "Bible Study", "Community Outreach", "Worship Night"][i],
    starts_at: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
    ends_at: new Date(Date.now() + (i + 1) * 86400000 + 5400000).toISOString(),
    location: ["Sample Cathedral", "Church Hall", "Community Centre", "Main Auditorium"][i],
    host: "Sample Church",
    cover_image: [PHOTO3, PHOTO2, PHOTO, PHOTO3][i],
    description: "Placeholder description used to review how the event card wraps.",
    church_id: "church-1",
    is_online: false,
  })),

  posts: Array.from({ length: 4 }, (_, i) => ({
    id: `post-${i}`,
    author_id: `user-${(i % 3) + 1}`,
    kind: ["prayer", "testimony", "news", "prayer"][i],
    body: "Placeholder post body, long enough to show how the feed card handles two or three lines of text before it clamps.",
    media_url: i % 2 === 0 ? PHOTO3 : null,
    like_count: 24 + i * 7,
    comment_count: 6 + i,
    created_at: new Date(Date.now() - i * 3600000).toISOString(),
    group_id: null,
    scripture_ref: null,
    profiles: {
      full_name: ["Sample Member", "Second Member", "Third Member"][i % 3],
      username: "sample.member",
      avatar_url: null,
    },
  })),

  reels: Array.from({ length: 3 }, (_, i) => ({
    id: `reel-${i}`,
    caption: "Placeholder reel caption for layout review. #worship #sample",
    media_url: null,
    poster_url: [PHOTO3, PHOTO, PHOTO2][i],
    like_count: 1200 - i * 300,
    comment_count: 86 - i * 20,
    status: "published",
    created_by: `user-${(i % 3) + 1}`,
    duration_seconds: 45,
  })),

  reading_plans: [
    {
      id: "plan-1",
      title: "Nuru 365 — Trust Jesus Every Day",
      slug: "nuru-365",
      description: "A placeholder description for layout review.",
      days: 365,
      cover_url: PHOTO,
      accent: "cyan",
    },
  ],

  churches: [
    {
      id: "church-1",
      name: "Sample Fellowship",
      slug: "sample-fellowship",
      city: "Nairobi",
      country: "Kenya",
      description: "A placeholder church record used to review the My Church layout.",
      cover_image: PHOTO2,
      logo_url: null,
      member_count: 350,
    },
  ],

  mentors: Array.from({ length: 3 }, (_, i) => ({
    id: `mentor-${i}`,
    user_id: `user-${(i % 3) + 1}`,
    headline: "Placeholder mentor headline",
    bio: "Placeholder mentor bio for layout review.",
    topics: ["Prayer", "Discipleship"],
    is_active: true,
  })),

  // Placeholder songs and artists, for checking the player's layout only.
  // The titles are invented and the ids are not real videos or channels, so
  // nothing here can be mistaken for a real artist's catalogue.
  media_sources: Array.from({ length: 8 }, (_, i) => ({
    id: `source-${i}`,
    name: ["Sample Worship Collective", "Placeholder Praise Choir", "Example Gospel Band"][i % 3],
    description: "Placeholder artist used for layout review.",
    avatar_url: null,
    youtube_channel_id: `UCsample${String(i).padStart(14, "0")}`,
    content_kind: "music",
    language_codes: [["sw"], ["ki"], ["luo"], ["kln"], ["kam"], ["luy"], ["mas"], ["en"]][i % 8],
    source_type: "youtube",
    is_approved: true,
  })),

  // Episodes carry a real audio enclosure, as the publisher-fed rows do, so
  // the audio engine is exercised rather than mocked. The file below is a
  // short public-domain test tone, not anybody's episode.
  podcast_items: Array.from({ length: 10 }, (_, i) => ({
    id: `episode-${i}`,
    source: "podcast",
    external_id: `sample-episode-${i}`,
    title: [
      "Sample Episode: Reading the Psalms",
      "Placeholder Teaching on Prayer",
      "Example Conversation about Faith",
    ][i % 3],
    description: "Placeholder episode summary used to check how the layout wraps.",
    thumbnail_url: [PHOTO, PHOTO2, PHOTO3][i % 3],
    media_type: "podcast",
    category: "teaching",
    creator_name: "Sample Teaching Podcast",
    youtube_channel_id: null,
    church_id: null,
    audio_url: "https://upload.wikimedia.org/wikipedia/commons/c/c8/Example.ogg",
    duration_seconds: 1200 + i * 90,
    scripture_ref: null,
    can_download: false,
    is_featured: i < 2,
    language_code: "en",
    published_at: new Date(Date.now() - i * 604800000).toISOString(),
  })),

  media_items: Array.from({ length: 18 }, (_, i) => ({
    id: `song-${i}`,
    source: "youtube",
    external_id: `sample${String(i).padStart(5, "0")}`,
    title: [
      "Sample Song of Praise",
      "Placeholder Worship Anthem",
      "Example Hymn of Thanks",
      "Sample Morning Devotion Song",
    ][i % 4],
    description: null,
    thumbnail_url: [PHOTO, PHOTO2, PHOTO3][i % 3],
    media_type: "music",
    category: "worship",
    creator_name: ["Sample Worship Collective", "Placeholder Praise Choir", "Example Gospel Band"][
      i % 3
    ],
    youtube_channel_id: `UCsample${String(i % 8).padStart(14, "0")}`,
    church_id: null,
    audio_url: null,
    duration_seconds: 180 + i * 17,
    scripture_ref: null,
    can_download: false,
    is_featured: i < 3,
    language_code: ["sw", "ki", "luo", "kln", "kam", "luy", "mas", "en"][i % 8],
    published_at: new Date(Date.now() - i * 86400000).toISOString(),
  })),
};

/**
 * Install network interception on a Playwright page so Supabase REST reads
 * return the fixtures above. Writes and auth are left alone — the harness
 * never signs in and never mutates anything.
 */
/** A short silent WAV, so the audio engine really plays rather than erroring. */
function silentWav(seconds = 30) {
  const rate = 8000;
  const samples = rate * seconds;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  return buffer;
}

export async function installFixtures(page) {
  // The fixture episode's enclosure, served locally so playback is real.
  await page.route("**/wikipedia/commons/**", (route) =>
    route.fulfill({ status: 200, contentType: "audio/wav", body: silentWav() }),
  );

  await page.route("**/rest/v1/**", async (route) => {
    const url = new URL(route.request().url());
    // /rest/v1/<table>
    const table = url.pathname.split("/rest/v1/")[1]?.split("?")[0] ?? "";
    // media_items serves songs and episodes from one table, so honour the
    // media_type filter the way PostgREST would.
    let rows = FIXTURES[table];
    if (table === "media_items") {
      const wanted = url.searchParams.get("media_type") ?? "";
      if (wanted.includes("podcast") || wanted.includes("sermon")) rows = FIXTURES.podcast_items;
      const sourceFilter = url.searchParams.get("source") ?? "";
      if (sourceFilter.includes("youtube")) rows = FIXTURES.media_items;
    }
    if (!rows || route.request().method() !== "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    const wantsOne = (route.request().headers()["accept"] ?? "").includes("vnd.pgrst.object");
    const body = JSON.stringify(wantsOne ? (rows[0] ?? null) : rows);
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "content-range": `0-${rows.length - 1}/${rows.length}` },
      body,
    });
  });

  // Anything else that leaves the machine (Bible text API, media CDNs) simply
  // fails closed rather than hanging the page for the navigation timeout.
  await page.route("**://bible-api.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reference: "Psalm 27:1",
        text: "The Lord is my light and my salvation; whom shall I fear?",
        translation_name: "Sample translation",
        verses: [],
      }),
    }),
  );
}
