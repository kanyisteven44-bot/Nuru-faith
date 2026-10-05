drop function if exists public.register_web_push_subscription(text,text,text,bigint,text);
drop function if exists public.unregister_web_push_subscription(text);
drop function if exists public.get_web_push_public_key();

revoke insert, update, delete on table public.web_push_subscriptions from authenticated;
