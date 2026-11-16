-- admin_save_job: admin ghi được và thay bảng nối; non-admin bị từ chối; mã tin duy nhất không phân biệt hoa thường.
begin;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'user@example.test');
insert into admins (user_id) values ('00000000-0000-0000-0000-00000000000a');

create function pg_temp.payload(p_id bigint, p_code text, p_status text, p_ts text, p_ja text, p_pref int[]) returns jsonb language sql as $$
  select jsonb_build_object('id', p_id, 'prefectureIds', to_jsonb(p_pref), 'occupationIds', '[]'::jsonb, 'skillIds', '[]'::jsonb,
    'benefits', jsonb_build_object((select slug from benefits order by id limit 1), true, (select slug from benefits order by id offset 1 limit 1), false),
    'job', jsonb_build_object('code', p_code, 'slug', 's', 'status', p_status, 'title_vi', 'T', 'title_ja', 'タ',
      'location_detail_ja', '', 'salary_needs_review', false, 'translation_status', p_ts, 'description_ja', p_ja, 'annual_min_yen', 3500000))
$$;
grant execute on function pg_temp.payload(bigint, text, text, text, text, int[]) to authenticated;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ declare v bigint; v2 bigint; j jobs; h1 text; begin
  v := admin_save_job(pg_temp.payload(null, 'ZZ01', 'published', 'approved', '原文', array[13, 14]));
  select * into j from jobs where id = v;
  if j.code <> 'ZZ01' or j.published_at is null or j.annual_min_yen <> 3500000 then raise exception 'jobs row sai'; end if;
  if (select count(*) from job_prefectures where job_id = v) <> 2 then raise exception 'thiếu job_prefectures'; end if;
  if (select count(*) from job_benefits where job_id = v) <> 2 or (select count(*) from job_benefits where job_id = v and value = false) <> 1 then
    raise exception 'job_benefits sai'; end if;
  if j.translation_source_hash <> md5(concat_ws(E'\x1f', '', '原文', '', '', '', '', '')) then raise exception 'hash sai: %', j.translation_source_hash; end if;
  h1 := j.translation_source_hash;

  -- Sửa: thay toàn bộ bảng nối; đổi *_ja nhưng giữ trạng thái → hash giữ nguyên.
  perform admin_save_job(pg_temp.payload(v, 'ZZ01', 'published', 'approved', 'đổi', array[27]));
  if (select count(*) from job_prefectures where job_id = v) <> 1 or (select prefecture_id from job_prefectures where job_id = v) <> 27 then
    raise exception 'bảng nối không được thay'; end if;
  if (select translation_source_hash from jobs where id = v) <> h1 then raise exception 'hash đổi dù trạng thái không đổi'; end if;
  -- Đổi trạng thái bản dịch → hash tính lại; về none → null.
  perform admin_save_job(pg_temp.payload(v, 'ZZ01', 'published', 'unreviewed', 'đổi', array[27]));
  if (select translation_source_hash from jobs where id = v) = h1 then raise exception 'hash không tính lại'; end if;
  perform admin_save_job(pg_temp.payload(v, 'ZZ01', 'closed', 'none', 'đổi', array[27]));
  if (select translation_source_hash from jobs where id = v) is not null then raise exception 'hash phải null'; end if;

  -- Mã trùng không phân biệt hoa thường.
  begin
    v2 := admin_save_job(pg_temp.payload(null, 'zz01', 'draft', 'none', null, array[13]));
    raise exception 'mã zz01 trùng ZZ01 nhưng vẫn lưu được';
  exception when unique_violation then null;
  end;
  -- Lỗi giữa chừng (tỉnh không tồn tại) → rollback nguyên tử cả tin mới.
  begin
    perform admin_save_job(pg_temp.payload(null, 'ZZ02', 'draft', 'none', null, array[9999]));
    raise exception 'tỉnh 9999 không được chấp nhận';
  exception when foreign_key_violation then null;
  end;
  if exists (select 1 from jobs where code = 'ZZ02') then raise exception 'tin ZZ02 còn sót sau lỗi'; end if;
end $$;
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  begin
    perform admin_save_job(pg_temp.payload(null, 'ZZ03', 'draft', 'none', null, array[13]));
    raise exception 'non-admin tạo được tin';
  exception when insufficient_privilege then null;
  end;
  begin
    perform admin_save_job(pg_temp.payload((select id from jobs where code = 'ZZ01'), 'ZZ01', 'draft', 'none', null, array[13]));
    raise exception 'non-admin sửa được tin';
  exception when no_data_found or insufficient_privilege then null;
  end;
end $$;
reset role;
set role anon;
do $$ begin
  begin
    perform admin_save_job('{}');
    raise exception 'anon gọi được admin_save_job';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
