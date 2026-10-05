revoke all on public.direct_messages from authenticated;
grant select, insert on public.direct_messages to authenticated;
grant update (delivered_at, read_at) on public.direct_messages to authenticated;

revoke all on public.call_sessions from authenticated;
grant select, insert on public.call_sessions to authenticated;
grant update (status, answer, answered_at, ended_at) on public.call_sessions to authenticated;

revoke all on public.call_ice_candidates from authenticated;
grant select, insert on public.call_ice_candidates to authenticated;
