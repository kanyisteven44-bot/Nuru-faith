import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const welcome = readFileSync("src/routes/welcome.tsx", "utf8");
const music = readFileSync("src/routes/_authenticated/music.tsx", "utf8");
const discovery = readFileSync("src/components/youtube/MusicDiscovery.tsx", "utf8");
const catalog = readFileSync("src/components/youtube/MediaCatalog.tsx", "utf8");
const media = readFileSync("src/services/media.ts", "utf8");
const thread = readFileSync("src/components/nuru/RichChatThread.tsx", "utf8");
const manager = readFileSync("src/components/nuru/CallManager.tsx", "utf8");
const groups = readFileSync("src/routes/_authenticated/groups.tsx", "utf8");
const messages = readFileSync("src/routes/_authenticated/messages.tsx", "utf8");
const groupCalls = readFileSync("src/services/groupCalls.ts", "utf8");
const groupPanel = readFileSync("src/components/nuru/GroupCallPanel.tsx", "utf8");
const groupCallMigration = readFileSync(
  "supabase/migrations/20261006193000_group_call_rooms.sql",
  "utf8",
);
const presenceMigration = readFileSync(
  "supabase/migrations/20261006164739_media_directory_and_direct_presence.sql",
  "utf8",
);

test("welcome has one Continue action instead of separate signup/login buttons", () => {
  assert.match(welcome, />\s*Continue\s*</);
  assert.doesNotMatch(welcome, /Create my account/);
  assert.doesNotMatch(welcome, /I already have an account/);
});

test("music removes featured worship collection and artist profiles have catalogue fallback", () => {
  assert.doesNotMatch(music, /Featured worship collections/);
  assert.doesNotMatch(music, /Already in Nuru/);
  assert.match(discovery, /creatorName=\{selected\?\.name\}/);
  assert.match(discovery, /MediaCategoryRail/);
  assert.match(discovery, /selected\.name} songs/);
  assert.match(catalog, /hideEmptyState/);
  assert.match(media, /creatorName\?: string/);
  assert.match(media, /youtube_channel_id\.eq/);
  assert.match(media, /creator_name\.ilike/);
});

test("direct message receipts use one tick, two ticks, and yellow seen ticks", () => {
  assert.match(thread, /receipt === "delivered"/);
  assert.match(thread, /<Check className=/);
  assert.match(thread, /receipt === "online"/);
  assert.match(thread, /<CheckCheck className=/);
  assert.match(thread, /receipt === "seen"/);
  assert.match(thread, /text-amber-300/);
  assert.match(manager, /markDirectMessagesDelivered/);
  assert.match(manager, /message-delivery-/);
  assert.match(thread, /touchDirectPresence/);
  assert.match(thread, /fetchDirectPeerOnline/);
  assert.match(thread, /direct-presence-db-/);
  assert.match(thread, /peerOnline/);
  assert.match(presenceMigration, /create table if not exists public\.direct_presence/);
  assert.match(presenceMigration, /participants read direct presence/);
  assert.match(presenceMigration, /users write own direct presence/);
});

test("group chats expose real multi-person audio and video call rooms", () => {
  assert.match(groups, /Group audio/);
  assert.match(groups, /Group video/);
  assert.match(messages, /Group audio/);
  assert.match(messages, /Group video/);
  assert.match(groupPanel, /RTCPeerConnection/);
  assert.match(groupPanel, /group_call_participants/);
  assert.match(groupPanel, /group_call_signals/);
  assert.match(groupPanel, /refreshSession\(\)/);
  assert.match(groupPanel, /iceCandidatePoolSize: 4/);
  assert.match(groupCalls, /startOrJoinGroupCall/);
  assert.match(groupCalls, /sendGroupCallSignal/);
  assert.match(groupCalls, /70_000/);
});

test("group call database access is limited to real group members", () => {
  assert.match(groupCallMigration, /alter table public\.group_call_rooms enable row level security/);
  assert.match(groupCallMigration, /alter table public\.group_call_participants enable row level security/);
  assert.match(groupCallMigration, /alter table public\.group_call_signals enable row level security/);
  assert.match(groupCallMigration, /from public\.group_members gm/);
  assert.match(groupCallMigration, /gm\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(groupCallMigration, /sender_id = \(select auth\.uid\(\)\)/);
  assert.match(groupCallMigration, /recipient_id = \(select auth\.uid\(\)/);
});
