create table if not exists public.d2c_contacts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id text not null,
  name text not null,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  address_city text,
  address_state text,
  address_zip text,
  notes text,
  current_step text not null default 'add_contact',
  opening_type text,
  objections_encountered jsonb default '[]'::jsonb,
  closing_technique text,
  questions_asked jsonb default '[]'::jsonb,
  sample_sent boolean not null default false,
  sample_sent_at timestamptz,
  sample_product text,
  outcome text default 'pending',
  follow_up_day integer,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.d2c_contacts enable row level security;

create policy "Users can view their own d2c_contacts"
  on public.d2c_contacts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own d2c_contacts"
  on public.d2c_contacts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own d2c_contacts"
  on public.d2c_contacts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own d2c_contacts"
  on public.d2c_contacts for delete
  using (auth.uid() = user_id);

create index idx_d2c_contacts_user_id on public.d2c_contacts(user_id);
create index idx_d2c_contacts_product_id on public.d2c_contacts(product_id);
create index idx_d2c_contacts_outcome on public.d2c_contacts(outcome);
create index idx_d2c_contacts_current_step on public.d2c_contacts(current_step);
