create table public.electricity_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_date date not null,
  t1_reading numeric(14,3) not null check (t1_reading >= 0),
  t2_reading numeric(14,3) not null check (t2_reading >= 0),
  t1_rate numeric(10,4) not null check (t1_rate > 0),
  t2_rate numeric(10,4) not null check (t2_rate > 0),
  is_paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, reading_date)
);

alter table public.electricity_readings enable row level security;

create policy "Users can view their electricity readings"
  on public.electricity_readings
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can create their electricity readings"
  on public.electricity_readings
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their electricity readings"
  on public.electricity_readings
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their electricity readings"
  on public.electricity_readings
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create function public.validate_electricity_reading_monotonicity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  excluded_id uuid;
  previous_t1_reading numeric(14,3);
  previous_t2_reading numeric(14,3);
  next_t1_reading numeric(14,3);
  next_t2_reading numeric(14,3);
begin
  if tg_op = 'UPDATE' then
    excluded_id := old.id;
  end if;

  select t1_reading, t2_reading
    into previous_t1_reading, previous_t2_reading
    from public.electricity_readings
    where user_id = new.user_id
      and reading_date < new.reading_date
      and (excluded_id is null or id <> excluded_id)
    order by reading_date desc
    limit 1;

  if previous_t1_reading is not null then
    if new.t1_reading < previous_t1_reading then
      raise exception using
        errcode = '23514',
        message = 't1_reading cannot be below the previous chronological reading',
        constraint = 'electricity_readings_t1_monotonic';
    end if;

    if new.t2_reading < previous_t2_reading then
      raise exception using
        errcode = '23514',
        message = 't2_reading cannot be below the previous chronological reading',
        constraint = 'electricity_readings_t2_monotonic';
    end if;
  end if;

  select t1_reading, t2_reading
    into next_t1_reading, next_t2_reading
    from public.electricity_readings
    where user_id = new.user_id
      and reading_date > new.reading_date
      and (excluded_id is null or id <> excluded_id)
    order by reading_date asc
    limit 1;

  if next_t1_reading is not null then
    if new.t1_reading > next_t1_reading then
      raise exception using
        errcode = '23514',
        message = 't1_reading cannot exceed the next chronological reading',
        constraint = 'electricity_readings_t1_monotonic';
    end if;

    if new.t2_reading > next_t2_reading then
      raise exception using
        errcode = '23514',
        message = 't2_reading cannot exceed the next chronological reading',
        constraint = 'electricity_readings_t2_monotonic';
    end if;
  end if;

  return new;
end;
$$;

create trigger validate_electricity_reading_monotonicity
  before insert or update on public.electricity_readings
  for each row
  execute function public.validate_electricity_reading_monotonicity();

create function public.set_electricity_readings_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_electricity_readings_updated_at
  before update on public.electricity_readings
  for each row
  execute function public.set_electricity_readings_updated_at();
