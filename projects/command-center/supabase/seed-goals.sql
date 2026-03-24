-- Seed Zach's goals from high-priority-goals.md
-- Run AFTER migration-002 and AFTER signing in (so your user exists)
-- Replace USER_ID with your actual auth.users id

-- To find your user_id, run: SELECT id FROM auth.users LIMIT 1;

DO $$
DECLARE
  uid UUID;
  gid UUID;
BEGIN
  -- Get the first (only) user
  SELECT id INTO uid FROM auth.users LIMIT 1;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'No user found. Sign in first, then run this seed.';
  END IF;

  -- ============================================
  -- HEALTH & FITNESS
  -- ============================================

  -- 30-day: Hit 262 lbs
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Hit 262 lbs (-8 lbs from 270)', 'health', 30, '2026-04-21',
    'Monday weigh-in reads 262 lbs or less by April 21, 2026.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Maintain carnivore-leaning diet with defined caloric deficit'),
    (gid, uid, 'Weigh in every Monday morning'),
    (gid, uid, 'Track daily intake'),
    (gid, uid, 'No cheat meals for the first 30 days');

  -- 30-day: 10K steps + runs/rides
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, '10K steps/day + 2-3 runs or rides/week', 'health', 30, '2026-04-21',
    '28+ days at 10K steps. 8-12 run/ride sessions logged. Zero missed M-F programming days.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Hit 10K steps daily (walks with baby count)'),
    (gid, uid, '2-3 dedicated run or bike sessions per week'),
    (gid, uid, 'Log every session'),
    (gid, uid, 'Follow Sentinel or MTNtough programming M-F');

  -- 90-day: Hit 248 lbs
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Hit 248 lbs (-22 lbs from 270)', 'health', 90, '2026-06-20',
    'Monday weigh-in reads 248 lbs or less by June 20, 2026. No more than 2 plateau weeks without adjusting.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Sustain 2 lbs/week loss through weeks 8-10, then reassess'),
    (gid, uid, 'Adjust calories if plateauing'),
    (gid, uid, 'Continue M-F Sentinel/MTNtough + weekend cardio');

  -- 90-day: Benchmark fitness test
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Complete a benchmark fitness test (day 1 vs day 90)', 'health', 90, '2026-06-20',
    'Benchmark recorded at both ends with measurable improvement.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Pick a repeatable test (5K trail run, Murph, MTNtough benchmark WOD, or loaded pack hike)'),
    (gid, uid, 'Record baseline in week 1'),
    (gid, uid, 'Retest at day 90');

  -- 180-day: Hit 235 lbs
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Hit 235 lbs (-35 lbs from 270)', 'health', 180, '2026-09-18',
    'Sustained weight at or below 235 lbs for 2+ consecutive weekly weigh-ins.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'After initial 8-10 week aggressive cut, shift to ~1-1.5 lbs/week'),
    (gid, uid, 'Reassess macros and approach at 90-day mark'),
    (gid, uid, 'Prioritize sustainability as you return to work');

  -- 180-day: Hunt-season ready
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Be hunt-season ready (cardio + pack fitness)', 'health', 180, '2026-09-18',
    'Complete a 6+ mile loaded pack hike (40 lbs) at <15 min/mile avg pace.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'By month 5, add weighted pack hikes (40-50 lbs) 1x/week'),
    (gid, uid, 'Maintain 10K daily steps + 2-3 cardio sessions'),
    (gid, uid, 'Simulate a full hunt day as a final test');

  -- ============================================
  -- FAMILY & PARENTING
  -- ============================================

  -- 30-day: Solo-parent rhythm
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Build a solo-parent daily rhythm that works', 'family', 30, '2026-04-21',
    'A documented daily routine followed (roughly) for 3+ consecutive weeks.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Establish repeatable daily structure: wake/feed/nap/play/walk'),
    (gid, uid, 'Build training and project work around baby schedule'),
    (gid, uid, 'Write it down and iterate weekly');

  -- 30-day: Memory capture habit
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Start a simple memory capture habit', 'family', 30, '2026-04-21',
    '30 entries captured by April 21, 2026.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Take one intentional photo or write one sentence per day'),
    (gid, uid, 'Use a single location (album, journal, Notes app)'),
    (gid, uid, 'Consistency over quality');

  -- 90-day: Major milestone
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Own and execute one major milestone', 'family', 90, '2026-06-20',
    'One milestone fully led and completed by June 20, 2026.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Identify upcoming milestone (introducing solids, first camping trip, first hike)'),
    (gid, uid, 'Own the research, prep, and execution'),
    (gid, uid, 'Do not delegate this one');

  -- 90-day: Weekly family adventure
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Establish a weekly family adventure rhythm', 'family', 90, '2026-06-20',
    '12+ weekly adventures completed by June 20, 2026.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Schedule one outing per week on the calendar'),
    (gid, uid, 'Mix solo-dad outings and full-family weekends'),
    (gid, uid, 'Track: hike, park, farmers market, library, drive');

  -- 90-day: First camping trip
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Take the family on a first camping trip', 'family', 90, '2026-06-20',
    'One overnight family camping trip completed by June 20, 2026.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Plan: one night, close to home, use the GFC camper'),
    (gid, uid, 'Prep a packing list and test the sleep setup in advance'),
    (gid, uid, 'Pick a site with easy bail-out access');

  -- 180-day: Smooth handoff
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Smooth handoff: transition to shared parenting post-June 15', 'family', 180, '2026-09-18',
    'Written co-parenting plan in place before June 15. Revisited by mid-July.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Before June 15, have explicit conversation about division of labor'),
    (gid, uid, 'Write down: mornings, evenings, daycare logistics, sick days'),
    (gid, uid, 'Revisit at 30 days back');

  -- 180-day: Seasonal tradition
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Build a seasonal tradition with the baby', 'family', 180, '2026-09-18',
    'At least 2 seasonal experiences documented with photos by September 18, 2026.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Plan seasonal experiences: river trip, camping, hike to peak, berry picking'),
    (gid, uid, 'Document each one with photos');

  -- ============================================
  -- AI FLUENCY & SIDE PROJECTS
  -- ============================================

  -- 30-day: Ship Covey beta
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Ship Covey to 5 real beta testers', 'projects', 30, '2026-04-21',
    '5 people have logged in and submitted feedback by April 21, 2026.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Finalize core photo journal + EXIF waypoint flow'),
    (gid, uid, 'Deploy to covey.zachmartens.com'),
    (gid, uid, 'Recruit 5 hunting buddies or online contacts'),
    (gid, uid, 'Collect structured feedback');

  -- 30-day: LinkedIn posts
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Publish 4 LinkedIn posts', 'projects', 30, '2026-04-21',
    '4 posts published. Track impressions and engagement on each.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Write and publish 1 post/week'),
    (gid, uid, 'Topics: Covey build, dad-life-meets-builder, paternity leave lessons, hot take'),
    (gid, uid, 'Track impressions and engagement');

  -- 90-day: Covey v1
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Covey v1 feature-complete for hunting season', 'projects', 90, '2026-06-20',
    'A friend can create an account, log a hunt with photos and waypoints, and view it on a map by June 20, 2026.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Implement user auth'),
    (gid, uid, 'Photo upload + map view'),
    (gid, uid, 'Basic trip log'),
    (gid, uid, 'Mobile-responsive design');

  -- 90-day: Ship a side project
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Build + publish one new side project or tool', 'projects', 90, '2026-06-20',
    'Project live and publicly accessible by June 20, 2026.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Identify a small, shippable idea (MCP tool, open-source utility, AI workflow)'),
    (gid, uid, 'Scope to <2 weeks of work'),
    (gid, uid, 'Ship publicly on GitHub or zachmartens.com');

  -- 180-day: Covey 25+ users
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Covey has 25+ active users by season opener', 'projects', 180, '2026-09-18',
    '25+ users with at least 1 logged hunt each by September 2026.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Post on Reddit (r/birdhunting, r/uplandgame)'),
    (gid, uid, 'Share on LinkedIn'),
    (gid, uid, 'Reach out to hunting communities'),
    (gid, uid, 'Iterate based on beta feedback');

  -- 180-day: Personal brand
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Establish a recognizable personal brand in AI + outdoors', 'projects', 180, '2026-09-18',
    '15+ posts published. 2+ external contributions. Website updated with portfolio and narrative.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Publish 15+ LinkedIn posts over 6 months'),
    (gid, uid, 'Contribute to 2+ open-source projects or community discussions'),
    (gid, uid, 'Update zachmartens.com with portfolio and cohesive identity');

  -- ============================================
  -- FINANCIAL & HOUSEHOLD
  -- ============================================

  -- 30-day: Project list with costs
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Build a prioritized household project list with costs', 'financial', 30, '2026-04-21',
    'A single document with all projects listed, estimated costs, and sequenced timeline by April 21, 2026.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'List every open project (concrete pad, garden beds, fence-line, septic, Traeger, camper)'),
    (gid, uid, 'Get quotes or estimate costs for each'),
    (gid, uid, 'Rank by urgency, season-dependency, and budget'),
    (gid, uid, 'Assign to a quarter');

  -- 30-day: Monthly budget
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Set a monthly household budget through June 15', 'financial', 30, '2026-04-21',
    'Budget written and tracked for the full month of April.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Map out remaining paternity leave cash flow'),
    (gid, uid, 'Set a monthly discretionary budget for projects'),
    (gid, uid, 'Use a simple tracker (spreadsheet or app)');

  -- 90-day: Top 2 projects
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Complete the top 2 household projects on budget', 'financial', 90, '2026-06-20',
    '2 projects completed and costs documented by June 20, 2026.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Execute top 2 projects from prioritized list'),
    (gid, uid, 'Stay within estimated costs (+/-10%)'),
    (gid, uid, 'Have a backup ready if weather-dependent');

  -- 90-day: Return-to-work finances
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Review finances for return-to-work transition', 'financial', 90, '2026-06-20',
    'Updated household budget reflecting post-leave reality completed before June 15.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Review childcare costs'),
    (gid, uid, 'Update household budget with dual incomes'),
    (gid, uid, 'Audit subscriptions and spending that crept up during leave'),
    (gid, uid, 'Align with wife on new monthly picture');

  -- 180-day: Seasonal projects done
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'All seasonal projects completed before winter', 'financial', 180, '2026-09-18',
    'Zero weather-dependent projects still open by September 18, 2026.')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Anything requiring warm weather must be done before October'),
    (gid, uid, 'Plan backward from first frost (~mid-September in Bozeman)');

  -- 180-day: Quarterly financial check-in
  INSERT INTO goals (id, user_id, title, category, horizon, due_date, success_measure)
  VALUES (gen_random_uuid(), uid, 'Establish a quarterly financial check-in habit', 'financial', 180, '2026-09-18',
    '2 quarterly reviews completed by September 18, 2026 (one at 90 days, one at 180).')
  RETURNING id INTO gid;
  INSERT INTO goal_actions (goal_id, user_id, text) VALUES
    (gid, uid, 'Set a recurring calendar event (quarterly)'),
    (gid, uid, 'Review: budget vs actuals, project spending, savings rate, upcoming expenses'),
    (gid, uid, 'First review at 90-day mark');

END $$;
