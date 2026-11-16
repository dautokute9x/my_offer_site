-- start_application: idempotent, giới hạn theo ip_hash, tin đóng, quyền execute.
begin;

insert into jobs (code, slug, status, title_vi, title_ja) values ('closed1', 'closed-1', 'closed', 'Tin đóng', '終了');

create function pg_temp.req(key text, ip text, job text default '00412', kind text default 'apply') returns jsonb language sql as $$
  select jsonb_build_object('idempotencyKey', key, 'ipHash', ip, 'kind', kind, 'jobCode', job, 'fullName', 'Nguyễn Văn A',
    'phone', '0901234567', 'consentVersion', 'v1', 'cvExt', case when kind = 'apply' then 'pdf' end,
    'cvMime', case when kind = 'apply' then 'application/pdf' end)
$$;

set role service_role;
do $$
declare a jsonb; b jsonb; r jsonb; i int;
begin
  a := start_application(pg_temp.req('k-1', 'ip-a'));
  b := start_application(pg_temp.req('k-1', 'ip-a'));
  if a ? 'error' or a->>'refCode' !~ '^HS-[2-9A-HJ-NP-Z]{6}$' then raise exception 'start lỗi: %', a; end if;
  if b->>'refCode' <> a->>'refCode' or b->>'id' <> a->>'id' or b->>'cvPath' <> a->>'cvPath' then raise exception 'không idempotent: % / %', a, b; end if;
  if (a->>'created')::bool is not true or (b->>'created')::bool then raise exception 'cờ created sai: % / %', a, b; end if;
  if (select count(*) from applications where idempotency_key = 'k-1') <> 1 then raise exception 'trùng dòng'; end if;
  if a->>'status' <> 'pending_upload' then raise exception 'có CV phải pending_upload: %', a; end if;
  if a->>'cvPath' !~ ('^cvs/\d{4}/\d{2}/' || (a->>'id') || '/[0-9a-f-]{36}\.pdf$') then raise exception 'cvPath sai: %', a->>'cvPath'; end if;
  if not exists (select 1 from applications where id = (a->>'id')::uuid and job_id is not null and job_title is not null
      and consent_version = 'v1' and consent_at is not null and delete_after = (current_date + interval '12 months')::date
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

rollback;
