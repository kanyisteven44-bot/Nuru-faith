CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.scripture_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  cover_image text,
  category text NOT NULL DEFAULT 'Life & Faith',
  difficulty text NOT NULL DEFAULT 'beginner',
  estimated_duration integer NOT NULL DEFAULT 10,
  session_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  translation_id text NOT NULL DEFAULT 'web',
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  church_id uuid REFERENCES public.churches(id) ON DELETE CASCADE,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scripture_series_status_chk CHECK (status IN ('draft','review','published','archived'))
);
GRANT SELECT ON public.scripture_series TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripture_series TO authenticated;
GRANT ALL ON public.scripture_series TO service_role;
ALTER TABLE public.scripture_series ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published series are readable" ON public.scripture_series FOR SELECT USING (status = 'published');
CREATE POLICY "Authors read their own series" ON public.scripture_series FOR SELECT TO authenticated USING (author_id = auth.uid());
CREATE POLICY "Reviewers manage series" ON public.scripture_series FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'::public.app_role) OR public.has_role(auth.uid(),'moderator'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'::public.app_role) OR public.has_role(auth.uid(),'moderator'::public.app_role));
CREATE POLICY "Church admins draft their church series" ON public.scripture_series FOR INSERT TO authenticated
  WITH CHECK (author_id = auth.uid() AND church_id IS NOT NULL AND status <> 'published' AND public.has_role(auth.uid(),'church_admin'::public.app_role));
CREATE POLICY "Church admins update their church series" ON public.scripture_series FOR UPDATE TO authenticated
  USING (author_id = auth.uid() AND public.has_role(auth.uid(),'church_admin'::public.app_role))
  WITH CHECK (author_id = auth.uid() AND status <> 'published');
CREATE INDEX idx_series_status ON public.scripture_series(status, category);
CREATE TRIGGER scripture_series_updated BEFORE UPDATE ON public.scripture_series FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.scripture_series_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES public.scripture_series(id) ON DELETE CASCADE,
  position integer NOT NULL,
  title text NOT NULL,
  introduction text,
  context_note text,
  main_teaching text,
  connections text,
  reflection_questions text[] NOT NULL DEFAULT '{}',
  prayer text,
  practical_action text,
  discussion_prompt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (series_id, position)
);
GRANT SELECT ON public.scripture_series_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripture_series_sessions TO authenticated;
GRANT ALL ON public.scripture_series_sessions TO service_role;
ALTER TABLE public.scripture_series_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sessions of readable series" ON public.scripture_series_sessions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.scripture_series s WHERE s.id = series_id AND (s.status = 'published' OR s.author_id = auth.uid())));
CREATE POLICY "Reviewers manage sessions" ON public.scripture_series_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'::public.app_role) OR public.has_role(auth.uid(),'moderator'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'::public.app_role) OR public.has_role(auth.uid(),'moderator'::public.app_role));
CREATE INDEX idx_sessions_series ON public.scripture_series_sessions(series_id, position);
CREATE TRIGGER series_sessions_updated BEFORE UPDATE ON public.scripture_series_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.session_scriptures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.scripture_series_sessions(id) ON DELETE CASCADE,
  reference text NOT NULL,
  book text,
  chapter_start integer,
  verse_start integer,
  chapter_end integer,
  verse_end integer,
  scripture_role text NOT NULL DEFAULT 'supporting',
  explanation text,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT session_scriptures_role_chk CHECK (scripture_role IN ('primary','supporting','further_reading'))
);
GRANT SELECT ON public.session_scriptures TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_scriptures TO authenticated;
GRANT ALL ON public.session_scriptures TO service_role;
ALTER TABLE public.session_scriptures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Scriptures of readable sessions" ON public.session_scriptures FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.scripture_series_sessions ss
    JOIN public.scripture_series s ON s.id = ss.series_id
    WHERE ss.id = session_id AND (s.status = 'published' OR s.author_id = auth.uid())));
CREATE POLICY "Reviewers manage session scriptures" ON public.session_scriptures FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'::public.app_role) OR public.has_role(auth.uid(),'moderator'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'super_admin'::public.app_role) OR public.has_role(auth.uid(),'moderator'::public.app_role));
CREATE INDEX idx_session_scriptures ON public.session_scriptures(session_id, position);

CREATE TABLE public.series_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  series_id uuid NOT NULL REFERENCES public.scripture_series(id) ON DELETE CASCADE,
  current_session_id uuid REFERENCES public.scripture_series_sessions(id) ON DELETE SET NULL,
  progress_percent integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, series_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.series_progress TO authenticated;
