-- Activity log for unified notification feed
-- Tracks: contact_created, step_changed, sample_sent, sample_confirmed,
--         followup_completed, outcome_changed

create table public.d2c_activity_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  contact_id uuid references public.d2c_contacts(id) on delete cascade,
  event_type text not null,
  metadata   jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index idx_activity_log_user_time
  on public.d2c_activity_log (user_id, created_at desc);

alter table public.d2c_activity_log enable row level security;

create policy "Users can read own activity"
  on public.d2c_activity_log for select
  using (auth.uid() = user_id);

create policy "Users can insert own activity"
  on public.d2c_activity_log for insert
  with check (auth.uid() = user_id);
