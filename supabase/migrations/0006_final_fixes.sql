-- Sửa theo review tổng thể giai đoạn 2: nhập CSV nhanh hơn, giới hạn gửi lại hồ sơ, lịch phỏng vấn gọn + giới hạn,
-- phiên bản đồng ý lấy từ site_settings, index cho khóa ngoại / sắp xếp.

-- 1. Bảng nối: admin_save_job bật app.bulk_links rồi tự tính search_text một lần (thay vì một UPDATE jobs mỗi dòng nối).
create or replace function job_links_touch() returns trigger language plpgsql set search_path = public as $$
begin
  if current_setting('app.bulk_links', true) = 'on' then return null; end if;
  update jobs j set search_text = job_search_text(j)
   where j.id in (new.job_id, old.job_id);  -- NEW/OLD là null khi không áp dụng
  return null;
end $$;

create or replace function admin_save_job(p jsonb) returns bigint
language plpgsql security invoker set search_path = public as $$
declare
  v_id bigint := nullif(p->>'id', '')::bigint;
  old jobs;
  r jobs;
  v_hash text;
begin
  r := jsonb_populate_record(null::jobs, p->'job');
  if v_id is null then
    insert into jobs (code, slug, title_vi, title_ja) values (r.code, r.slug, r.title_vi, r.title_ja) returning id into v_id;
  else
    select * into old from jobs where id = v_id;
    if not found then raise exception 'Tin không tồn tại' using errcode = 'P0002'; end if;
  end if;

  -- Hash bản gốc tiếng Nhật chỉ đổi khi admin đổi trạng thái bản dịch (hoặc xác nhận đã kiểm tra lại).
  -- Phải khớp jaSourceHash() trong lib/admin/job-input.ts.
  v_hash := case
    when r.translation_status = 'none' then null
    when old.id is null or old.translation_status <> r.translation_status or old.translation_source_hash is null
         or coalesce((p->>'ackTranslation')::bool, false)
      then md5(concat_ws(E'\x1f', coalesce(r.summary_ja, ''), coalesce(r.description_ja, ''), coalesce(r.requirements_ja, ''),
        coalesce(r.working_hours_ja, ''), coalesce(r.holidays_ja, ''), coalesce(r.overtime_ja, ''), coalesce(r.benefits_note_ja, '')))
    else old.translation_source_hash
  end;

  update jobs set
    code = r.code, slug = r.slug, status = r.status,
    published_at = case when r.status = 'published' then coalesce(jobs.published_at, now()) else jobs.published_at end,
    valid_through = r.valid_through, title_vi = r.title_vi, title_ja = r.title_ja, employer_name = r.employer_name,
    location_detail_ja = r.location_detail_ja,
    monthly_min_yen = r.monthly_min_yen, monthly_max_yen = r.monthly_max_yen,
    annual_min_yen = r.annual_min_yen, annual_max_yen = r.annual_max_yen,
    salary_negotiable = r.salary_negotiable, salary_source_text = r.salary_source_text, salary_needs_review = r.salary_needs_review,
    jp_level = r.jp_level, jp_note = r.jp_note, experience_years_min = r.experience_years_min, experience_note = r.experience_note,
    driver_license_required = r.driver_license_required, company_car_provided = r.company_car_provided,
    summary_ja = r.summary_ja, summary_vi = r.summary_vi, description_ja = r.description_ja, description_vi = r.description_vi,
    requirements_ja = r.requirements_ja, requirements_vi = r.requirements_vi,
    working_hours_ja = r.working_hours_ja, working_hours_vi = r.working_hours_vi,
    holidays_ja = r.holidays_ja, holidays_vi = r.holidays_vi, overtime_ja = r.overtime_ja, overtime_vi = r.overtime_vi,
    benefits_note_ja = r.benefits_note_ja, benefits_note_vi = r.benefits_note_vi,
    translation_status = r.translation_status, translation_source_hash = v_hash
  where id = v_id;

  perform set_config('app.bulk_links', 'on', true);
  delete from job_prefectures where job_id = v_id;
  insert into job_prefectures select v_id, x::int from (select distinct jsonb_array_elements_text(coalesce(p->'prefectureIds', '[]')) x) s;
  delete from job_occupations where job_id = v_id;
  insert into job_occupations select v_id, x::int from (select distinct jsonb_array_elements_text(coalesce(p->'occupationIds', '[]')) x) s;
  delete from job_skills where job_id = v_id;
  insert into job_skills select v_id, x::int from (select distinct jsonb_array_elements_text(coalesce(p->'skillIds', '[]')) x) s;
  perform set_config('app.bulk_links', 'off', true);
  delete from job_benefits where job_id = v_id;
  insert into job_benefits select v_id, b.id, e.value::bool
    from jsonb_each_text(coalesce(p->'benefits', '{}')) e join benefits b on b.slug = e.key;
  update jobs set search_text = '' where id = v_id;  -- trigger BEFORE tính lại theo bảng nối mới (không đổi updated_at)
  return v_id;