GRANT ALL ON public.series_progress TO service_role;
ALTER TABLE public.series_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own series progress" ON public.series_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER series_progress_updated BEFORE UPDATE ON public.series_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.session_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.scripture_series_sessions(id) ON DELETE CASCADE,
  series_id uuid REFERENCES public.scripture_series(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  action_done boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_progress TO authenticated;
GRANT ALL ON public.session_progress TO service_role;
ALTER TABLE public.session_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own session progress" ON public.session_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER session_progress_updated BEFORE UPDATE ON public.session_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.scripture_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  series_id uuid REFERENCES public.scripture_series(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.scripture_series_sessions(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, session_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scripture_reflections TO authenticated;
GRANT ALL ON public.scripture_reflections TO service_role;
ALTER TABLE public.scripture_reflections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own reflections" ON public.scripture_reflections FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER scripture_reflections_updated BEFORE UPDATE ON public.scripture_reflections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.saved_scriptures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reference text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reference)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_scriptures TO authenticated;
GRANT ALL ON public.saved_scriptures TO service_role;
ALTER TABLE public.saved_scriptures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own saved scriptures" ON public.saved_scriptures FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.reel_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reel_id uuid NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  feedback_type text NOT NULL DEFAULT 'not_interested',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reel_id, feedback_type),
  CONSTRAINT reel_feedback_type_chk CHECK (feedback_type IN ('not_interested','hide_creator'))
);
GRANT SELECT, INSERT, DELETE ON public.reel_feedback TO authenticated;
GRANT ALL ON public.reel_feedback TO service_role;
ALTER TABLE public.reel_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own reel feedback" ON public.reel_feedback FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_reel_feedback_user ON public.reel_feedback(user_id);

ALTER TABLE public.reels ADD COLUMN series_id uuid REFERENCES public.scripture_series(id) ON DELETE SET NULL;

INSERT INTO public.scripture_series (id, title, slug, description, category, difficulty, estimated_duration, session_count, status, is_featured, cover_image) VALUES
('11111111-1111-4111-8111-111111111111','Finding Your Purpose','finding-your-purpose','What does the Bible actually teach about purpose? Explore Scripture from Genesis to the New Testament and learn how identity, calling, gifts, work and service fit together.','Purpose & Calling','beginner',12,7,'published',true,'mountain-dawn'),
('22222222-2222-4222-8222-222222222222','When You''re Anxious','when-youre-anxious','Anxiety is not a sign of weak faith. Walk slowly through passages that show how God meets people who are carrying more than they can hold.','Difficult Seasons','beginner',10,6,'published',true,'quiet-night'),
('33333333-3333-4333-8333-333333333333','Relationships & Dating','relationships-and-dating','Identity, love, character, wisdom, boundaries and rejection — what Scripture actually says, without forcing verses to be about dating when they are not.','Relationships','beginner',14,8,'published',true,'friends-dusk');

