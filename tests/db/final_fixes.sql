-- 0006: admin_save_job tính search_text một lần (bulk_links), upcoming_interviews gọn + giới hạn, index, extension.
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'admin@example.test');
insert into admins (user_id) values ('00000000-0000-0000-0000-00000000000a');

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ declare v bigint; t text; u timestamptz; begin
  v := admin_save_job(jsonb_build_object('prefectureIds', '[27]'::jsonb, 'occupationIds', '[]'::jsonb,
    'skillIds', (select jsonb_agg(id) from skills where name = 'SolidWorks'), 'benefits', '{}'::jsonb,
    'job', jsonb_build_object('code', 'FX01', 'slug', 's', 'status', 'draft', 'title_vi', 'Kỹ sư', 'title_ja', 'テスト',
      'location_detail_ja', '', 'salary_needs_review', false, 'translation_status', 'none')));
  select search_text, updated_at into t, u from jobs where id = v;
  if t not like '%osaka%' or t not like '%solidworks%' then raise exception 'search_text sau admin_save_job: %', t; end if;
  if current_setting('app.bulk_links', true) is distinct from 'off' then raise exception 'bulk_links chưa tắt'; end if;
  -- Ghi bảng nối ngoài admin_save_job: trigger vẫn tính lại.
  insert into job_prefectures values (v, 13);
  if (select search_text from jobs where id = v) not like '%tokyo%' then raise exception 'trigger bảng nối không chạy'; end if;
  -- Lưu lại y nguyên: lần UPDATE search_text cuối không đổi updated_at.
  update jobs set updated_at = '2000-01-01' where id = v;
  perform admin_save_job(jsonb_build_object('id', v, 'prefectureIds', '[13, 27]'::jsonb, 'occupationIds', '[]'::jsonb,
    'skillIds', (select jsonb_agg(id) from skills where name = 'SolidWorks'), 'benefits', '{}'::jsonb,
    'job', (select to_jsonb(j) - 'id' - 'search_text' - 'updated_at' - 'created_at' from jobs j where id = v)));
  if (select updated_at from jobs where id = v) <> '2000-01-01' then raise exception 'lưu y nguyên đổi updated_at'; end if;
end $$;
reset role;

-- upcoming_interviews: job chỉ gồm trường trang dùng; mặc định đến hôm nay + 60 ngày (JST); tối đa 500.
do $$ declare r jsonb; jid bigint := (select id from jobs where code = '00412'); far timestamptz := date_trunc('second', now() + interval '90 days'); begin
  r := upcoming_interviews('{}');
  if (select array_agg(k order by k) from jsonb_object_keys(r->0->'job') k)
     <> array['code', 'id', 'isDemo', 'occupationIds', 'prefectureIds', 'slug', 'status', 'titleJa', 'titleVi'] then
    raise exception 'job thừa/thiếu trường: %', r->0->'job'; end if;
  insert into interview_events (job_id, starts_at) values (jid, far);
  if exists (select 1 from jsonb_array_elements(upcoming_interviews('{}')) x where (x->>'startsAt')::timestamptz = far) then
    raise exception 'lịch quá 60 ngày lọt vào mặc định'; end if;
  if not exists (select 1 from jsonb_array_elements(upcoming_interviews(jsonb_build_object('to', to_char(far + interval '1 day', 'YYYY-MM-DD')))) x
                  where (x->>'startsAt')::timestamptz = far) then raise exception 'có `to` thì phải thấy lịch xa'; end if;
  insert into interview_events (job_id, starts_at) select jid, now() + interval '1 day' + g * interval '1 minute' from generate_series(1, 600) g;
  if jsonb_array_length(upcoming_interviews('{}')) <> 500 then raise exception 'không giới hạn 500'; end if;
end $$;

-- Index và extension.
do $$ declare i text; begin
  foreach i in array array['application_notes_application', 'applications_created', 'job_prefectures_prefecture',
      'job_occupations_occupation', 'job_skills_skill'] loop
    if to_regclass('public.' || i) is null then raise exception 'thiếu index %', i; end if;
  end loop;
  if not exists (select 1 from pg_extension e join pg_namespace n on n.oid = e.extnamespace where extname = 'pg_trgm' and nspname = 'extensions')
    then raise exception 'pg_trgm không ở schema extensions'; end if;
end $$;
rollback;
