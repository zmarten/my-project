-- Training log. The program itself lives in TypeScript and is version controlled;
-- this schema stores what actually happened, which is the only thing worth persisting
-- in a database. Resolved sessions are regenerated from code, never edited here.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- athlete state

create table athlete_max (
  id           uuid primary key default gen_random_uuid(),
  -- wpuSys is the weighted pull-up TOTAL SYSTEM max. Omitting it made the one max the
  -- belt progression keys off the only max that could not be logged.
  lift         text not null check (lift in
                 ('fsq','bsq','bench','dl','clean','jerk','snatch','press','wpuSys')),
  value_lb     numeric(6,1) not null check (value_lb > 0),
  tested_on    date not null,
  method       text not null default '1rm' check (method in ('1rm','3rm','5rm','estimated')),
  /** True 1RM vs an estimate off a rep max. The gap between them is itself a signal. */
  is_estimate  boolean not null default false,
  notes        text,
  created_at   timestamptz not null default now()
);
create index on athlete_max (lift, tested_on desc);

create table body_metric (
  id           uuid primary key default gen_random_uuid(),
  measured_on  date not null,
  bodyweight_lb numeric(5,1),
  running_vert_in numeric(4,1),
  resting_hr   int,
  sleep_hours  numeric(3,1),
  notes        text,
  unique (measured_on)
);

-- ---------------------------------------------------------------- training log

create table session_log (
  id             uuid primary key default gen_random_uuid(),
  -- coordinates into the generated program
  program_id     text not null default 'bucketlist-2026-27',
  -- 55, not 54. TOTAL_WEEKS is 55 and Aug 10 2026 plus 55 weeks lands on the Gallatin
  -- Crest. A cap of 54 made the capstone session of the year impossible to log.
  week           int  not null check (week between 1 and 55),
  day            int  not null check (day between 0 and 6),
  session_date   date not null,
  block_id       text not null,

  status         text not null default 'planned'
                   check (status in ('planned','completed','partial','skipped','substituted')),
  /** Why it was skipped or changed. Hunting, travel, a sick kid, a bad night of sleep. */
  deviation_reason text,
  rpe            int check (rpe between 1 and 10),
  duration_min   int,
  notes          text,
  logged_at      timestamptz not null default now(),
  unique (program_id, week, day)
);
create index on session_log (session_date);
create index on session_log (status) where status <> 'completed';

create table set_log (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references session_log(id) on delete cascade,
  item_name     text not null,
  set_index     int  not null,
  -- what the program asked for
  prescribed_lb numeric(6,1),
  prescribed_reps int,
  -- what actually happened
  actual_lb     numeric(6,1),
  actual_reps   int,
  rpe           int check (rpe between 1 and 10),
  notes         text,
  unique (session_id, item_name, set_index)
);

-- ---------------------------------------------------------------- goals

create table goal (
  id            text primary key,
  label         text not null,
  target_value  text not null,
  target_window text not null,
  /** Coaching judgement, not calculation. Stored so drift over the year is visible. */
  confidence    int check (confidence between 0 and 100),
  achieved_on   date,
  deferred      boolean not null default false
);

create table goal_confidence_history (
  id          uuid primary key default gen_random_uuid(),
  goal_id     text not null references goal(id) on delete cascade,
  confidence  int not null check (confidence between 0 and 100),
  rationale   text not null,
  recorded_on date not null default current_date
);

-- ---------------------------------------------------------------- views

/** Adherence is the metric that actually predicts the year. Design matters less. */
create view v_block_adherence as
select
  block_id,
  count(*) filter (where status = 'completed') as completed,
  count(*) filter (where status in ('skipped','partial')) as missed,
  round(100.0 * count(*) filter (where status = 'completed') / nullif(count(*), 0), 1) as pct
from session_log
group by block_id;

/** Where the plan and reality diverge, by reason. Read this before changing the plan. */
create view v_deviation_reasons as
select deviation_reason, count(*) as n, min(session_date) as first_seen, max(session_date) as last_seen
from session_log
where deviation_reason is not null
group by deviation_reason
order by n desc;

/** Prescribed vs actual load, to catch percentages drifting away from reality. */
create view v_load_accuracy as
select
  s.block_id,
  l.item_name,
  count(*) as sets,
  round(avg(l.actual_lb - l.prescribed_lb), 1) as avg_delta_lb,
  round(avg(l.rpe), 1) as avg_rpe
from set_log l
join session_log s on s.id = l.session_id
where l.actual_lb is not null and l.prescribed_lb is not null
group by s.block_id, l.item_name
having count(*) >= 3
order by abs(avg(l.actual_lb - l.prescribed_lb)) desc;

-- ---------------------------------------------------------------- rls

alter table athlete_max enable row level security;
alter table body_metric enable row level security;
alter table session_log enable row level security;
alter table set_log enable row level security;
alter table goal enable row level security;
alter table goal_confidence_history enable row level security;
-- single-user app: add policies when there is a second athlete.
