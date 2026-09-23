-- Sunrise Suites v2 schema. Independent naming/policies from any other
-- assignment submission — written fresh for this backend. Safe to re-run.

create extension if not exists pgcrypto;

-- One row per signed-up guest. Created lazily on first authenticated
-- request (see profileRepo.js) rather than via a DB trigger, so the
-- backend stays the single place that knows about "profiles".
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'guest' check (role in ('guest', 'staff')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists profiles_self_select on public.profiles;
create policy profiles_self_select on public.profiles
  for select using (auth.uid() = user_id);

-- A chat thread belongs to one guest. guest_slots remembers dates/guest
-- count the assistant has picked up mid-conversation.
create table if not exists public.threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  guest_slots jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists threads_user_id_updated_at_idx
  on public.threads (user_id, updated_at desc);

alter table public.threads enable row level security;

drop policy if exists threads_owner_all on public.threads;
create policy threads_owner_all on public.threads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.thread_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.threads(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  assistant_envelope jsonb,
  created_at timestamptz not null default now()
);

create index if not exists thread_messages_thread_id_created_at_idx
  on public.thread_messages (thread_id, created_at);

alter table public.thread_messages enable row level security;

drop policy if exists thread_messages_owner_select on public.thread_messages;
create policy thread_messages_owner_select on public.thread_messages
  for select using (exists (
    select 1 from public.threads t where t.id = thread_id and t.user_id = auth.uid()
  ));

drop policy if exists thread_messages_owner_insert on public.thread_messages;
create policy thread_messages_owner_insert on public.thread_messages
  for insert with check (exists (
    select 1 from public.threads t where t.id = thread_id and t.user_id = auth.uid()
  ));

-- Staff (profiles.role = 'staff') can read every guest's flagged
-- ("I don't have that information") turns, to see knowledge-base gaps.
drop policy if exists thread_messages_staff_select on public.thread_messages;
create policy thread_messages_staff_select on public.thread_messages
  for select using (exists (
    select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'staff'
  ));

-- A confirmed reservation against a checkAvailability() result, plus a
-- simulated payment step. No real money moves; data/hotel.json stays the
-- read-only source of truth for room pricing.
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thread_id uuid references public.threads(id) on delete set null,
  room_id text not null,
  room_name text not null,
  check_in date not null,
  check_out date not null,
  nights integer not null check (nights > 0),
  adults integer not null check (adults > 0),
  price_per_night numeric not null,
  total_price numeric not null,
  currency text not null default 'INR',
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'refunded')),
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reservations_user_id_created_at_idx
  on public.reservations (user_id, created_at desc);

alter table public.reservations enable row level security;

drop policy if exists reservations_owner_select on public.reservations;
create policy reservations_owner_select on public.reservations
  for select using (auth.uid() = user_id);

drop policy if exists reservations_owner_insert on public.reservations;
create policy reservations_owner_insert on public.reservations
  for insert with check (auth.uid() = user_id);

drop policy if exists reservations_owner_update on public.reservations;
create policy reservations_owner_update on public.reservations
  for update using (auth.uid() = user_id);

drop policy if exists reservations_staff_select on public.reservations;
create policy reservations_staff_select on public.reservations
  for select using (exists (
    select 1 from public.profiles p where p.user_id = auth.uid() and p.role = 'staff'
  ));

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists threads_touch_updated_at on public.threads;
create trigger threads_touch_updated_at
  before update on public.threads
  for each row execute function public.touch_updated_at();

drop trigger if exists reservations_touch_updated_at on public.reservations;
create trigger reservations_touch_updated_at
  before update on public.reservations
  for each row execute function public.touch_updated_at();