INSERT INTO public.scripture_series_sessions (id, series_id, position, title, introduction, context_note, main_teaching, connections, reflection_questions, prayer, practical_action, discussion_prompt) VALUES
('a1000001-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111',1,'You Were Created Intentionally','Most purpose questions start with "what should I do?" Scripture starts somewhere else: who made you, and why.','Genesis 1 is the opening of the Torah, written for Israel to understand who God is and who humanity is before any law, land or career is given. The passage sits at the climax of the creation account — everything else is made, then humanity is made "in our image".','Being made in God''s image means your worth is given before you achieve anything. Purpose in the Bible begins as representation: humanity is placed in the world to reflect God''s character and care for what He made. That is a job description no unemployment, exam result or season of waiting can remove.','Genesis grounds purpose in creation, not in performance. Psalm 139 makes it personal — God''s intention reaches individual lives. Ephesians 2:10 shows the same idea after the resurrection: believers are God''s workmanship, made for good works God prepared. The pattern is consistent from the first page to the letters.',ARRAY['Do you think of purpose mostly as a job to find or a person to become?','Where do you currently look for proof that your life matters?','If your worth was settled before you achieved anything, what would change this week?'],'God, before I did anything You called me Yours. Help me stop auditioning for a worth You already gave me.','Write one sentence describing yourself without mentioning your job, course or achievements.','What did you learn about purpose growing up, and how does Genesis 1 challenge it?'),
('a1000001-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111',2,'Identity Comes Before Calling','Jesus heard "You are my beloved Son" before He preached a single sermon. Order matters.','Mark 1 records Jesus'' baptism at the very start of His public ministry — before miracles, teaching or the cross. The affirmation from the Father comes first, and is immediately followed by the wilderness where that identity is tested.','Calling flows out of identity, not the other way round. When people chase calling first, every setback feels like a verdict on their worth. When identity is settled, work becomes an expression of who you already are rather than an argument for it.','Mark 1 shows identity given before ministry. 1 Peter 2:9 says the same of the church — chosen, royal, holy, belonging — and only then "so that you may declare". Romans 8:15-17 names believers as children before servants.',ARRAY['Whose voice do you hear loudest when you think about your future?','Where are you trying to earn something God says He has already given?','What would settled identity look like in your next difficult week?'],'Father, let me hear You call me Yours before I hear anything else today.','Each morning this week, before opening your phone, name one thing God says is true of you.','How do you tell the difference between calling and pressure?'),
('a1000001-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111',3,'Understanding Gifts','God gives different gifts on purpose. Comparison is a bad map for calling.','Romans 12 is Paul''s practical turn after eleven chapters of theology. He is writing to a mixed church in Rome with real tensions, urging them to see difference as design rather than competition.','Gifts are given "according to the grace given to us" — they are not a merit ranking. Paul lists ordinary things: serving, teaching, encouraging, giving, leading, showing mercy. Purpose is often nearer and plainer than we expect.','Romans 12 and 1 Corinthians 12 both use the body image: difference is necessary, not accidental. 1 Peter 4:10 adds the reason — gifts exist to serve others, not to build a personal brand.',ARRAY['What have people repeatedly thanked you for?','Which gift do you quietly dismiss because it seems ordinary?','Whose gift do you envy, and what does that reveal?'],'Lord, thank You for what You gave me. Free me from wanting someone else''s portion.','Ask two trusted people what strengths they consistently see in you.','Which gifts does your community undervalue?'),
('a1000001-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111',4,'Purpose in Ordinary Work','Most of your life will be ordinary. Scripture takes that seriously.','Colossians was written to a young church in a working town. Paul''s instruction lands on ordinary labour, including work done by people with very little status.','"Whatever you do, work at it with all your heart, as working for the Lord." The New Testament refuses to split life into sacred and secular. Faithfulness in unnoticed work is not a waiting room before purpose — it is purpose.','Colossians 3:23-24 dignifies daily work. 1 Thessalonians 4:11-12 commends a quiet, working life. Genesis 2:15 shows work existing before anything went wrong — work is a gift, not a punishment.',ARRAY['Which part of your week feels like it does not count?','What would change if that work were done "as for the Lord"?','Who benefits from work you do that nobody sees?'],'God, meet me in the ordinary hours. Let faithfulness be enough today.','Do one unnoticed task this week with deliberate care and no announcement.','Does your church talk about everyday work? Should it more?'),
('a1000001-0000-4000-8000-000000000005','11111111-1111-4111-8111-111111111111',5,'Waiting Seasons','Joseph, Moses and David all waited years. Waiting is not wasted.','Psalm 27 is attributed to David, written from a place of real threat rather than comfort. The closing verse is an instruction to himself while nothing has yet changed.','Biblical waiting is active, not passive. It involves seeking, serving and staying faithful without a visible outcome. Scripture rarely explains the delay while it is happening.','Psalm 27:14 commands courage inside the wait. Habakkuk 2:3 says the vision "will not delay" even when it feels slow. James 5:7-8 uses the farmer''s patience — real work, unhurried timing.',ARRAY['What are you waiting for right now?','What are you refusing to start until the waiting ends?','What has this season taught you that success could not?'],'God, I do not enjoy waiting. Teach me what I can only learn here.','Begin one thing you have postponed until "the right season".','How does your community support people in long waits?'),
('a1000001-0000-4000-8000-000000000006','11111111-1111-4111-8111-111111111111',6,'Making Decisions','Scripture offers wisdom more often than it offers a map.','Proverbs 3 is fatherly instruction to a young person, written as practical wisdom rather than prediction. "Make your paths straight" is about steady direction, not a hidden single answer.','God guides through Scripture, wisdom, counsel, circumstance and community — not usually through signs that remove all risk. Trusting God with a decision means acting responsibly rather than waiting for certainty.','Proverbs 3:5-6 sets trust above self-reliance. Proverbs 11:14 adds many counsellors. James 1:5 promises wisdom to those who ask — wisdom, notably, rather than a script.',ARRAY['Which decision are you avoiding?','Are you seeking certainty or seeking wisdom?','Who could you actually ask for counsel this week?'],'God, give me wisdom rather than guarantees, and courage to act on it.','Name your decision to one wise person and ask what they see.','How do you discern God''s guidance without treating it as fortune-telling?'),
('a1000001-0000-4000-8000-000000000007','11111111-1111-4111-8111-111111111111',7,'Living Faithfully','Purpose is finally measured by love, not by scale.','Micah 6:8 comes at the end of a courtroom-style dispute between God and Israel. After elaborate offerings are dismissed, the requirement is startlingly simple.','"Act justly, love mercy, walk humbly with your God." Christian purpose is a way of living available to everyone today, in any job, at any age, in any season.','Micah 6:8 gives the shape. Matthew 22:37-39 gives the two commands everything hangs on. Galatians 5:13-14 turns freedom into service. Together they describe purpose as love expressed in ordinary faithfulness.',ARRAY['Where is injustice within your reach?','Who needs mercy from you specifically?','What has changed in how you think about purpose across this series?'],'God, make my life useful in the small, close, real places.','Choose one way to use one of your gifts to serve someone this week.','What is one thing from this series you want to keep?');

