-- Joiner: Marcia Chen (Analytics) — roster copy 4 of 4, see supabase/ROSTER.md.
INSERT INTO public.slack_roster (name, email, slack) VALUES
  ('Marcia Chen', 'marcia.chen@pixxel.co.in', 'U0BEBK1AZJ6')
ON CONFLICT (name) DO UPDATE
  SET email = excluded.email, slack = excluded.slack;
