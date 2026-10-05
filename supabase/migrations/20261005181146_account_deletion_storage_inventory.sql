-- Used only by the authenticated account-deletion Edge Function's service client.
create or replace function public.account_deletion_storage_inventory(account_id uuid)
returns table(bucket_id text, name text)
language sql stable security definer set search_path = ''
as $$
  select o.bucket_id, o.name from storage.objects o
  where o.owner_id = account_id::text or o.owner = account_id
  order by o.bucket_id, o.name limit 1000
$$;
revoke all on function public.account_deletion_storage_inventory(uuid) from public, anon, authenticated;
grant execute on function public.account_deletion_storage_inventory(uuid) to service_role;