INSERT INTO public.session_scriptures (session_id, reference, book, chapter_start, verse_start, chapter_end, verse_end, scripture_role, explanation, position) VALUES
('a1000001-0000-4000-8000-000000000001','Genesis 1:26-28','Genesis',1,26,1,28,'primary','Humanity is made in God''s image and given responsibility before anything is earned.',0),
('a1000001-0000-4000-8000-000000000001','Psalm 139:13-16','Psalms',139,13,139,16,'supporting','God''s intention reaches individual lives, not just humanity in general.',1),
('a1000001-0000-4000-8000-000000000001','Ephesians 2:10','Ephesians',2,10,2,10,'supporting','Believers are God''s workmanship, prepared for good works.',2),
('a1000001-0000-4000-8000-000000000002','Mark 1:9-11','Mark',1,9,1,11,'primary','The Father affirms Jesus before any public ministry begins.',0),
('a1000001-0000-4000-8000-000000000002','1 Peter 2:9','1 Peter',2,9,2,9,'supporting','Identity as a chosen people comes before the call to declare God''s praise.',1),
('a1000001-0000-4000-8000-000000000002','Romans 8:15-17','Romans',8,15,8,17,'supporting','Believers are children of God, not hired staff.',2),
('a1000001-0000-4000-8000-000000000003','Romans 12:4-8','Romans',12,4,12,8,'primary','Paul connects God''s grace with different gifts given to believers.',0),
('a1000001-0000-4000-8000-000000000003','1 Corinthians 12:4-7','1 Corinthians',12,4,12,7,'supporting','Different gifts, same Spirit, given for the common good.',1),
('a1000001-0000-4000-8000-000000000003','1 Peter 4:10','1 Peter',4,10,4,10,'supporting','Gifts exist to serve others.',2),
('a1000001-0000-4000-8000-000000000004','Colossians 3:23-24','Colossians',3,23,3,24,'primary','Ordinary work is done for the Lord, which dignifies it.',0),
('a1000001-0000-4000-8000-000000000004','1 Thessalonians 4:11-12','1 Thessalonians',4,11,4,12,'supporting','A quiet, working life is commended, not pitied.',1),
('a1000001-0000-4000-8000-000000000004','Genesis 2:15','Genesis',2,15,2,15,'supporting','Work exists before the fall — it is a gift, not a curse.',2),
('a1000001-0000-4000-8000-000000000005','Psalm 27:14','Psalms',27,14,27,14,'primary','Courage is commanded inside the waiting, not after it.',0),
('a1000001-0000-4000-8000-000000000005','Habakkuk 2:3','Habakkuk',2,3,2,3,'supporting','God''s timing is not the same as delay.',1),
('a1000001-0000-4000-8000-000000000005','James 5:7-8','James',5,7,5,8,'supporting','The farmer''s patience: real work, unhurried timing.',2),
('a1000001-0000-4000-8000-000000000006','Proverbs 3:5-6','Proverbs',3,5,3,6,'primary','Trust and acknowledgement come before straight paths.',0),
('a1000001-0000-4000-8000-000000000006','Proverbs 11:14','Proverbs',11,14,11,14,'supporting','Wise counsel from many people protects a decision.',1),
('a1000001-0000-4000-8000-000000000006','James 1:5','James',1,5,1,5,'supporting','God gives wisdom generously to those who ask.',2),
('a1000001-0000-4000-8000-000000000007','Micah 6:8','Micah',6,8,6,8,'primary','Justice, mercy and humility summarise what God requires.',0),
('a1000001-0000-4000-8000-000000000007','Matthew 22:37-39','Matthew',22,37,22,39,'supporting','Love of God and neighbour is the hinge of everything.',1),
('a1000001-0000-4000-8000-000000000007','Galatians 5:13-14','Galatians',5,13,5,14,'supporting','Freedom is for serving one another in love.',2);

