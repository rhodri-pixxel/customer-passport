-- Action item deadline reminders.
--
-- Two pieces:
--   1. slack_roster — name → slack id, readable from an edge function. The app
--      resolves Slack ids from TEAM_MEMBERS in the browser, which a scheduled
--      job can't see. Seeded here from that same constant; keep in step when
--      the team changes (see supabase/functions/action-reminders/README.md).
--   2. action_items.reminders_sent — which offsets have already gone out for an
--      item, so a re-run or a double-fired cron can't ping anyone twice.

CREATE TABLE IF NOT EXISTS public.slack_roster (
  name text PRIMARY KEY,
  email text,
  slack text
);

ALTER TABLE public.slack_roster ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS read_slack_roster ON public.slack_roster;
CREATE POLICY read_slack_roster ON public.slack_roster
  FOR SELECT TO public USING ((auth.role() = 'authenticated'::text));

INSERT INTO public.slack_roster (name, email, slack) VALUES
  ('Alex Koh Hock Poh', 'alex@pixxel.space', 'U08Q0722W82'),
  ('Allyson Jenkins', 'allyson@pixxel.space', 'U085JVDKCMR'),
  ('Anjul Garg', 'anjul@pixxel.co.in', 'U03DEGHSEM6'),
  ('Ashay Deo', 'ashay@pixxel.co.in', 'U078BTL1TJT'),
  ('Awais Ahmed', 'awais@pixxel.co.in', null),
  ('Caio Miranda', 'caio@pixxel.space', 'U0983ARJA5U'),
  ('Gp Capt Debashish Sengupta (Retd)', 'debashish@pixxel.co.in', 'U06UHEYB65U'),
  ('Jimmy Greco', 'jimmy@pixxel.space', 'U057D8LTT6K'),
  ('Karan Mali', 'karan@pixxel.co.in', 'U07FE2KPZBR'),
  ('Markus Heynen', 'markus@pixxel.space', 'U03MLS656U9'),
  ('Mauricio Meira', 'mauricio@pixxel.space', 'U08NXMHA1NJ'),
  ('Ryan McKinney', 'ryan.mckinney@pixxel.space', 'U0ACVKZ837T'),
  ('Shantanu Thada', 'shantanu@pixxel.co.in', 'U05T154T9L5'),
  ('Shridutta Banerjee', 'shridutta.banerjee@pixxel.co.in', 'U027F7R2EQ3'),
  ('Usha Simhadri', 'usha@pixxel.co.in', 'U03EAV4FZSB'),
  ('Amy Zammit', 'amy@pixxel.space', 'U050FJYSEUU'),
  ('Archita Dey', 'archita.dey@pixxel.co.in', 'U0BN3LM1E82'),
  ('Megan Gallagher', 'megan@pixxel.space', 'U056T9UE23V'),
  ('Rhodri Phillips', 'rhodri@pixxel.space', 'U092KJ4AKPC'),
  ('Ryan Hammock', 'ryan@pixxel.space', 'U057QQ2BA8J'),
  ('Spencer Wahrman', 'spencer@pixxel.space', 'U07RWUTR22X'),
  ('Terence Yuchen Xie', 'terence@pixxel.space', 'U0B8T6ZSL7N'),
  ('Aditya Chintalapati', 'aditya@pixxel.co.in', 'U03MA603292'),
  ('Ananya Banerjee', 'ananya.banerjee@pixxel.co.in', 'U0A3M8TLWVD'),
  ('Bandi Jay', 'jaya.bandi@pixxel.co.in', 'U09UQH43Z5E'),
  ('Megha Devaraju', 'megha@pixxel.co.in', 'U07N71LAVU0'),
  ('Meghana Shetty', 'meghana.shetty@pixxel.co.in', 'U0A10SR26JX'),
  ('Shubhavi P', 'shubhavi@pixxel.co.in', 'U053Z522G20'),
  ('Jeremy Kravitz', 'jeremy@pixxel.space', 'U064U233N2V'),
  ('Subash Yeggina', 'subash@pixxel.co.in', 'U01TK168BKR')
ON CONFLICT (name) DO UPDATE
  SET email = excluded.email, slack = excluded.slack;

-- Offsets already notified for an item: 7, 2, 1 and 0 days before the due date.
ALTER TABLE public.action_items ADD COLUMN IF NOT EXISTS reminders_sent integer[] DEFAULT '{}'::integer[];

CREATE INDEX IF NOT EXISTS idx_action_items_due_open
  ON public.action_items USING btree (due_date)
  WHERE (done = false);
