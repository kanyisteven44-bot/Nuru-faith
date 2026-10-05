-- Two more instances of the same gap fixed in 20260914120000: an RLS "update own"
-- policy is row-scoped only, so a matching UPDATE can touch any column, including
-- ones that are supposed to be staff- or creator-only.
--
-- mentors.verified: "mentors update own" only checks user_id = auth.uid(). A mentor
-- could self-set verified = true, which renders a ShieldCheck trust badge next to
-- their name on Home's Mentors rail (src/routes/_authenticated/home.tsx) — exactly
-- the kind of signal a platform vetting mentors for young people must not let users
-- grant themselves.
--
-- reel_comments.pinned: "Users update own reel comments or creator pins" allows
-- either the comment's own author OR the reel's creator to update the row, but does
-- not restrict which of the two may touch `pinned`. The app's UI already gates the
-- Pin button to the reel creator only (isCreator in
-- src/components/nuru/reels/ReelComments.tsx), but that is a client-side convention;
-- any commenter could bypass the app and PATCH their own comment's `pinned` field
-- directly, making their comment sort to the top of someone else's reel looking
-- creator-endorsed.

create or replace function public.protect_mentor_verified()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.uid() is not null and not private.is_staff(auth.uid()) then
    new.verified := old.verified;
  end if;
  return new;
end; $$;

drop trigger if exists trg_protect_mentor_verified on public.mentors;
create trigger trg_protect_mentor_verified
  before update on public.mentors
  for each row execute function public.protect_mentor_verified();

create or replace function public.protect_reel_comment_pin()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  is_reel_creator boolean;
begin
  if auth.uid() is null then
    return new;
  end if;
  select (auth.uid() = r.author_id) into is_reel_creator
  from public.reels r where r.id = new.reel_id;
  if not coalesce(is_reel_creator, false) then
    new.pinned := old.pinned;
  end if;
  return new;
end; $$;

drop trigger if exists trg_protect_reel_comment_pin on public.reel_comments;
create trigger trg_protect_reel_comment_pin
  before update on public.reel_comments
  for each row execute function public.protect_reel_comment_pin();
