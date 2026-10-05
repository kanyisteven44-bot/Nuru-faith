-- Scripture-based reading units; no duplicated numbered topic titles or claimed expert authorship.
do $library$
declare
  books jsonb := $books$[{"name":"Genesis","chapters":50},{"name":"Exodus","chapters":40},{"name":"Leviticus","chapters":27},{"name":"Numbers","chapters":36},{"name":"Deuteronomy","chapters":34},{"name":"Joshua","chapters":24},{"name":"Judges","chapters":21},{"name":"Ruth","chapters":4},{"name":"1 Samuel","chapters":31},{"name":"2 Samuel","chapters":24},{"name":"1 Kings","chapters":22},{"name":"2 Kings","chapters":25},{"name":"1 Chronicles","chapters":29},{"name":"2 Chronicles","chapters":36},{"name":"Ezra","chapters":10},{"name":"Nehemiah","chapters":13},{"name":"Esther","chapters":10},{"name":"Job","chapters":42},{"name":"Psalms","chapters":150},{"name":"Proverbs","chapters":31},{"name":"Ecclesiastes","chapters":12},{"name":"Song of Solomon","chapters":8},{"name":"Isaiah","chapters":66},{"name":"Jeremiah","chapters":52},{"name":"Lamentations","chapters":5},{"name":"Ezekiel","chapters":48},{"name":"Daniel","chapters":12},{"name":"Hosea","chapters":14},{"name":"Joel","chapters":3},{"name":"Amos","chapters":9},{"name":"Obadiah","chapters":1},{"name":"Jonah","chapters":4},{"name":"Micah","chapters":7},{"name":"Nahum","chapters":3},{"name":"Habakkuk","chapters":3},{"name":"Zephaniah","chapters":3},{"name":"Haggai","chapters":2},{"name":"Zechariah","chapters":14},{"name":"Malachi","chapters":4},{"name":"Matthew","chapters":28},{"name":"Mark","chapters":16},{"name":"Luke","chapters":24},{"name":"John","chapters":21},{"name":"Acts","chapters":28},{"name":"Romans","chapters":16},{"name":"1 Corinthians","chapters":16},{"name":"2 Corinthians","chapters":13},{"name":"Galatians","chapters":6},{"name":"Ephesians","chapters":6},{"name":"Philippians","chapters":4},{"name":"Colossians","chapters":4},{"name":"1 Thessalonians","chapters":5},{"name":"2 Thessalonians","chapters":3},{"name":"1 Timothy","chapters":6},{"name":"2 Timothy","chapters":4},{"name":"Titus","chapters":3},{"name":"Philemon","chapters":1},{"name":"Hebrews","chapters":13},{"name":"James","chapters":5},{"name":"1 Peter","chapters":5},{"name":"2 Peter","chapters":3},{"name":"1 John","chapters":5},{"name":"2 John","chapters":1},{"name":"3 John","chapters":1},{"name":"Jude","chapters":1},{"name":"Revelation","chapters":22}]$books$::jsonb;
  b jsonb; book_name text; chapters integer; book_slug text;
  v_series_id uuid; v_session_id uuid; chapter integer; chapter_ref text;
  genre_hint text;
begin
  for b in select value from jsonb_array_elements(books) loop
    book_name := b->>'name'; chapters := (b->>'chapters')::integer;
    book_slug := regexp_replace(lower(book_name),'[^a-z0-9]+','-','g');
    genre_hint := case
      when book_name in ('Genesis','Exodus','Leviticus','Numbers','Deuteronomy') then 'Notice covenant promises, the setting of each command, and its relationship to Israel’s worship and community.'
      when book_name in ('Job','Psalms','Proverbs','Ecclesiastes','Song of Solomon') then 'Read the imagery slowly. Compare parallel lines and distinguish lament, wisdom and advice. A proverb is not a guarantee that every situation will unfold the same way.'
      when book_name in ('Matthew','Mark','Luke','John') then 'Follow Jesus’ words and actions in their immediate setting. Notice who is listening and how people respond to him.'
      when book_name='Revelation' then 'Notice symbols and repeated images, and the hope offered to the original audience. Avoid guessing dates from isolated details.'
      else 'Identify the original audience and setting. Follow the argument or sequence of events before applying an individual sentence.' end;
    insert into public.scripture_series(title,slug,description,cover_image,category,difficulty,estimated_duration,session_count,status,is_featured)
    values(book_name || ': A Scripture Reading Journey','scripture-journey-' || book_slug,
      'A self-guided, chapter-by-chapter journey through ' || book_name || '. Read the full World English Bible text, reflect in context, pray and choose a thoughtful response.',
      'asset:reading-scripture','Bible reading','beginner',chapters*8,chapters,'published',false)
    on conflict (slug) do nothing;
    select id into v_series_id from public.scripture_series where slug='scripture-journey-' || book_slug;
    for chapter in 1..chapters loop
      chapter_ref := book_name || ' ' || chapter;
      insert into public.scripture_series_sessions(series_id,position,title,introduction,context_note,main_teaching,reflection_questions,prayer,practical_action,discussion_prompt)
      select v_series_id,chapter,'Read ' || chapter_ref,
        'Make space to read ' || chapter_ref || ' slowly. This is a guided reading session, not a substitute for the passage itself.',
        genre_hint || ' Read the surrounding chapters when a person, image or argument needs more context.',
        'After reading ' || chapter_ref || ', summarise its main movement in your own words. Point to the sentences that support your summary. Distinguish what the passage says from what you assumed it would say.',
        array['What surprised you in ' || chapter_ref || '?','Which detail changes how you understand the passage?','What question would you like to explore with a mentor?'],
        'God, help me listen carefully to your Word. Give me humility where I do not understand, courage to practise what is clear, and love for the people affected by my choices. Amen.',
        'Choose one response grounded in ' || chapter_ref || '. Write down what you will do and when. Return to the passage afterward and reflect on what you learned.',
        'What did you notice in ' || chapter_ref || ' that you might have missed if you only read one verse?'
      where not exists(select 1 from public.scripture_series_sessions s where s.series_id=v_series_id and s.position=chapter);
      select s.id into v_session_id from public.scripture_series_sessions s where s.series_id=v_series_id and s.position=chapter;
      insert into public.session_scriptures(session_id,reference,book,chapter_start,chapter_end,scripture_role,explanation,position)
      select v_session_id,chapter_ref,book_name,chapter,chapter,'primary','Read the complete chapter before answering the reflection questions.',1
      where not exists(select 1 from public.session_scriptures p where p.session_id=v_session_id and p.position=1);
      if chapter % 2 = 1 then
        insert into public.devotionals(title,subtitle,body,scripture_ref,cover_url,publish_date,read_minutes)
        select chapter_ref || ': Quiet Time','A guided moment of Scripture, reflection and prayer',
          'Read ' || chapter_ref || E' slowly, once to hear its flow and again to notice its details.

' || genre_hint || E'

Pause and reflect: What does this passage reveal about God, human choices or faithful living? Which sentence supports your answer? Make room for a question you cannot yet resolve; bring it to a trusted mentor rather than forcing a quick explanation.

Respond: Choose one small action grounded in what you read. It might be a conversation, a changed habit, an act of service or time to seek further understanding. Be specific about when you will act.

Pray: God, help me receive your Word with humility. Give me wisdom to understand, courage to practise what is clear, and love for others as I respond. Amen.',
          chapter_ref,'asset:reading-scripture',current_date,8
        where not exists(select 1 from public.devotionals d where d.title=chapter_ref || ': Quiet Time' and d.scripture_ref=chapter_ref);
      end if;
    end loop;
  end loop;
end;
$library$;
