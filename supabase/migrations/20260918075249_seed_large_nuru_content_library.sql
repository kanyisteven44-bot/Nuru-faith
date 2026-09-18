-- Seed 1,200 devotionals and 1,200 structured Scripture Series.
-- Applied to production as Supabase migration 20260918075249.

with seed as (
  select g,
    (array['Prayer','Faith','Identity','Purpose','Courage','Peace','Wisdom','Forgiveness','Relationships','Service','Hope','Discipline','Leadership','Gratitude','Integrity','Anxiety & Peace','Waiting','Friendship','Work & Study','Family','Temptation','Generosity','Worship','Calling'])[((g-1)%24)+1] as theme,
    (array['for ordinary days','when plans change','under pressure','in quiet seasons','when you feel behind','during conflict','before a big decision','when motivation drops','while building new habits','when the future feels uncertain'])[(((g-1)/24)%10)+1] as situation,
    (array['Psalm 23:1-4','Proverbs 3:5-6','Matthew 6:25-34','Philippians 4:6-9','Romans 12:1-2','James 1:2-5','Isaiah 40:28-31','John 15:1-8','Galatians 5:22-25','Ephesians 2:8-10','Colossians 3:12-17','1 Peter 5:6-10','Psalm 46:1-3','Micah 6:8','Matthew 5:13-16','Luke 10:38-42','Romans 8:31-39','2 Timothy 1:6-7','Hebrews 12:1-3','1 Corinthians 13:4-8','Psalm 139:13-18','Joshua 1:7-9','Ecclesiastes 3:1-8','Matthew 11:28-30','John 14:25-27','Romans 5:1-5','2 Corinthians 4:7-10','Galatians 6:7-10','Ephesians 6:10-18','Philippians 2:1-5','Colossians 3:1-4','1 Thessalonians 5:16-24','Hebrews 10:23-25','James 1:19-27','1 Peter 2:9-12','1 John 4:7-12','Psalm 121:1-8','Proverbs 4:20-27','Matthew 7:24-27','Romans 12:9-18'])[((g-1)%40)+1] as scripture_ref
  from generate_series(1,1200) g
)
insert into public.devotionals
(title,subtitle,body,scripture_ref,scripture_text,cover_url,publish_date,read_minutes)
select
  theme||' '||situation||' · '||lpad(g::text,4,'0'),
  theme,
  'Read '||scripture_ref||' slowly. Notice what the passage reveals about God, what it exposes in your present situation, and what faithful response it invites today.'||E'\n\n'||
  'Today''s focus is '||lower(theme)||' '||situation||'. Do not rush to a quick answer. Name what is actually happening, bring it honestly before God, and let Scripture shape your next response rather than fear, pressure, pride, or impulse.'||E'\n\n'||
  'Reflection: What is one belief, habit, conversation, or decision that needs to change because of this passage? Choose one small action you can complete today, then return to the passage tonight and review what you noticed.',
  scripture_ref,null,
  (array['asset:bible-candle','asset:quiet-night','asset:mountain-dawn','asset:walk-purpose','asset:cross-sunrise','asset:church-interior','asset:friends-dusk','asset:worship-night'])[((g-1)%8)+1],
  current_date-(g-1),4+(g%4)
from seed
where not exists (
  select 1 from public.devotionals d
  where d.title=seed.theme||' '||seed.situation||' · '||lpad(seed.g::text,4,'0')
    and d.publish_date=current_date-(seed.g-1)
);

with series_seed as (
  select g,
    (array['Prayer','Faith','Identity in Christ','Purpose','Courage','Peace','Wisdom','Forgiveness','Healthy Relationships','Service','Hope','Spiritual Discipline','Leadership','Gratitude','Integrity','Anxiety and Trust','Waiting on God','Friendship','Work and Study','Family','Temptation','Generosity','Worship','Calling'])[((g-1)%24)+1] as theme,
    (array['Foundations','Deep Dive','Everyday Practice','Hard Questions','A New Rhythm','For Real Life','From Knowing to Doing','Growing Stronger','When Life Gets Messy','Next Steps'])[(((g-1)/24)%10)+1] as journey,
    (array['Students','Young Adults','New Believers','Growing Disciples','Leaders'])[(((g-1)/240)%5)+1] as audience,
    (array['Discipleship','Life Skills','Relationships','Difficult Seasons','Purpose & Calling'])[((g-1)%5)+1] as category
  from generate_series(1,1200) g
)
insert into public.scripture_series
(title,slug,description,cover_image,category,difficulty,estimated_duration,session_count,status,translation_id,is_featured)
select
  theme||': '||journey||' for '||audience,
  'nuru-library-'||lpad(g::text,4,'0'),
  'A five-session Nuru Faith study on '||lower(theme)||' for '||lower(audience)||'. Read Scripture in context, reflect honestly, pray, discuss, and practise one concrete response in daily life.',
  (array['asset:discipleship-book','asset:life-skills-growth','asset:relationships-bond','asset:calm-anchor','asset:purpose-path','asset:bible-candle','asset:cross-sunrise','asset:walk-purpose'])[((g-1)%8)+1],
  category,
  case when g%3=0 then 'intermediate' else 'beginner' end,
  40+((g%4)*5),5,'published','web',(g<=12)
from series_seed
on conflict (slug) do nothing;

