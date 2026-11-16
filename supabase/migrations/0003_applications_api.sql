-- Giai đoạn 2: tạo hồ sơ ứng tuyển (chỉ server gọi bằng service_role).
-- Idempotent theo idempotency_key; giới hạn 5 hồ sơ / ip_hash / 10 phút; gửi lại key cũ không tính và không bị chặn.
-- Trả {id, refCode, status, cvPath, created} hoặc {error: 'rate_limited' | 'job_closed'}.
create function start_application(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a public.applications;
  j public.jobs;
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  ref text;
  new_id uuid := gen_random_uuid();
  months int;
begin
  -- Khóa theo ip_hash: hai request song song cùng IP không cùng lọt qua bước đếm.
  perform pg_advisory_xact_lock(hashtext('start_application:' || (p->>'ipHash')));
  select * into a from public.applications where idempotency_key = p->>'idempotencyKey';
  if found then
    return jsonb_build_object('id', a.id, 'refCode', a.ref_code, 'status', a.status, 'cvPath', a.cv_path, 'created', false);
  end if;

  if (select count(*) from public.applications
      where ip_hash = p->>'ipHash' and created_at > now() - interval '10 minutes') >= 5 then
    return jsonb_build_object('error', 'rate_limited');
  end if;

  if nullif(p->>'jobCode', '') is not null then
    select * into j from public.jobs where lower(code) = public.norm_code(p->>'jobCode')
      and status = 'published' and (valid_through is null or valid_through > now());
    if not found and p->>'kind' = 'apply' then return jsonb_build_object('error', 'job_closed'); end if;
  end if;

  select coalesce((data->>'retentionMonths')::int, 12) into months from public.site_settings where id = 1;

  loop
    ref := 'HS-' || (select string_agg(substr(alphabet, 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    begin
      insert into public.applications (id, ref_code, kind, job_id, job_code, job_title, full_name, email, phone, facebook,
        jp_level, note, cv_path, cv_mime, consent_version, consent_at, status, idempotency_key, ip_hash, delete_after)
      values (new_id, ref, p->>'kind', j.id, coalesce(j.code, nullif(p->>'jobCode', '')), j.title_vi, p->>'fullName',
        nullif(p->>'email', ''), nullif(p->>'phone', ''), nullif(p->>'facebook', ''), nullif(p->>'jpLevel', ''),
        nullif(p->>'note', ''),
        case when p->>'cvExt' is not null then
          'cvs/' || to_char(now(), 'YYYY/MM') || '/' || new_id || '/' || gen_random_uuid() || '.' || (p->>'cvExt') end,
        p->>'cvMime', p->>'consentVersion', now(),
        case when p->>'cvExt' is not null then 'pending_upload' else 'new' end,
        p->>'idempotencyKey', p->>'ipHash', (current_date + make_interval(months => coalesce(months, 12)))::date)
      on conflict (idempotency_key) do nothing
      returning * into a;
      exit;
    exception when unique_violation then null;  -- trùng ref_code: sinh mã khác
    end;
  end loop;

  if a.id is null then  -- request song song cùng key vừa ghi trước
    select * into a from public.applications where idempotency_key = p->>'idempotencyKey';
    return jsonb_build_object('id', a.id, 'refCode', a.ref_code, 'status', a.status, 'cvPath', a.cv_path, 'created', false);
  end if;
  return jsonb_build_object('id', a.id, 'refCode', a.ref_code, 'status', a.status, 'cvPath', a.cv_path, 'created', true);
end $$;
revoke execute on function start_application(jsonb) from public, anon, authenticated;
grant execute on function start_application(jsonb) to service_role;
