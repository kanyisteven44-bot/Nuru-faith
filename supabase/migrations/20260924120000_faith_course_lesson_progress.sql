CREATE TABLE public.faith_course_lesson_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_slug text NOT NULL CHECK (length(course_slug) BETWEEN 1 AND 150),
  lesson_index integer NOT NULL CHECK (lesson_index >= 0),
  completed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_slug, lesson_index)
);

ALTER TABLE public.faith_course_lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read own faith course lessons"
  ON public.faith_course_lesson_progress FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));
CREATE POLICY "Complete own faith course lessons"
  ON public.faith_course_lesson_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));
CREATE POLICY "Undo own faith course lessons"
  ON public.faith_course_lesson_progress FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

GRANT SELECT, INSERT, DELETE ON public.faith_course_lesson_progress TO authenticated;