INSERT INTO public.scripture_series_sessions (id, series_id, position, title, introduction, context_note, main_teaching, connections, reflection_questions, prayer, practical_action, discussion_prompt) VALUES
('a2000002-0000-4000-8000-000000000001','22222222-2222-4222-8222-222222222222',1,'God Sees What You''re Carrying','Before any advice, Scripture starts by acknowledging the weight is real.','Psalm 55 is a lament written by someone betrayed by a close friend. The psalmist does not hide panic — he names it, at length, before he reaches verse 22.','"Cast your cares on the Lord and he will sustain you." Sustain, not necessarily remove. The Bible does not tell anxious people to pretend. Lament is a legitimate form of prayer, and half the psalms model it. Anxiety is not evidence of weak faith.','Psalm 55 legitimises honest complaint. Psalm 23 pictures God present in the dark valley rather than around it. Matthew 6 addresses worry directly without shaming the worried. Together they show presence before solutions.',ARRAY['What are you actually carrying right now — name it plainly.','Do you believe God can handle an honest prayer?','Who else knows what you are carrying?'],'God, I am not going to pretend today. Here is what I am carrying. Please sustain me.','Write one honest, unedited prayer. Do not tidy it up.','Why do we find lament difficult in church?'),
('a2000002-0000-4000-8000-000000000002','22222222-2222-4222-8222-222222222222',2,'Prayer and Anxiety','Paul writes about anxiety from prison, not from comfort.','Philippians was written by Paul while imprisoned, to a church he loved and was worried about. The instruction "do not be anxious" is not from someone with an easy life.','Prayer here is specific: petition, with thanksgiving, about actual requests. The promised outcome is peace that "guards" — military language for a garrison. Peace is described as protection, not as a feeling that everything is fine.','Philippians 4:6-7 gives the practice. 1 Peter 5:7 gives the reason: He cares for you. Psalm 34:4 gives testimony: "I sought the Lord, and he answered me."',ARRAY['What would specific prayer look like instead of general worry?','What can you genuinely give thanks for today?','Where do you need peace to act as a guard?'],'God, here is the specific thing. Guard my mind while I wait for an answer.','Pray one specific request out loud each day this week.','How do you pray when you cannot find words?'),
('a2000002-0000-4000-8000-000000000003','22222222-2222-4222-8222-222222222222',3,'What Jesus Says About Tomorrow','Jesus talks about worry more gently than most people expect.','Matthew 6 sits inside the Sermon on the Mount, addressed to ordinary people with genuine material insecurity — food, drink and clothing were not hypothetical worries.','Jesus points to birds and flowers, then to the Father''s knowledge of what we need. The conclusion is not "stop feeling" but "do not be pulled into tomorrow" — today has enough. This is about where attention lives.','Matthew 6:25-34 reframes tomorrow. Psalm 55 and Philippians 4 both keep the focus on today''s honest prayer. The pattern across all three: God addresses the present day, repeatedly.',ARRAY['How much of your worry is about tomorrow rather than today?','What does "enough for today" mean in your situation?','What would you do differently if tomorrow were genuinely God''s concern?'],'Jesus, bring me back to today. Tomorrow is not mine to carry yet.','When you notice tomorrow-worry, write it down and set it aside until a chosen time.','What helps you stay in today?'),
('a2000002-0000-4000-8000-000000000004','22222222-2222-4222-8222-222222222222',4,'Fear and Trust','"Do not fear" in Scripture is almost always followed by a reason.','Isaiah 41 speaks to a people facing exile and national collapse. The reassurance is given to a frightened community, not to individuals having a good day.','"Do not fear, for I am with you." The command is grounded in presence and help, not in a promise that circumstances will be easy. Trust in Scripture is relational, not optimistic.','Isaiah 41:10 gives presence. Psalm 56:3 is honest: "When I am afraid, I put my trust in you" — fear and trust coexist. Deuteronomy 31:6 repeats the reason: He goes with you.',ARRAY['What are you afraid of, specifically?','Can fear and trust exist at the same time in you?','What has God''s presence looked like in a past fear?'],'God, I am afraid and I am still Yours. Be with me in it.','Each time fear rises this week, say one sentence: "You are with me."','Where has fear taught you something true?'),
('a2000002-0000-4000-8000-000000000005','22222222-2222-4222-8222-222222222222',5,'Community Matters','Anxiety isolates. Scripture keeps putting people back into community.','Galatians 6 gives practical instructions to a divided church. "Carry each other''s burdens" is written to a group, about a group.','Burden-bearing is a command with a purpose: it fulfils the law of Christ. Nowhere does Scripture treat struggling alone as spiritual maturity. Seeking help — including trained, professional help — is a reasonable and faithful response, not a failure of faith.','Galatians 6:2 commands shared burdens. James 5:16 pairs confession with prayer for healing. Ecclesiastes 4:9-10 is plain: someone must be there to help you up.',ARRAY['Who is one safe person you could tell the truth to?','What stops you asking for help?','Whose burden could you help carry this week?'],'God, give me the courage to be known, and someone safe to be known by.','Tell one trusted person one true thing about how you are doing. If your anxiety is affecting daily life, contact a doctor or counsellor — that is wisdom, not weakness.','Why do people hide struggle in Christian spaces?'),
('a2000002-0000-4000-8000-000000000006','22222222-2222-4222-8222-222222222222',6,'Practising Trust Daily','Trust is built by repetition, not by a single breakthrough.','Proverbs 3 is instruction for daily life, given as habit-forming wisdom rather than crisis advice.','"Trust in the Lord with all your heart and lean not on your own understanding." Daily trust looks unremarkable: prayer, honesty, rest, community, ordinary obedience. Anxiety may not vanish; a practised life gives it less room.','Proverbs 3:5-6 makes trust a habit. Lamentations 3:22-23 anchors it in mercies that are new every morning. Psalm 61:1-2 supplies the daily prayer: lead me to the rock that is higher than I.',ARRAY['Which single practice has helped you most in this series?','What does a realistic daily rhythm look like for you?','What will you do the next time anxiety spikes?'],'God, one day at a time. New mercies each morning are enough.','Choose one daily practice — prayer, journaling, a walk, a phone call — and keep it for one week.','What have you learned that you want to remember?');

