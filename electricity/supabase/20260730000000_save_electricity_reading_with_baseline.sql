create function public.save_electricity_reading_with_baseline(
  p_current_id uuid,
  p_previous_date date,
  p_previous_t1_reading numeric,
  p_previous_t2_reading numeric,
  p_reading_date date,
  p_t1_reading numeric,
  p_t2_reading numeric,
  p_t1_rate numeric,
  p_t2_rate numeric
)
returns setof public.electricity_readings
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_current_id uuid;
  v_baseline_id uuid;
begin
  v_user_id := (select auth.uid());

  if v_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  if p_previous_date is null then
    raise exception using
      errcode = '23502',
      message = 'previous date is required';
  end if;

  if p_reading_date is null then
    raise exception using
      errcode = '23502',
      message = 'reading date is required';
  end if;

  if p_previous_date >= p_reading_date then
    raise exception using
      errcode = '23514',
      message = 'previous date must be before current date',
      constraint = 'electricity_readings_previous_date';
  end if;

  if p_previous_t1_reading is null or p_previous_t1_reading < 0 then
    raise exception using
      errcode = '23514',
      message = 'previous T1 reading must be nonnegative',
      constraint = 'electricity_readings_previous_t1_nonnegative';
  end if;

  if p_previous_t2_reading is null or p_previous_t2_reading < 0 then
    raise exception using
      errcode = '23514',
      message = 'previous T2 reading must be nonnegative',
      constraint = 'electricity_readings_previous_t2_nonnegative';
  end if;

  if p_previous_t1_reading > p_t1_reading then
    raise exception using
      errcode = '23514',
      message = 'previous T1 reading cannot exceed current reading',
      constraint = 'electricity_readings_previous_t1_monotonic';
  end if;

  if p_previous_t2_reading > p_t2_reading then
    raise exception using
      errcode = '23514',
      message = 'previous T2 reading cannot exceed current reading',
      constraint = 'electricity_readings_previous_t2_monotonic';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_user_id::text, 0)
  );

  if exists (
    select 1
      from public.electricity_readings
      where user_id = v_user_id
        and reading_date < p_reading_date
        and (p_current_id is null or id <> p_current_id)
  ) then
    raise exception using
      errcode = '23514',
      message = 'current reading already has a predecessor',
      constraint = 'electricity_readings_predecessor_absent';
  end if;

  if p_current_id is null then
    insert into public.electricity_readings (
      user_id,
      reading_date,
      t1_reading,
      t2_reading,
      t1_rate,
      t2_rate,
      is_paid
    )
    values (
      v_user_id,
      p_reading_date,
      p_t1_reading,
      p_t2_reading,
      p_t1_rate,
      p_t2_rate,
      false
    )
    returning id into v_current_id;
  else
    update public.electricity_readings
      set reading_date = p_reading_date,
          t1_reading = p_t1_reading,
          t2_reading = p_t2_reading,
          t1_rate = p_t1_rate,
          t2_rate = p_t2_rate
      where id = p_current_id
        and user_id = v_user_id
      returning id into v_current_id;

    if v_current_id is null then
      raise exception using
        errcode = '42501',
        message = 'reading is unavailable';
    end if;
  end if;

  insert into public.electricity_readings (
    user_id,
    reading_date,
    t1_reading,
    t2_reading,
    t1_rate,
    t2_rate,
    is_paid
  )
  values (
    v_user_id,
    p_previous_date,
    p_previous_t1_reading,
    p_previous_t2_reading,
    p_t1_rate,
    p_t2_rate,
    false
  )
  returning id into v_baseline_id;

  return query
    select reading.*
      from public.electricity_readings as reading
      where reading.user_id = v_user_id
        and reading.id in (v_baseline_id, v_current_id)
      order by reading.reading_date;
end;
$$;

revoke execute on function public.save_electricity_reading_with_baseline(
  uuid, date, numeric, numeric, date, numeric, numeric, numeric, numeric
) from public, anon;

grant execute on function public.save_electricity_reading_with_baseline(
  uuid, date, numeric, numeric, date, numeric, numeric, numeric, numeric
) to authenticated;
