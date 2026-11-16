-- Nhập CSV nguyên tử: mỗi dòng đi qua admin_save_job (upsert theo code, không phân biệt hoa thường, thay bảng nối);
-- lịch phỏng vấn chỉ thêm mới, bỏ qua lịch trùng starts_at. Lỗi bất kỳ → exception → rollback cả lần nhập.
-- p = { rows: [{ job, prefectureIds, occupationIds, skillIds, benefits, interviews: [ISO timestamptz] }] }
create function import_jobs(p jsonb) returns jsonb
language plpgsql security invoker set search_path = public as $$
declare
  r jsonb;
  v_id bigint;
  v_created int := 0;
  v_updated int := 0;
begin
  for r in select * from jsonb_array_elements(coalesce(p->'rows', '[]')) loop
    select id into v_id from jobs where lower(code) = lower(r->'job'->>'code');
    if v_id is null then v_created := v_created + 1; else v_updated := v_updated + 1; end if;
    v_id := admin_save_job(jsonb_build_object('id', v_id, 'job', r->'job', 'prefectureIds', r->'prefectureIds',
      'occupationIds', r->'occupationIds', 'skillIds', r->'skillIds', 'benefits', r->'benefits'));
    insert into interview_events (job_id, starts_at)
      select v_id, t::timestamptz from (select distinct jsonb_array_elements_text(coalesce(r->'interviews', '[]')) t) s
      where not exists (select 1 from interview_events e where e.job_id = v_id and e.starts_at = t::timestamptz);
  end loop;
  return jsonb_build_object('created', v_created, 'updated', v_updated);
end $$;
revoke execute on function import_jobs(jsonb) from public, anon;
grant execute on function import_jobs(jsonb) to authenticated;
