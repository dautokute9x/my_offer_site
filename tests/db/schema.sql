-- Cấu trúc: RLS bật ở mọi bảng, trigger search_text/updated_at, seed, bucket CV.
do $$ declare bad text;
begin
  select string_agg(relname, ', ') into bad from pg_class
   where relnamespace = 'public'::regnamespace and relkind in ('r', 'p') and not relrowsecurity;
  if bad is not null then raise exception 'Bảng public chưa bật RLS: %', bad; end if;
  if not exists (select 1 from storage.buckets where id = 'cvs' and public = false) then
    raise exception 'bucket cvs phải tồn tại và private'; end if;
  if has_function_privilege('public', 'is_admin()', 'execute') then raise exception 'is_admin() còn cấp cho public'; end if;
  if (select prosecdef from pg_proc where oid = 'is_admin()'::regprocedure) is not true then
    raise exception 'is_admin() phải security definer'; end if;
  if (select provolatile from pg_proc where oid = 'norm_text(text)'::regprocedure) <> 'i' then
    raise exception 'norm_text phải immutable'; end if;
end $$;

-- Seed
do $$ begin
  if (select count(*) from prefectures) <> 47 or (select count(*) from occupation_groups) <> 5
     or (select count(*) from occupations) <> 20 or (select count(*) from skills) <> 12 or (select count(*) from benefits) <> 8 then
    raise exception 'seed_catalog thiếu dòng'; end if;
  if (select count(*) from jobs where is_demo) <> 15 or (select count(*) from interview_events) <> 9 then
    raise exception 'seed_demo thiếu dòng'; end if;
  if (select data->>'consentVersion' from site_settings where id = 1) is null then raise exception 'site_settings chưa seed'; end if;
  -- Sequence đã được đặt lại sau khi seed với id tường minh.
  insert into skills (name) values ('__probe__');
  if (select id from skills where name = '__probe__') <> 13 then raise exception 'sequence skills chưa reset'; end if;
  delete from skills where name = '__probe__';
end $$;

-- search_text: trigger trên jobs và trên các bảng nối.
do $$ declare j bigint; t text; u timestamptz;
begin
  if (select search_text from jobs where code = '00412') not like '%00412%tokyo%' then
    raise exception 'search_text seed sai: %', (select search_text from jobs where code = '00412'); end if;
  if (select search_text from jobs where code = '00412') not like '%autocad%' then raise exception 'search_text thiếu kỹ năng'; end if;
  insert into jobs (code, slug, title_vi, title_ja, updated_at) values ('T1', 't1', 'Kỹ Sư Thử', 'テスト', '2000-01-01')
    returning id into j;
  if (select search_text from jobs where id = j) <> 't1 ky su thu テスト' then
    raise exception 'search_text insert: %', (select search_text from jobs where id = j); end if;
  insert into job_prefectures values (j, 27);
  insert into job_occupations values (j, 3);
  insert into job_skills values (j, 4);
  select search_text, updated_at into t, u from jobs where id = j;
  if t not like '%osaka%' or t not like '%plc/回路設計%' or t not like '%solidworks%' then raise exception 'search_text bảng nối: %', t; end if;
  if u <> '2000-01-01' then raise exception 'cập nhật search_text không được đổi updated_at'; end if;
  delete from job_prefectures where job_id = j;
  if (select search_text from jobs where id = j) like '%osaka%' then raise exception 'search_text không cập nhật khi xóa'; end if;
  update jobs set title_vi = 'Khác' where id = j;
  if (select updated_at from jobs where id = j) = '2000-01-01' then raise exception 'updated_at không được cập nhật'; end if;
  delete from jobs where id = j;
end $$;

-- Sửa alias danh mục → search_text của tin liên quan cập nhật, updated_at giữ nguyên.
do $$ declare u timestamptz;
begin
  select updated_at into u from jobs where code = '00412';
  update skills set aliases = array['Ｚｚｑ Alias'] where name = 'AutoCAD';
  if (select search_text from jobs where code = '00412') not like '%' || norm_text('Ｚｚｑ Alias') || '%' then
    raise exception 'search_text không cập nhật khi sửa alias kỹ năng'; end if;
  if (select updated_at from jobs where code = '00412') <> u then raise exception 'sửa danh mục không được đổi updated_at'; end if;
  update prefectures set aliases = aliases || 'Qqtokyo'::text where id = 13;
  if (select search_text from jobs where code = '00412') not like '%qqtokyo%' then raise exception 'search_text không cập nhật khi sửa tỉnh'; end if;
  update occupations set name_vi = 'Nghề Qqz' where id = 2;
  if (select search_text from jobs where code = '00412') not like '%nghe qqz%' then raise exception 'search_text không cập nhật khi sửa nghề'; end if;
end $$;

-- Mã tin unique không phân biệt hoa thường.
do $$ begin
  insert into jobs (code, slug, title_vi, title_ja) values ('abc1', 'x', 'x', 'x');
  begin
    insert into jobs (code, slug, title_vi, title_ja) values ('ABC1', 'x', 'x', 'x');
    raise exception 'trùng mã khác hoa thường phải lỗi';
  exception when unique_violation then null;
  end;
  delete from jobs where code = 'abc1';
end $$;

-- seed_demo tính ngày tương đối theo app.demo_now (Task 3 dùng để ghim now).
set app.demo_now = '2026-11-16T20:00:00Z';  -- = 2026-11-17 05:00 JST
\i supabase/seed_demo.sql
do $$ begin
  if (select count(*) from jobs) <> 15 then raise exception 'chạy lại seed_demo phải thay thế tin demo'; end if;
  if (select updated_at from jobs where code = '00412') <> '2026-11-15T20:00:00Z' then raise exception 'updated_at demo sai'; end if;
  if (select valid_through from jobs where code = '50388') <> timestamptz '2026-11-16T20:00:00Z' + interval '1440 hours' then
    raise exception 'valid_through demo sai'; end if;
  -- Lịch đầu của 00412: hôm nay JST (17/11) + 2 ngày, 10:00 JST.
  if (select min(starts_at) from interview_events e join jobs j on j.id = e.job_id where j.code = '00412') <> '2026-11-19T10:00:00+09:00' then
    raise exception 'starts_at demo sai'; end if;
end $$;
reset app.demo_now;