end $$;

-- 2b. Mỗi lần gửi lại khi còn pending_upload được cấp signed URL mới: giới hạn 5 lần / hồ sơ.
alter table applications add column upload_attempts int not null default 0;

-- 5. consent_version lấy từ site_settings (dự phòng: giá trị server gửi = siteDefaults), không tin client.
-- Bản sao 0003 + hai thay đổi trên; gửi lại pending trả thêm createdAt để server dọn thư mục CV cũ.
create or replace function start_application(p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  a public.applications;
  j public.jobs;
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  ref text;
  new_id uuid := gen_random_uuid();
  ext text := nullif(p->>'cvExt', '');
  months int;
  consent text;
begin
  -- Khóa theo ip_hash: hai request song song cùng IP không cùng lọt qua bước đếm.
  perform pg_advisory_xact_lock(hashtext('start_application:' || (p->>'ipHash')));
  select * into a from public.applications where idempotency_key = p->>'idempotencyKey' for update;
  -- Đã qua bước tải CV: trả lại nguyên kết quả cũ.
  if found and a.status <> 'pending_upload' then
    return jsonb_build_object('id', a.id, 'refCode', a.ref_code, 'status', a.status, 'cvPath', a.cv_path, 'created', false);
  end if;

  if a.id is null and (select count(*) from public.applications
      where ip_hash = p->>'ipHash' and created_at > now() - interval '10 minutes') >= 5 then
    return jsonb_build_object('error', 'rate_limited');
  end if;
  if a.upload_attempts >= 5 then return jsonb_build_object('error', 'rate_limited'); end if;

  if nullif(p->>'jobCode', '') is not null then
    select * into j from public.jobs where lower(code) = public.norm_code(p->>'jobCode')
      and status = 'published' and (valid_through is null or valid_through > now());
    if not found and p->>'kind' = 'apply' then return jsonb_build_object('error', 'job_closed'); end if;
  end if;

  select coalesce((data->>'retentionMonths')::int, 12), nullif(data->>'consentVersion', '') into months, consent
    from public.site_settings where id = 1;
  consent := coalesce(consent, p->>'consentVersion');

  if a.id is not null then
    -- Gửi lại khi còn pending_upload (vd. sau invalid_file): ghi đè dữ liệu mới nhập.
    -- Luôn cấp path MỚI (upload không upsert): URL cũ chỉ còn trỏ tới path mồ côi, không ghi đè được object đã xác nhận.
    -- Không còn CV (chuyển tư vấn) → new.
    update public.applications set kind = p->>'kind', job_id = j.id, job_code = coalesce(j.code, nullif(p->>'jobCode', '')),
      job_title = j.title_vi, full_name = p->>'fullName', email = nullif(p->>'email', ''), phone = nullif(p->>'phone', ''),
      facebook = nullif(p->>'facebook', ''), jp_level = nullif(p->>'jpLevel', ''), note = nullif(p->>'note', ''),
      consent_version = consent, consent_at = now(), upload_attempts = upload_attempts + 1,
      cv_path = case when ext is not null then
        'cvs/' || to_char(a.created_at at time zone 'UTC', 'YYYY/MM') || '/' || a.id || '/' || gen_random_uuid() || '.' || ext end,
      cv_mime = case when ext is not null then p->>'cvMime' end,
      status = case when ext is null then 'new' else 'pending_upload' end
    where id = a.id returning * into a;
    return jsonb_build_object('id', a.id, 'refCode', a.ref_code, 'status', a.status, 'cvPath', a.cv_path, 'created', false,
      'createdAt', public.iso_utc(a.created_at));
  end if;

  loop
    ref := 'HS-' || (select string_agg(substr(alphabet, 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6));
    begin
      insert into public.applications (id, ref_code, kind, job_id, job_code, job_title, full_name, email, phone, facebook,
        jp_level, note, cv_path, cv_mime, consent_version, consent_at, status, idempotency_key, ip_hash, delete_after)
      values (new_id, ref, p->>'kind', j.id, coalesce(j.code, nullif(p->>'jobCode', '')), j.title_vi, p->>'fullName',
        nullif(p->>'email', ''), nullif(p->>'phone', ''), nullif(p->>'facebook', ''), nullif(p->>'jpLevel', ''),
        nullif(p->>'note', ''),
        case when ext is not null then
          -- Thư mục theo tháng UTC của created_at: removeApplicationObjects() tính lại được.
          'cvs/' || to_char(now() at time zone 'UTC', 'YYYY/MM') || '/' || new_id || '/' || gen_random_uuid() || '.' || ext end,
        p->>'cvMime', consent, now(),
        case when ext is not null then 'pending_upload' else 'new' end,
        p->>'idempotencyKey', p->>'ipHash', (current_date + make_interval(months => coalesce(months, 12)))::date)
      on conflict (idempotency_key) do nothing
      returning * into a;
      exit;
    exception when unique_violation then null;  -- trùng ref_code: sinh mã khác
    end;
  end loop;

  if a.id is null then  -- request song song cùng key (khác IP) vừa ghi trước
    select * into a from public.applications where idempotency_key = p->>'idempotencyKey';
    return jsonb_build_object('id', a.id, 'refCode', a.ref_code, 'status', a.status, 'cvPath', a.cv_path, 'created', false);
  end if;
  return jsonb_build_object('id', a.id, 'refCode', a.ref_code, 'status', a.status, 'cvPath', a.cv_path, 'created', true);
end $$;

-- 3. Lịch phỏng vấn: job chỉ gồm trường trang dùng (InterviewWithJobSummary); mặc định đến hết hôm nay + 60 ngày (JST), tối đa 500.
create or replace function upcoming_interviews(p jsonb) returns jsonb
language sql stable security invoker set search_path = public as $$
  with f as (
    select coalesce((p->>'now')::timestamptz, now()) as now, nullif(p->>'from', '') as dfrom,
      coalesce(nullif(p->>'to', ''),
        to_char((coalesce((p->>'now')::timestamptz, now()) at time zone 'Asia/Tokyo')::date + 60, 'YYYY-MM-DD')) as dto,
      array(select jsonb_array_elements_text(coalesce(p->'prefectures', '[]'))) as prefs,
      array(select jsonb_array_elements_text(coalesce(p->'occupations', '[]'))) as occs
  ), x as (
    select e.id, e.starts_at, j.id as jid, j.code, j.slug, j.status, j.is_demo, j.title_vi, j.title_ja
    from interview_events e join jobs j on j.id = e.job_id, f
    where e.status = 'scheduled' and e.starts_at > f.now
      and j.status = 'published' and (j.valid_through is null or j.valid_through > f.now)
      and (f.dfrom is null or to_char(e.starts_at at time zone 'Asia/Tokyo', 'YYYY-MM-DD') collate "C" >= f.dfrom)
      and to_char(e.starts_at at time zone 'Asia/Tokyo', 'YYYY-MM-DD') collate "C" <= f.dto
      -- như demo: mã tỉnh không tồn tại thì bỏ qua bộ lọc tỉnh; slug nghề lạ thì không khớp gì
      and (not exists (select 1 from prefectures pr where pr.code = any(f.prefs)) or exists (
            select 1 from job_prefectures jp join prefectures pr on pr.id = jp.prefecture_id
             where jp.job_id = j.id and pr.code = any(f.prefs)))
      and (cardinality(f.occs) = 0 or exists (
            select 1 from job_occupations jo join occupations o on o.id = jo.occupation_id
             where jo.job_id = j.id and o.slug = any(f.occs)))
    order by e.starts_at, e.id
    limit 500
  )
  select coalesce(jsonb_agg(interview_json(x.id) || jsonb_build_object('job', jsonb_build_object(
      'id', x.jid, 'code', x.code, 'slug', x.slug, 'status', x.status, 'isDemo', x.is_demo,
      'titleVi', x.title_vi, 'titleJa', x.title_ja,
      'prefectureIds', coalesce((select jsonb_agg(prefecture_id order by prefecture_id) from job_prefectures where job_id = x.jid), '[]'),
      'occupationIds', coalesce((select jsonb_agg(occupation_id order by occupation_id) from job_occupations where job_id = x.jid), '[]')))
    order by x.starts_at, x.id), '[]')
  from x
$$;

-- 6. Index cho khóa ngoại và danh sách hồ sơ mới nhất.
create index application_notes_application on application_notes (application_id);
create index applications_created on applications (created_at desc);
create index job_prefectures_prefecture on job_prefectures (prefecture_id);
create index job_occupations_occupation on job_occupations (occupation_id);
create index job_skills_skill on job_skills (skill_id);

-- 1. import_jobs chạy security definer, kiểm is_admin() MỘT lần: dưới RLS mỗi câu lệnh (~30 câu/dòng) lại đánh giá policy
-- is_admin(), 2000 dòng vượt statement_timeout 8 s của Supabase. Chủ bảng không bị RLS nên phần ghi bên trong nhanh như superuser.
-- Tra id theo mã một lần cho cả tệp (một join). Mã trùng trong cùng payload (CSV đã chặn) → dòng sau insert trùng
-- jobs_code_lower → exception → rollback cả lần nhập.
create or replace function import_jobs(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  r jsonb;
  v_id bigint;
  v_created int := 0;
  v_updated int := 0;
begin
  if not is_admin() then raise exception 'Chỉ quản trị viên được nhập tin' using errcode = 'insufficient_privilege'; end if;
  for r, v_id in
    select x.r, j.id from jsonb_array_elements(coalesce(p->'rows', '[]')) with ordinality x(r, n)
      left join jobs j on lower(j.code) = lower(x.r->'job'->>'code')
    order by x.n
  loop
    if v_id is null then v_created := v_created + 1; else v_updated := v_updated + 1; end if;
    v_id := admin_save_job(jsonb_build_object('id', v_id, 'job', r->'job', 'prefectureIds', r->'prefectureIds',
      'occupationIds', r->'occupationIds', 'skillIds', r->'skillIds', 'benefits', r->'benefits'));
    insert into interview_events (job_id, starts_at)
      select v_id, t::timestamptz from (select distinct jsonb_array_elements_text(coalesce(r->'interviews', '[]')) t) s
      where not exists (select 1 from interview_events e where e.job_id = v_id and e.starts_at = t::timestamptz);
  end loop;
  return jsonb_build_object('created', v_created, 'updated', v_updated);
end $$;
