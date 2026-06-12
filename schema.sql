-- Us — couples app schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists couple_rooms (
  id uuid primary key default gen_random_uuid(),
  invite_code text unique not null,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  couple_room_id uuid references couple_rooms,
  created_at timestamptz default now()
);

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references couple_rooms not null,
  user_id uuid references profiles not null,
  date date not null,
  exercise_done boolean default false,
  sleep_done boolean default false,
  water_count int default 0,
  created_at timestamptz default now(),
  unique (user_id, date)
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references couple_rooms not null,
  from_user_id uuid references profiles not null,
  message text not null,
  seen boolean default false,
  created_at timestamptz default now()
);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references couple_rooms not null,
  title text not null,
  assigned_to text,
  done boolean default false,
  created_by uuid references profiles,
  created_at timestamptz default now()
);

create table if not exists watchlist (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references couple_rooms not null,
  title text not null,
  type text,
  watched_together boolean default false,
  added_by uuid references profiles,
  created_at timestamptz default now()
);

create table if not exists eat_list (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references couple_rooms not null,
  title text not null,
  category text,
  visited_together boolean default false,
  added_by uuid references profiles,
  created_at timestamptz default now()
);

create table if not exists date_nights (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references couple_rooms not null,
  title text not null,
  scheduled_at timestamptz,
  checklist jsonb default '[]',
  completed boolean default false,
  created_at timestamptz default now()
);

create table if not exists countdowns (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references couple_rooms not null,
  label text not null,
  target_date date not null,
  created_at timestamptz default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references couple_rooms not null,
  title text not null,
  progress int default 0,
  target_date date,
  created_at timestamptz default now()
);

create table if not exists adventures (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references couple_rooms not null,
  title text not null,
  done boolean default false,
  done_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists question_answers (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references couple_rooms not null,
  user_id uuid references profiles not null,
  date date not null,
  answer text not null,
  created_at timestamptz default now(),
  unique (user_id, date)
);

create table if not exists points_log (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references couple_rooms not null,
  user_id uuid references profiles not null,
  action text not null,
  points int not null,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Helper: the caller's room id (security definer so it bypasses RLS)
-- ---------------------------------------------------------------------------

create or replace function my_room_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_room_id from profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table couple_rooms enable row level security;
alter table profiles enable row level security;
alter table habits enable row level security;
alter table notes enable row level security;
alter table todos enable row level security;
alter table watchlist enable row level security;
alter table eat_list enable row level security;
alter table date_nights enable row level security;
alter table countdowns enable row level security;
alter table goals enable row level security;
alter table adventures enable row level security;
alter table points_log enable row level security;
alter table question_answers enable row level security;

create policy "members can read their room"
  on couple_rooms for select
  using (id = my_room_id());

create policy "read own or roommate profile"
  on profiles for select
  using (
    id = auth.uid()
    or (couple_room_id is not null and couple_room_id = my_room_id())
  );

create policy "insert own profile"
  on profiles for insert
  with check (id = auth.uid());

create policy "update own profile"
  on profiles for update
  using (id = auth.uid());

create policy "room members full access" on habits for all
  using (room_id = my_room_id()) with check (room_id = my_room_id());
create policy "room members full access" on notes for all
  using (room_id = my_room_id()) with check (room_id = my_room_id());
create policy "room members full access" on todos for all
  using (room_id = my_room_id()) with check (room_id = my_room_id());
create policy "room members full access" on watchlist for all
  using (room_id = my_room_id()) with check (room_id = my_room_id());
create policy "room members full access" on eat_list for all
  using (room_id = my_room_id()) with check (room_id = my_room_id());
create policy "room members full access" on date_nights for all
  using (room_id = my_room_id()) with check (room_id = my_room_id());
create policy "room members full access" on countdowns for all
  using (room_id = my_room_id()) with check (room_id = my_room_id());
create policy "room members full access" on goals for all
  using (room_id = my_room_id()) with check (room_id = my_room_id());
create policy "room members full access" on adventures for all
  using (room_id = my_room_id()) with check (room_id = my_room_id());
create policy "room members full access" on points_log for all
  using (room_id = my_room_id()) with check (room_id = my_room_id());
create policy "room members full access" on question_answers for all
  using (room_id = my_room_id()) with check (room_id = my_room_id());

-- ---------------------------------------------------------------------------
-- Room creation / joining (security definer RPCs avoid the RLS
-- chicken-and-egg problem when a user has no room yet)
-- ---------------------------------------------------------------------------

create or replace function generate_invite_code()
returns text
language sql
volatile
as $$
  select string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (floor(random() * 32) + 1)::int, 1),
    ''
  )
  from generate_series(1, 6);
$$;

create or replace function create_room()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
  rid uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  loop
    code := generate_invite_code();
    begin
      insert into couple_rooms (invite_code) values (code) returning id into rid;
      exit;
    exception when unique_violation then
      -- collision: try another code
    end;
  end loop;
  update profiles set couple_room_id = rid where id = auth.uid();
  return code;
end;
$$;

create or replace function join_room(code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid;
  member_count int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  select id into rid from couple_rooms where invite_code = upper(trim(code));
  if rid is null then
    return false;
  end if;
  select count(*) into member_count
  from profiles
  where couple_room_id = rid and id <> auth.uid();
  if member_count >= 2 then
    return false; -- room already full
  end if;
  update profiles set couple_room_id = rid where id = auth.uid();
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants (RLS still applies; these are the base table privileges)
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

alter publication supabase_realtime add table habits;
alter publication supabase_realtime add table notes;
alter publication supabase_realtime add table todos;
alter publication supabase_realtime add table watchlist;
alter publication supabase_realtime add table eat_list;
alter publication supabase_realtime add table date_nights;
alter publication supabase_realtime add table countdowns;
alter publication supabase_realtime add table goals;
alter publication supabase_realtime add table adventures;
alter publication supabase_realtime add table points_log;
alter publication supabase_realtime add table question_answers;
