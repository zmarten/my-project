-- Daily briefs cache table
create table daily_briefs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  brief_date date not null,
  brief_data jsonb not null,
  raw_context jsonb,
  generated_at timestamptz default now(),
  unique(user_id, brief_date)
);

create index idx_briefs_user_date on daily_briefs(user_id, brief_date desc);

alter table daily_briefs enable row level security;

create policy "Users can read own briefs"
  on daily_briefs for select using (auth.uid() = user_id);

create policy "Users can insert own briefs"
  on daily_briefs for insert with check (auth.uid() = user_id);

create policy "Users can update own briefs"
  on daily_briefs for update using (auth.uid() = user_id);