insert into public.scripture_series_sessions
(series_id,position,title,introduction,context_note,main_teaching,connections,reflection_questions,prayer,practical_action,discussion_prompt)
select
  s.id,p.position,
  case p.position when 1 then 'Start with Scripture' when 2 then 'See the Context' when 3 then 'Bring It into Daily Life' when 4 then 'Practise It with Others' else 'Build a Lasting Rhythm' end,
  'This session continues "'||s.title||'". Begin by reading the linked passage slowly before reading any explanation. Write down one phrase, question, tension, or repeated idea that stands out.',
  'The goal is to understand the passage in its biblical setting before applying it. Ask who is speaking, who is listening, what problem or hope is present, and how this section fits the surrounding chapter.',
  case p.position
    when 1 then 'Faith grows when Scripture becomes the starting point rather than an afterthought. Observe first, then interpret, then apply. Resist the urge to make the passage say only what you already wanted to hear.'
    when 2 then 'Context protects us from shallow conclusions. Look for the author''s purpose, the situation of the first hearers, repeated words, commands, promises, warnings, and the character of God revealed in the text.'
    when 3 then 'Application becomes real when it moves from a general idea to a specific response. Identify one decision, habit, relationship, fear, responsibility, or opportunity where this truth should change what you do next.'
    when 4 then 'Christian growth is not designed to be isolated. Healthy community gives encouragement, correction, perspective, and accountability. Share what you are learning without pretending to have everything solved.'
    else 'Lasting growth comes through repeated faithful practices. Build a simple rhythm of Scripture, prayer, honest reflection, community, and action that can continue after this series ends.'
  end,
  'Connect this lesson with the wider story of Scripture: God forms a people who trust him, love one another, live with integrity, and reflect Christ in ordinary life.',
  array['What does the linked passage reveal about God or faithful living?','Where does this challenge the way I currently think or act?','What is one specific response I can practise before the next session?']::text[],
  'God, give me wisdom to understand your Word, humility to receive correction, courage to obey what is clear, and grace to keep growing when change is slow. Amen.',
  case p.position
    when 1 then 'Read the primary passage twice today and write three observations before checking any notes.'
    when 2 then 'Read the verses immediately before and after the main passage and write one context insight.'
    when 3 then 'Choose one concrete action from today''s lesson and complete it before the day ends.'
    when 4 then 'Discuss one reflection question with a trusted Christian friend, mentor, small group, or church leader.'
    else 'Write a seven-day rhythm that includes Scripture, prayer, one relationship check-in, and one practical act of obedience.'
  end,
  'What part of this session would be hardest to live consistently, and what kind of support would make it more realistic?'
from public.scripture_series s
cross join generate_series(1,5) as p(position)
where s.slug like 'nuru-library-%'
on conflict (series_id,position) do nothing;

with scripture_bank as (
  select
    array['Psalm 1:1-6','Psalm 23:1-6','Psalm 46:1-11','Psalm 121:1-8','Proverbs 3:5-8','Proverbs 4:20-27','Isaiah 40:28-31','Micah 6:8','Matthew 5:1-12','Matthew 5:13-16','Matthew 6:25-34','Matthew 7:24-27','Matthew 11:28-30','Luke 10:38-42','John 8:31-32','John 13:34-35','John 15:1-8','Romans 5:1-5','Romans 8:31-39','Romans 12:1-2','Romans 12:9-18','1 Corinthians 13:4-8','2 Corinthians 4:7-10','Galatians 5:22-25','Galatians 6:7-10','Ephesians 2:8-10','Ephesians 4:1-6','Ephesians 6:10-18','Philippians 2:1-5','Philippians 4:6-9','Colossians 3:1-4','Colossians 3:12-17','1 Thessalonians 5:16-24','2 Timothy 1:6-7','Hebrews 10:23-25','Hebrews 12:1-3','James 1:2-5','James 1:19-27','1 Peter 2:9-12','1 Peter 5:6-10','1 John 4:7-12']::text[] refs,
    array['Psalms','Psalms','Psalms','Psalms','Proverbs','Proverbs','Isaiah','Micah','Matthew','Matthew','Matthew','Matthew','Matthew','Luke','John','John','John','Romans','Romans','Romans','Romans','1 Corinthians','2 Corinthians','Galatians','Galatians','Ephesians','Ephesians','Ephesians','Philippians','Philippians','Colossians','Colossians','1 Thessalonians','2 Timothy','Hebrews','Hebrews','James','James','1 Peter','1 Peter','1 John']::text[] books
),
numbered as (
  select ss.*,row_number() over(order by ss.series_id,ss.position) rn
  from public.scripture_series_sessions ss
  join public.scripture_series s on s.id=ss.series_id
  where s.slug like 'nuru-library-%'
)
insert into public.session_scriptures
(session_id,reference,book,scripture_role,explanation,position)
select
  n.id,
  b.refs[(((n.rn-1)+r.off_val)%array_length(b.refs,1))+1],
  b.books[(((n.rn-1)+r.off_val)%array_length(b.books,1))+1],
  r.role,
  case r.role when 'primary' then 'Read this passage first. Observe the author''s main idea and how it connects to the session before moving to application.' else 'Use this passage to compare themes across Scripture and to test whether your application fits the wider biblical witness.' end,
  r.pos
from numbered n
cross join scripture_bank b
cross join (values ('primary'::text,0,1),('supporting'::text,11,2)) as r(role,off_val,pos)
where not exists (
  select 1 from public.session_scriptures e
  where e.session_id=n.id and e.scripture_role=r.role and e.position=r.pos
);
