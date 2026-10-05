export type CallHistoryEntry = {
  id: string;
  caller_id: string;
  callee_id: string;
  kind: string;
  status: string;
  created_at: string;
  answered_at: string | null;
  ended_at: string | null;
};
export function isMissedCall(call: CallHistoryEntry, now = Date.now()) {
  return (
    !call.answered_at &&
    (call.status === "missed" ||
      call.status === "ended" ||
      (call.status === "ringing" && now - Date.parse(call.created_at) >= 90000))
  );
}
export function callHistoryLabel(call: CallHistoryEntry, userId: string, now = Date.now()) {
  const incoming = call.callee_id === userId;
  const kind = call.kind === "video" ? "video" : "audio";
  if (isMissedCall(call, now)) return `${incoming ? "Missed" : "Unanswered"} ${kind} call`;
  if (call.status === "declined")
    return `${incoming ? "Declined" : "Call declined ·"} ${kind} call`;
  if (call.status === "ringing") return `${incoming ? "Incoming" : "Outgoing"} ${kind} call`;
  return `${incoming ? "Incoming" : "Outgoing"} ${kind} call${call.status === "active" ? " · In progress" : ""}`;
}
