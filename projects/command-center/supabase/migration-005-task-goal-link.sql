-- Add goal_id FK to tasks so tasks can be linked to a specific goal
alter table tasks add column goal_id uuid references goals(id) on delete set null;

create index idx_tasks_goal_id on tasks(goal_id);