INSERT INTO public.session_scriptures (session_id, reference, book, chapter_start, verse_start, chapter_end, verse_end, scripture_role, explanation, position) VALUES
('a2000002-0000-4000-8000-000000000001','Psalm 55:22','Psalms',55,22,55,22,'primary','God sustains those who cast their cares on Him.',0),
('a2000002-0000-4000-8000-000000000001','Psalm 23','Psalms',23,1,23,6,'supporting','God is present in the valley, not waiting on the far side of it.',1),
('a2000002-0000-4000-8000-000000000001','Matthew 6:25-34','Matthew',6,25,6,34,'supporting','Jesus addresses worry without shaming those who feel it.',2),
('a2000002-0000-4000-8000-000000000002','Philippians 4:6-7','Philippians',4,6,4,7,'primary','Specific prayer, with thanksgiving, and peace that guards the mind.',0),
('a2000002-0000-4000-8000-000000000002','1 Peter 5:7','1 Peter',5,7,5,7,'supporting','Anxiety is given to God because He cares.',1),
('a2000002-0000-4000-8000-000000000002','Psalm 34:4','Psalms',34,4,34,4,'supporting','A testimony of being answered and delivered from fear.',2),
('a2000002-0000-4000-8000-000000000003','Matthew 6:25-34','Matthew',6,25,6,34,'primary','Today has enough concern of its own.',0),
('a2000002-0000-4000-8000-000000000003','Psalm 55:22','Psalms',55,22,55,22,'supporting','The same daily casting of care.',1),
('a2000002-0000-4000-8000-000000000004','Isaiah 41:10','Isaiah',41,10,41,10,'primary','Do not fear, because God is present and helping.',0),
('a2000002-0000-4000-8000-000000000004','Psalm 56:3','Psalms',56,3,56,3,'supporting','Fear and trust can be held at the same time.',1),
('a2000002-0000-4000-8000-000000000004','Deuteronomy 31:6','Deuteronomy',31,6,31,6,'supporting','God goes with His people; He will not abandon them.',2),
('a2000002-0000-4000-8000-000000000005','Galatians 6:2','Galatians',6,2,6,2,'primary','Carrying each other''s burdens fulfils the law of Christ.',0),
('a2000002-0000-4000-8000-000000000005','James 5:16','James',5,16,5,16,'supporting','Honesty with others is paired with prayer.',1),
('a2000002-0000-4000-8000-000000000005','Ecclesiastes 4:9-10','Ecclesiastes',4,9,4,10,'supporting','Two are better than one, especially when one falls.',2),
('a2000002-0000-4000-8000-000000000006','Proverbs 3:5-6','Proverbs',3,5,3,6,'primary','Daily trust rather than self-reliance.',0),
('a2000002-0000-4000-8000-000000000006','Lamentations 3:22-23','Lamentations',3,22,3,23,'supporting','Mercies are new every morning.',1),
('a2000002-0000-4000-8000-000000000006','Psalm 61:1-2','Psalms',61,1,61,2,'supporting','A prayer for when the heart is faint.',2);

