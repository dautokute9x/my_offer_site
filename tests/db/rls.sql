-- RLS: anon / authenticated không phải admin / admin / admin đã đăng xuất.
-- Chạy trong transaction và rollback để không để lại dữ liệu cho file test khác.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'user@example.test');
insert into admins (user_id) values ('00000000-0000-0000-0000-00000000000a');
insert into jobs (code, slug, status, title_vi, title_ja) values ('DRAFT1', 'draft-1', 'draft', 'Tin nháp', '下書き');
insert into job_prefectures (job_id, prefecture_id) select id, 13 from jobs where code = 'DRAFT1';
insert into interview_events (job_id, starts_at) select id, now() + interval '1 day' from jobs where code = 'DRAFT1';
insert into applications (ref_code, kind, full_name, consent_version, consent_at, idempotency_key, ip_hash)
  values ('HS-ABCDEF', 'consult', 'Nguyễn Văn A', 'v1', now(), 'k-1', 'h');
insert into application_notes (application_id, body) select id, 'ghi chú' from applications;
insert into storage.objects (bucket_id, name) values ('cvs', 'x/cv.pdf');

-- Kiểm tra dùng chung cho anon và authenticated không phải admin.
create function pg_temp.assert_public(who text) returns void language plpgsql as $$
declare n int;
begin
  begin select count(*) into n from applications; exception when insufficient_privilege then n := 0; end;
  if n <> 0 then raise exception '% đọc được applications', who; end if;
  begin select count(*) into n from application_notes; exception when insufficient_privilege then n := 0; end;
  if n <> 0 then raise exception '% đọc được application_notes', who; end if;
  begin select count(*) into n from admins; exception when insufficient_privilege then n := 0; end;
  if n <> 0 then raise exception '% đọc được admins', who; end if;
  begin
    insert into applications (ref_code, kind, full_name, consent_version, consent_at, idempotency_key, ip_hash)
      values ('HS-ZZZZZZ', 'consult', 'X', 'v1', now(), 'k-2', 'h');
    raise exception '% insert được applications', who;
  exception when insufficient_privilege then null;  -- RLS cũng ném 42501
  end;
  select count(*) into n from jobs where status = 'draft';
  if n <> 0 then raise exception '% thấy tin draft', who; end if;
  select count(*) into n from job_prefectures where job_id not in (select id from jobs);
  if n <> 0 then raise exception '% thấy job_prefectures của tin draft', who; end if;
  select count(*) into n from interview_events where job_id not in (select id from jobs);
  if n <> 0 then raise exception '% thấy lịch của tin draft', who; end if;
  select count(*) into n from storage.objects where bucket_id = 'cvs';
  if n <> 0 then raise exception '% thấy CV trong storage', who; end if;
  update jobs set title_vi = 'hack';
  get diagnostics n = row_count;
  if n <> 0 then raise exception '% sửa được jobs', who; end if;
  update site_settings set data = '{}';
  get diagnostics n = row_count;
  if n <> 0 then raise exception '% sửa được site_settings', who; end if;
  -- Phần công khai vẫn đọc được.
  if (select count(*) from jobs) = 0 or (select count(*) from prefectures) <> 47
     or (select count(*) from site_settings) <> 1 or (select count(*) from interview_events) = 0 then
    raise exception '% không đọc được dữ liệu công khai', who; end if;
end $$;
grant execute on function pg_temp.assert_public(text) to anon, authenticated;

set role anon;
do $$ begin perform pg_temp.assert_public('anon'); end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin perform pg_temp.assert_public('authenticated'); end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  if not is_admin() then raise exception 'admin không được nhận là admin'; end if;
  if (select count(*) from applications) <> 1 then raise exception 'admin không đọc được applications'; end if;
  if (select count(*) from application_notes) <> 1 then raise exception 'admin không đọc được application_notes'; end if;
  if (select count(*) from jobs where status = 'draft') <> 1 then raise exception 'admin không thấy tin draft'; end if;
  if (select count(*) from storage.objects where bucket_id = 'cvs') <> 1 then raise exception 'admin không đọc được CV'; end if;
  update applications set status = 'new';
  delete from storage.objects where bucket_id = 'cvs';
  if (select count(*) from storage.objects) <> 0 then raise exception 'admin không xóa được CV'; end if;
end $$;

-- Mất quyền: claim sub rỗng (đăng xuất / phiên hết hạn).
set request.jwt.claim.sub = '';
do $$ begin perform pg_temp.assert_public('admin đã đăng xuất'); end $$;
reset role;
reset request.jwt.claim.sub;

-- norm_text
do $$ begin
  if norm_text('  Kỹ   Sư ĐIỆN ') <> 'ky su dien' then raise exception 'norm_text tiếng Việt: %', norm_text('  Kỹ   Sư ĐIỆN '); end if;
  if norm_text('ﾊﾟｲﾌﾟ') <> 'パイプ' then raise exception 'norm_text kana nửa độ rộng: %', norm_text('ﾊﾟｲﾌﾟ'); end if;
  if norm_text('ガス') <> 'ガス' then raise exception 'norm_text mất dakuten'; end if;
  if norm_text('ＡｕｔｏＣＡＤ') <> 'autocad' then raise exception 'norm_text full-width'; end if;
  if norm_text('東京都') <> '東京都' then raise exception 'norm_text kanji'; end if;
end $$;

rollback;
