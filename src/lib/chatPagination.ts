/** Keep participant and cursor conditions together in one PostgREST .or() call.
 * Multiple .or() calls use the same `or` URL parameter; the later call replaces
 * the first, which can mix messages from different conversations during paging.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/i;

export function directChatFilter(
  self: string,
  peer: string,
  before?: { created_at: string; id: string },
): string {
  if (!UUID.test(self) || !UUID.test(peer)) throw new Error("Invalid chat participant.");
  const participants = `or(and(sender_id.eq.${self},recipient_id.eq.${peer}),and(sender_id.eq.${peer},recipient_id.eq.${self}))`;
  if (!before) return participants;
  if (!UUID.test(before.id) || !TIMESTAMP.test(before.created_at) || !Number.isFinite(Date.parse(before.created_at))) {
    throw new Error("Invalid message cursor.");
  }
  const earlier = `or(created_at.lt.${before.created_at},and(created_at.eq.${before.created_at},id.lt.${before.id}))`;
  return `and(${participants},${earlier})`;
}