INSERT INTO public.scripture_series_sessions (id, series_id, position, title, introduction, context_note, main_teaching, connections, reflection_questions, prayer, practical_action, discussion_prompt) VALUES
('a3000003-0000-4000-8000-000000000001','33333333-3333-4333-8333-333333333333',1,'Identity Before Relationship','A relationship cannot tell you who you are. Something has to come first.','Psalm 139 is a personal psalm about being fully known by God. It is not about romance, and reading it that way would distort it — but it speaks directly to where identity is grounded.','Being fully known and still loved by God is the foundation people often try to get from a partner. Where identity is borrowed from a relationship, the relationship carries a weight it was never designed to hold.','Psalm 139 grounds identity in being known by God. 1 John 3:1 names believers children of God. Together they describe a settled self that enters a relationship rather than one assembled by it.',ARRAY['What do you hope a relationship will prove about you?','Where does your sense of worth currently come from?','What would you want to be true of you whether or not you date?'],'God, You know me completely. Let that be enough ground to stand on.','Write down three things you want to grow in this year that have nothing to do with a relationship.','Why do we expect relationships to fix identity?'),
('a3000003-0000-4000-8000-000000000002','33333333-3333-4333-8333-333333333333',2,'What Does Love Actually Mean?','1 Corinthians 13 is not a wedding poem. It is a correction.','Paul writes 1 Corinthians 13 to a church arguing about status and spiritual gifts. The love chapter is placed as a rebuke of self-importance, which makes it far more demanding than a romantic reading suggests.','Love here is behaviour, not feeling: patient, kind, not envious, not self-seeking, keeping no record of wrongs. It is measurable. That makes it a usable test for any relationship, including friendships and family.','1 Corinthians 13 defines love as action. 1 John 4:7-12 traces love back to God''s own action in Christ. John 15:12-13 sets the standard: love as Jesus loved.',ARRAY['Which item on Paul''s list is hardest for you?','Are you more focused on being loved or on loving?','Where do you keep a record of wrongs?'],'God, teach me a love that is patient when it costs me something.','Pick one line from 1 Corinthians 13 and practise it deliberately for a week.','Which part of this definition does culture ignore?'),
('a3000003-0000-4000-8000-000000000003','33333333-3333-4333-8333-333333333333',3,'Character Over Appearance','God''s assessment of people is consistently different from ours.','1 Samuel 16 records the choosing of David. Samuel, a prophet, gets it wrong repeatedly by looking at appearance and stature before God corrects him.','"People look at the outward appearance, but the Lord looks at the heart." Attraction is not condemned in Scripture, but it is never treated as sufficient information. Character is observable over time and in ordinary conditions.','1 Samuel 16:7 sets the principle. Proverbs 31:30 says charm is deceptive. Galatians 5:22-23 gives a practical list of what mature character actually looks like.',ARRAY['What do you notice first in someone?','How would you recognise the fruit of the Spirit in someone''s daily behaviour?','Which character quality are you growing in yourself?'],'God, help me value what You value, in others and in me.','Watch how someone treats people who can do nothing for them.','How do you assess character without becoming judgemental?'),
('a3000003-0000-4000-8000-000000000004','33333333-3333-4333-8333-333333333333',4,'Wisdom When Choosing a Partner','Scripture gives wisdom for this, but not a formula — and it is honest about that.','Proverbs is wisdom literature: general truths for ordinary life, not promises. Reading it as guaranteed prediction misuses the genre.','Wise choosing involves counsel, honesty, time and self-knowledge. Compatibility of faith matters because shared direction shapes a shared life. Scripture does not promise a single predestined person, and treating it as though it does creates anxiety it never intended.','Proverbs 11:14 commends counsel. 2 Corinthians 6:14 raises shared direction in faith — written about broad partnership, not solely marriage. Amos 3:3 asks the simple question: can two walk together unless they agree?',ARRAY['Whose counsel do you actually listen to?','What are you unwilling to compromise on, and why?','Are you rushing anything out of fear of being alone?'],'God, give me wisdom and patience, and honest friends who will tell me the truth.','Ask one older, trusted Christian what they wish they had known.','How does your community talk about choosing a partner — helpfully or fearfully?'),
('a3000003-0000-4000-8000-000000000005','33333333-3333-4333-8333-333333333333',5,'Boundaries','Boundaries protect people. They are not a punishment.','1 Thessalonians 4 is pastoral instruction to new believers in a culture with very different norms, urging them toward a life that honours God and protects others.','The passage links holiness with not wronging or exploiting another person. Boundaries in Scripture are relational: they protect dignity. They are decided in advance, communicated clearly, and held mutually.','1 Thessalonians 4:3-8 links holiness to not wronging others. Proverbs 4:23 tells you to guard your heart. Song of Songs 8:4 counsels not awakening love before its time.',ARRAY['What boundaries have you actually decided, rather than assumed?','Who knows about them?','How do you respond when someone else sets a boundary?'],'God, help me honour people rather than use them, and to be honest about my own limits.','Write down your boundaries before you are in a situation that tests them.','Why are boundaries often talked about as restriction rather than care?'),
('a3000003-0000-4000-8000-000000000006','33333333-3333-4333-8333-333333333333',6,'Handling Rejection','Rejection is painful and Scripture never minimises it.','Psalm 34:18 is written in a psalm of deliverance, but the verse itself speaks plainly about the brokenhearted — the psalmist''s own experience of desperation is behind it.','"The Lord is close to the brokenhearted." Nearness is the promise, not a quick fix. Rejection says something about fit, timing or another person''s choice — it is not a verdict on your value. Jesus Himself was rejected.','Psalm 34:18 promises nearness. Isaiah 53:3 shows Jesus as one rejected and familiar with suffering. Romans 8:38-39 sets the limit: nothing separates you from God''s love.',ARRAY['What rejection are you still carrying?','What conclusion did you draw about yourself from it — is it true?','What would healing look like?'],'God, be near me in this. Do not let me believe lies about myself.','Say one true thing about yourself each day this week, out loud.','How can we support friends through rejection well?'),
('a3000003-0000-4000-8000-000000000007','33333333-3333-4333-8333-333333333333',7,'Healthy Relationships','Health is visible in ordinary patterns, not in intensity.','Ephesians 5 is addressed to the whole church, and verse 21 — mutual submission — governs everything that follows. Reading later verses without it distorts the passage badly.','Mutual respect, honesty, forgiveness, freedom and the ability to disagree safely mark a healthy relationship. Control, fear, isolation from friends and family, and coercion are not signs of commitment. If you are experiencing abuse, tell someone and seek help — Scripture never asks anyone to stay in danger.','Ephesians 5:21 sets mutual submission as the frame. Colossians 3:12-14 lists compassion, kindness, humility, patience and forgiveness. 1 Corinthians 13 remains the measure.',ARRAY['Do you feel freer or smaller in your closest relationships?','How do you handle conflict?','What do your friends and family observe?'],'God, give me relationships marked by honesty, kindness and freedom.','Ask a trusted friend honestly: what do you see in how I relate to people?','What does a healthy Christian relationship look like in practice?'),
('a3000003-0000-4000-8000-000000000008','33333333-3333-4333-8333-333333333333',8,'Preparing for Marriage','Marriage is a covenant, and Scripture treats it with weight and hope.','Genesis 2:24 is quoted by Jesus and by Paul, making it foundational across the whole Bible. It describes leaving, joining and becoming one — a covenant reshaping of life.','Preparation is practical: faith, money, family, conflict, expectations and communication. Denominational traditions differ on aspects of marriage preparation and ceremony; ask your own church what it teaches and requires.','Genesis 2:24 defines the covenant. Mark 10:6-9 shows Jesus affirming it. Ephesians 5:21-33 describes self-giving love with mutual submission as its frame.',ARRAY['What have you assumed about marriage without examining it?','Which practical area would you find hardest to discuss honestly?','Who models a marriage you respect, and why?'],'God, whatever season I am in, form me into someone able to love faithfully.','Have one honest conversation about expectations — money, family or conflict.','What preparation does your church offer, and what is missing?');

