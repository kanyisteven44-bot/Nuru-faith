
ALTER TABLE public.posts ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.posts ADD COLUMN author_name text, ADD COLUMN author_handle text, ADD COLUMN author_avatar_url text;
