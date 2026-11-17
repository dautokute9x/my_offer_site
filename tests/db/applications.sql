-- start_application: idempotent, giới hạn theo ip_hash, tin đóng, quyền execute.
begin;

insert into jobs (code, slug, status, title_vi, title_ja) values ('closed1', 'closed-1', 'closed', 'Tin đóng', '終了');
-- consent_version lấy từ site_settings, không lấy giá trị client ('v1' trong req).
update site_settings set data = data || '{"consentVersion": "v-site"}' where id = 1;

create function pg_temp.req(key text, ip text, job text default '00412', kind text default 'apply', ext text default 'pdf') returns jsonb language sql as $$
  select jsonb_build_object('idempotencyKey', key, 'ipHash', ip, 'kind', kind, 'jobCode', job, 'fullName', 'Nguyễn Văn A',
    'phone', '0901234567', 'consentVersion', 'v1', 'cvExt', case when kind = 'apply' then ext end,
    'cvMime', case when kind = 'apply' then 'application/' || ext end)
$$;

set role service_role;
do $$
declare a jsonb; b jsonb; r jsonb; i int;
begin
  a := start_application(pg_temp.req('k-1', 'ip-a'));
  b := start_application(pg_temp.req('k-1', 'ip-a'));
  if a ? 'error' or a->>'refCode' !~ '^HS-[2-9A-HJ-NP-Z]{6}$' then raise exception 'start lỗi: %', a; end if;
  if b->>'refCode' <> a->>'refCode' or b->>'id' <> a->>'id' then raise exception 'không idempotent: % / %', a, b; end if;
  -- Gửi lại khi còn pending_upload: path mới mỗi lần (URL cũ không ghi đè được object sau này).
  if b->>'cvPath' = a->>'cvPath' then raise exception 'gửi lại phải cấp path mới: % / %', a, b; end if;
  if (a->>'created')::bool is not true or (b->>'created')::bool then raise exception 'cờ created sai: % / %', a, b; end if;
  if (select count(*) from applications where idempotency_key = 'k-1') <> 1 then raise exception 'trùng dòng'; end if;
  a := b;  -- dòng hiện giữ path của lần gửi lại
  if a->>'status' <> 'pending_upload' then raise exception 'có CV phải pending_upload: %', a; end if;
  if a->>'cvPath' !~ ('^cvs/\d{4}/\d{2}/' || (a->>'id') || '/[0-9a-f-]{36}\.pdf$') then raise exception 'cvPath sai: %', a->>'cvPath'; end if;
  if not exists (select 1 from applications where id = (a->>'id')::uuid and job_id is not null and job_title is not null
      and consent_version = 'v-site' and consent_at is not null and delete_after = (current_date + interval '12 months')::date
      and cv_path = a->>'cvPath' and cv_mime = 'application/pdf') then raise exception 'dòng thiếu dữ liệu'; end if;

  r := start_application(pg_temp.req('k-c', 'ip-c', null, 'consult'));
  if r->>'status' <> 'new' or r->>'cvPath' is not null then raise exception 'tư vấn không CV phải new: %', r; end if;

  -- Giới hạn 5/10 phút: k-1 đã tính 1; thêm 4 → 5; lần thứ 6 bị chặn. Gửi lại key cũ không bị chặn/không tính.
  for i in 2..5 loop
    r := start_application(pg_temp.req('k-' || i, 'ip-a'));
    if r ? 'error' then raise exception 'lần % bị chặn: %', i, r; end if;
  end loop;
  r := start_application(pg_temp.req('k-6', 'ip-a'));
  if r->>'error' is distinct from 'rate_limited' then raise exception 'lần 6 phải rate_limited: %', r; end if;
  r := start_application(pg_temp.req('k-1', 'ip-a'));
  if r->>'refCode' <> a->>'refCode' then raise exception 'gửi lại key cũ bị chặn: %', r; end if;
  if (select count(*) from applications where ip_hash = 'ip-a') <> 5 then raise exception 'số dòng ip-a sai'; end if;
  -- Dòng cũ hơn 10 phút không tính.
  update applications set created_at = now() - interval '11 minutes' where ip_hash = 'ip-a';
  if start_application(pg_temp.req('k-7', 'ip-a')) ? 'error' then raise exception 'dòng cũ vẫn bị tính'; end if;

  -- Gửi lại hồ sơ còn pending_upload: cập nhật dữ liệu mới; mỗi lần một path mới; chuyển sang tư vấn → new.
  r := start_application(pg_temp.req('k-r', 'ip-r'));
  b := start_application(pg_temp.req('k-r', 'ip-r', ext => 'docx') || '{"email": "moi@example.vn"}');
  if b->>'refCode' <> r->>'refCode' or b->>'status' <> 'pending_upload' or b->>'cvPath' = r->>'cvPath'
     or b->>'cvPath' !~ ('^cvs/\d{4}/\d{2}/' || (r->>'id') || '/[0-9a-f-]{36}\.docx$') then raise exception 'đổi đuôi sai: % / %', r, b; end if;
  if not exists (select 1 from applications where id = (r->>'id')::uuid and email = 'moi@example.vn'
      and cv_path = b->>'cvPath' and cv_mime = 'application/docx') then raise exception 'gửi lại không cập nhật dòng'; end if;
  r := b;
  b := start_application(pg_temp.req('k-r', 'ip-r', ext => 'docx'));
  if b->>'cvPath' = r->>'cvPath' or b->>'cvPath' !~ '\.docx$' or b->>'cvPath' <> (select cv_path from applications where id = (r->>'id')::uuid)
    then raise exception 'cùng đuôi vẫn phải cấp path mới: % / %', r, b; end if;
  b := start_application(pg_temp.req('k-r', 'ip-r', null, 'consult'));
  if b->>'status' <> 'new' or b->>'cvPath' is not null or b->>'refCode' <> r->>'refCode' then raise exception 'chuyển tư vấn sai: %', b; end if;
  if not exists (select 1 from applications where id = (r->>'id')::uuid and kind = 'consult' and status = 'new' and cv_path is null)
    then raise exception 'dòng chưa chuyển tư vấn'; end if;
  -- Đã new: gửi lại không đổi gì.
  b := start_application(pg_temp.req('k-r', 'ip-r') || '{"email": "khac@example.vn"}');
  if b->>'status' <> 'new' or (select email from applications where id = (r->>'id')::uuid) <> 'moi@example.vn' then raise exception 'dòng new bị sửa: %', b; end if;

  -- Gửi lại khi pending_upload: tối đa 5 lần / hồ sơ (mỗi lần một signed URL mới), lần 6 rate_limited, dòng không đổi.
  r := start_application(pg_temp.req('k-u', 'ip-u'));
  for i in 1..5 loop
    b := start_application(pg_temp.req('k-u', 'ip-u'));
    if b ? 'error' or b->>'createdAt' is null then raise exception 'gửi lại lần % sai: %', i, b; end if;
  end loop;
  if b->>'createdAt' <> (select iso_utc(created_at) from applications where id = (r->>'id')::uuid) then raise exception 'createdAt sai: %', b; end if;
  if r ? 'createdAt' then raise exception 'tạo mới không trả createdAt: %', r; end if;
  if (select upload_attempts from applications where id = (r->>'id')::uuid) <> 5 then raise exception 'upload_attempts sai'; end if;
  r := start_application(pg_temp.req('k-u', 'ip-u'));
  if r->>'error' is distinct from 'rate_limited' then raise exception 'gửi lại lần 6 phải rate_limited: %', r; end if;
  if (select cv_path from applications where idempotency_key = 'k-u') <> b->>'cvPath' then raise exception 'lần 6 vẫn đổi path'; end if;

  -- Thiếu consentVersion trong site_settings → dùng giá trị server gửi.
  update site_settings set data = data - 'consentVersion' where id = 1;
  r := start_application(pg_temp.req('k-cv', 'ip-cv'));
  if (select consent_version from applications where idempotency_key = 'k-cv') <> 'v1' then raise exception 'không dự phòng consent'; end if;

  r := start_application(pg_temp.req('k-x', 'ip-x', 'closed1'));
  if r->>'error' is distinct from 'job_closed' then raise exception 'tin đóng phải job_closed: %', r; end if;
  r := start_application(pg_temp.req('k-y', 'ip-x', 'khongco'));
  if r->>'error' is distinct from 'job_closed' then raise exception 'tin không tồn tại phải job_closed: %', r; end if;
  if (select count(*) from applications where ip_hash = 'ip-x') <> 0 then raise exception 'tin đóng vẫn ghi dòng'; end if;
end $$;
reset role;

-- anon / authenticated không được gọi.
do $$
declare who text;
begin
  foreach who in array array['anon', 'authenticated'] loop
    execute format('set local role %I', who);
    begin
      perform start_application(pg_temp.req('k-anon', 'ip-z'));
      raise exception '% gọi được start_application', who;
    exception when insufficient_privilege then null;
    end;
    reset role;
  end loop;
end $$;

-- Bucket cvs giới hạn như Supabase.
do $$ begin
  if not exists (select 1 from storage.buckets where id = 'cvs' and file_size_limit = 10485760 and not public
      and allowed_mime_types @> array['application/pdf', 'application/octet-stream']) then raise exception 'bucket cvs chưa giới hạn'; end if;
end $$;

rollback;