INSERT INTO public.session_scriptures (session_id, reference, book, chapter_start, verse_start, chapter_end, verse_end, scripture_role, explanation, position) VALUES
('a3000003-0000-4000-8000-000000000001','Psalm 139:1-6','Psalms',139,1,139,6,'primary','Being fully known by God grounds identity.',0),
('a3000003-0000-4000-8000-000000000001','1 John 3:1','1 John',3,1,3,1,'supporting','Believers are called children of God.',1),
('a3000003-0000-4000-8000-000000000002','1 Corinthians 13:4-7','1 Corinthians',13,4,13,7,'primary','Love defined as observable behaviour.',0),
('a3000003-0000-4000-8000-000000000002','1 John 4:7-12','1 John',4,7,4,12,'supporting','Love originates in God''s action.',1),
('a3000003-0000-4000-8000-000000000002','John 15:12-13','John',15,12,15,13,'supporting','Jesus sets the standard of self-giving love.',2),
('a3000003-0000-4000-8000-000000000003','1 Samuel 16:7','1 Samuel',16,7,16,7,'primary','God looks at the heart rather than appearance.',0),
('a3000003-0000-4000-8000-000000000003','Proverbs 31:30','Proverbs',31,30,31,30,'supporting','Charm is deceptive; reverence for God endures.',1),
('a3000003-0000-4000-8000-000000000003','Galatians 5:22-23','Galatians',5,22,5,23,'supporting','A practical description of mature character.',2),
('a3000003-0000-4000-8000-000000000004','Proverbs 11:14','Proverbs',11,14,11,14,'primary','Many counsellors bring safety to a decision.',0),
('a3000003-0000-4000-8000-000000000004','2 Corinthians 6:14','2 Corinthians',6,14,6,14,'supporting','Shared direction in faith shapes a shared life.',1),
('a3000003-0000-4000-8000-000000000004','Amos 3:3','Amos',3,3,3,3,'supporting','Walking together assumes agreement on direction.',2),
('a3000003-0000-4000-8000-000000000005','1 Thessalonians 4:3-8','1 Thessalonians',4,3,4,8,'primary','Holiness includes not wronging or exploiting another person.',0),
('a3000003-0000-4000-8000-000000000005','Proverbs 4:23','Proverbs',4,23,4,23,'supporting','Guard your heart, because life flows from it.',1),
('a3000003-0000-4000-8000-000000000005','Song of Solomon 8:4','Song of Solomon',8,4,8,4,'supporting','Do not awaken love before its time.',2),
('a3000003-0000-4000-8000-000000000006','Psalm 34:18','Psalms',34,18,34,18,'primary','God is close to the brokenhearted.',0),
('a3000003-0000-4000-8000-000000000006','Isaiah 53:3','Isaiah',53,3,53,3,'supporting','Jesus was rejected and acquainted with grief.',1),
('a3000003-0000-4000-8000-000000000006','Romans 8:38-39','Romans',8,38,8,39,'supporting','Nothing separates believers from God''s love.',2),
('a3000003-0000-4000-8000-000000000007','Ephesians 5:21','Ephesians',5,21,5,21,'primary','Mutual submission frames everything that follows.',0),
('a3000003-0000-4000-8000-000000000007','Colossians 3:12-14','Colossians',3,12,3,14,'supporting','Compassion, humility, patience and forgiveness.',1),
('a3000003-0000-4000-8000-000000000007','1 Corinthians 13:4-7','1 Corinthians',13,4,13,7,'supporting','The working measure of love.',2),
('a3000003-0000-4000-8000-000000000008','Genesis 2:24','Genesis',2,24,2,24,'primary','Leaving, joining and becoming one — covenant language.',0),
('a3000003-0000-4000-8000-000000000008','Mark 10:6-9','Mark',10,6,10,9,'supporting','Jesus affirms the Genesis pattern.',1),
('a3000003-0000-4000-8000-000000000008','Ephesians 5:21-33','Ephesians',5,21,5,33,'supporting','Self-giving love, framed by mutual submission.',2);

UPDATE public.reels SET series_id = '22222222-2222-4222-8222-222222222222'
WHERE scripture_ref ILIKE 'Philippians 4%' OR topic ILIKE '%anx%';