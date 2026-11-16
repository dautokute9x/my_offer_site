-- Lưu tin nguyên tử: jobs + thay toàn bộ bảng nối. security invoker: RLS (admin_all) quyết định ai được ghi.
-- p = { id, job: {cột jobs dạng snake_case}, prefectureIds, occupationIds, skillIds, benefits: {slug: bool}, ackTranslation }
create function admin_save_job(p jsonb) returns bigint
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

  delete from job_prefectures where job_id = v_id;
  insert into job_prefectures select v_id, x::int from (select distinct jsonb_array_elements_text(coalesce(p->'prefectureIds', '[]')) x) s;
  delete from job_occupations where job_id = v_id;
  insert into job_occupations select v_id, x::int from (select distinct jsonb_array_elements_text(coalesce(p->'occupationIds', '[]')) x) s;
  delete from job_skills where job_id = v_id;
  insert into job_skills select v_id, x::int from (select distinct jsonb_array_elements_text(coalesce(p->'skillIds', '[]')) x) s;
  delete from job_benefits where job_id = v_id;
  insert into job_benefits select v_id, b.id, e.value::bool
    from jsonb_each_text(coalesce(p->'benefits', '{}')) e join benefits b on b.slug = e.key;
  return v_id;
end $$;
revoke execute on function admin_save_job(jsonb) from public, anon;
grant execute on function admin_save_job(jsonb) to authenticated;
