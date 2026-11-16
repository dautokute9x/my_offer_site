-- import_jobs: tạo + cập nhật, lịch phỏng vấn không nhân đôi; một dòng sai → rollback toàn bộ; non-admin bị từ chối.
begin;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'user@example.test');
insert into admins (user_id) values ('00000000-0000-0000-0000-00000000000a');

create function pg_temp.row(p_code text, p_pref int, p_iv text[]) returns jsonb language sql as $$
  select jsonb_build_object('prefectureIds', jsonb_build_array(p_pref), 'occupationIds', '[]'::jsonb, 'skillIds', '[]'::jsonb,
    'benefits', '{}'::jsonb, 'interviews', to_jsonb(p_iv),
    'job', jsonb_build_object('code', p_code, 'slug', 's', 'status', 'draft', 'title_vi', 'T', 'title_ja', 'タ',
      'location_detail_ja', '', 'salary_needs_review', false, 'translation_status', 'none'))
$$;
grant execute on function pg_temp.row(text, int, text[]) to authenticated;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ declare res jsonb; begin
  res := import_jobs(jsonb_build_object('rows', jsonb_build_array(
    pg_temp.row('IM01', 13, array['2026-11-20T01:00:00Z', '2026-11-20T01:00:00Z']), pg_temp.row('IM02', 14, array[]::text[]))));
  if res <> '{"created": 2, "updated": 0}' then raise exception 'kết quả sai: %', res; end if;
  if (select count(*) from interview_events e join jobs j on j.id = e.job_id where j.code = 'IM01') <> 1 then raise exception 'lịch không khử trùng'; end if;

  -- Nhập lại (mã khác hoa thường) → cập nhật, bảng nối được thay, lịch trùng bị bỏ, lịch mới được thêm.
  res := import_jobs(jsonb_build_object('rows', jsonb_build_array(
    pg_temp.row('im01', 27, array['2026-11-20T01:00:00Z', '2026-11-21T01:00:00Z']))));
  if res <> '{"created": 0, "updated": 1}' then raise exception 'kết quả sai: %', res; end if;
  if (select count(*) from jobs where lower(code) = 'im01') <> 1 then raise exception 'tạo trùng tin'; end if;
  if (select prefecture_id from job_prefectures jp join jobs j on j.id = jp.job_id where j.code = 'im01') <> 27 then raise exception 'bảng nối không được thay'; end if;
  if (select count(*) from interview_events e join jobs j on j.id = e.job_id where lower(j.code) = 'im01') <> 2 then raise exception 'lịch sai'; end if;

  -- Một dòng sai (tỉnh 9999) → không ghi gì, kể cả dòng hợp lệ đứng trước.
  begin
    perform import_jobs(jsonb_build_object('rows', jsonb_build_array(pg_temp.row('IM03', 13, array[]::text[]), pg_temp.row('IM04', 9999, array[]::text[]))));
    raise exception 'tỉnh 9999 không được chấp nhận';
  exception when foreign_key_violation then null;
  end;
end $$;
reset role;
do $$ begin
  if exists (select 1 from jobs where code in ('IM03', 'IM04')) then raise exception 'rollback không nguyên tử'; end if;
end $$;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  begin
    perform import_jobs(jsonb_build_object('rows', jsonb_build_array(pg_temp.row('IM05', 13, array[]::text[]))));
    raise exception 'non-admin nhập được';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set role anon;
do $$ begin
  begin perform import_jobs('{}'); raise exception 'anon gọi được import_jobs';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
