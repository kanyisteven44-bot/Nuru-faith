
CREATE POLICY "nuru media readable" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('avatars','church-images','post-media','reel-media','course-media','podcast-media'));

CREATE POLICY "nuru media upload own" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id IN ('avatars','church-images','post-media','reel-media','course-media','podcast-media')
  AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "nuru media update own" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('avatars','church-images','post-media','reel-media','course-media','podcast-media')
  AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "nuru media delete own" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('avatars','church-images','post-media','reel-media','course-media','podcast-media')
  AND (storage.foldername(name))[1] = auth.uid()::text);
