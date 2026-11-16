-- Giai đoạn 2: hàm đọc công khai (RPC). Ngữ nghĩa giống hệt lib/data/demo.ts (tests/db/parity.test.ts so khớp).
-- security invoker: RLS của người gọi vẫn áp dụng. JSON chỉ chiếu cột tường minh (không jobs.*, không truyền nguyên dòng)
-- và không trả search_text, translation_source_hash, salary_needs_review, để sau này revoke cột với anon vẫn được.
-- Tham số `now` (ISO) chỉ dùng cho test; mặc định now().

-- Định dạng như Date.toISOString(): so sánh chuỗi ở TS vẫn đúng thứ tự thời gian.
create function iso_utc(t timestamptz) returns text language sql stable parallel safe set search_path = pg_catalog as $$
  select to_char(t at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
$$;

-- = normCode() trong lib/normalize.ts
create function norm_code(t text) returns text language sql immutable parallel safe set search_path = public as $$
  select regexp_replace(regexp_replace(norm_text(t), '^#', ''), '\s+', '', 'g')
$$;

-- Mẫu LIKE '%t%' khớp nguyên văn t (thoát \ % _) — dùng được index trigram jobs_search_text_trgm.
create function like_contains(t text) returns text language sql immutable parallel safe set search_path = pg_catalog as $$
  select '%' || replace(replace(replace(t, '\', '\\'), '%', '\%'), '_', '\_') || '%'
$$;

-- Mã tin không phân biệt hoa thường (tra cứu bằng lower(code) = norm_code(...)).
create unique index jobs_code_lower on jobs (lower(code));

-- Sắp theo mã: `lower(code) collate "C", code collate "C" desc` = String.localeCompare với mã [A-Za-z0-9]
-- (không phân biệt hoa thường, chữ thường trước), không phụ thuộc collation của DB.

-- Job (lib/types.ts). Mảng id sắp theo id.
create function job_json(p_id bigint) returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'id', j.id, 'code', j.code, 'slug', j.slug, 'status', j.status, 'isDemo', j.is_demo,
    'publishedAt', iso_utc(j.published_at), 'updatedAt', iso_utc(j.updated_at), 'validThrough', iso_utc(j.valid_through),
    'titleVi', j.title_vi, 'titleJa', j.title_ja, 'employerName', j.employer_name, 'locationDetailJa', j.location_detail_ja,
    'prefectureIds', coalesce((select jsonb_agg(prefecture_id order by prefecture_id) from job_prefectures where job_id = j.id), '[]'),
    'occupationIds', coalesce((select jsonb_agg(occupation_id order by occupation_id) from job_occupations where job_id = j.id), '[]'),
    'skillIds', coalesce((select jsonb_agg(skill_id order by skill_id) from job_skills where job_id = j.id), '[]'),
    'benefits', coalesce((select jsonb_object_agg(b.slug, jb.value) from job_benefits jb join benefits b on b.id = jb.benefit_id
                          where jb.job_id = j.id), '{}'),
    'monthlyMinYen', j.monthly_min_yen, 'monthlyMaxYen', j.monthly_max_yen,
    'annualMinYen', j.annual_min_yen, 'annualMaxYen', j.annual_max_yen,
    'salaryNegotiable', j.salary_negotiable, 'salarySourceText', j.salary_source_text,
    'jpLevel', j.jp_level, 'jpNote', j.jp_note, 'experienceYearsMin', j.experience_years_min, 'experienceNote', j.experience_note,
    'driverLicenseRequired', j.driver_license_required, 'companyCarProvided', j.company_car_provided,
    'content', jsonb_build_object(
      'summary', jsonb_build_object('ja', j.summary_ja, 'vi', j.summary_vi),
      'description', jsonb_build_object('ja', j.description_ja, 'vi', j.description_vi),
      'requirements', jsonb_build_object('ja', j.requirements_ja, 'vi', j.requirements_vi),
      'workingHours', jsonb_build_object('ja', j.working_hours_ja, 'vi', j.working_hours_vi),
      'holidays', jsonb_build_object('ja', j.holidays_ja, 'vi', j.holidays_vi),
      'overtime', jsonb_build_object('ja', j.overtime_ja, 'vi', j.overtime_vi),
      'benefitsNote', jsonb_build_object('ja', j.benefits_note_ja, 'vi', j.benefits_note_vi)),
    'translationStatus', j.translation_status)
  from jobs j where j.id = p_id
$$;

-- InterviewEvent
create function interview_json(p_id bigint) returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object('id', e.id, 'jobId', e.job_id, 'startsAt', iso_utc(e.starts_at), 'endsAt', iso_utc(e.ends_at),
    'format', e.format, 'publicNote', e.public_note, 'status', e.status)
  from interview_events e where e.id = p_id
$$;

-- Lịch sắp tới của một tin, tăng dần.
create function job_upcoming(p_job_id bigint, p_now timestamptz) returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(interview_json(e.id) order by e.starts_at, e.id), '[]')
  from interview_events e where e.job_id = p_job_id and e.status = 'scheduled' and e.starts_at > p_now
$$;

-- JobSummary = Job + nextInterview
create function job_summary_json(p_id bigint, p_now timestamptz) returns jsonb language sql stable set search_path = public as $$
  select job_json(p_id) || jsonb_build_object('nextInterview', job_upcoming(p_id, p_now) -> 0)
$$;

create function search_jobs(p jsonb) returns jsonb
language sql stable security invoker set search_path = public as $$
  with f as (
    select coalesce((p->>'now')::timestamptz, now()) as now,
      array(select like_contains(t) from unnest(string_to_array(regexp_replace(norm_text(coalesce(p->>'q', '')), '^#', ''), ' ')) t
            where t <> '') as pats,
      norm_code(coalesce(p->>'q', '')) as code,
      array(select jsonb_array_elements_text(coalesce(p->'prefectures', '[]'))) as prefs,
      array(select jsonb_array_elements_text(coalesce(p->'groups', '[]'))) as groups,
      array(select jsonb_array_elements_text(coalesce(p->'occupations', '[]'))) as occs,
      array(select jsonb_array_elements_text(coalesce(p->'benefits', '[]'))) as bens,
      (p->>'salaryMinMan')::numeric * 10000 as smin, (p->>'salaryMaxMan')::numeric * 10000 as smax,
      coalesce(p->>'period', 'month') = 'year' as yearly,
      array_position(array['none', 'N5', 'N4', 'N3', 'N2', 'N1'], nullif(p->>'jpLevel', '')) as jp,
      (p->>'maxExperience')::int as maxexp,
      coalesce((p->>'hasInterview')::bool, false) as has_pv,
      coalesce(p->>'sort', 'moi') as sort,
      greatest(coalesce((p->>'page')::int, 1), 1) as page
  ), m as (
    select j.id, j.code, j.updated_at,
      -- salaryOf(): thiếu một đầu thì lấy đầu còn lại
      case when f.yearly then coalesce(j.annual_min_yen, j.annual_max_yen) else coalesce(j.monthly_min_yen, j.monthly_max_yen) end as lo,
      case when f.yearly then coalesce(j.annual_max_yen, j.annual_min_yen) else coalesce(j.monthly_max_yen, j.monthly_min_yen) end as hi,
      (select min(e.starts_at) from interview_events e
        where e.job_id = j.id and e.status = 'scheduled' and e.starts_at > f.now) as next_at
    from jobs j, f
    where j.status = 'published' and (j.valid_through is null or j.valid_through > f.now)
      -- Từ khóa đầu là điều kiện đơn lẻ để planner dùng index trigram; LIKE ALL kiểm tra đủ mọi từ khóa.
      -- shortcut: index chỉ lọc theo từ khóa đầu, đổi sang từ khóa dài nhất nếu truy vấn nhiều từ chậm.
      and j.search_text like (select coalesce(f.pats[1], '%') from f)
      and j.search_text like all (f.pats)
      and (cardinality(f.prefs) = 0 or exists (select 1 from job_prefectures jp join prefectures pr on pr.id = jp.prefecture_id
                                               where jp.job_id = j.id and pr.code = any(f.prefs)))
      and (cardinality(f.groups) + cardinality(f.occs) = 0 or exists (
            select 1 from job_occupations jo join occupations o on o.id = jo.occupation_id
              join occupation_groups g on g.id = o.group_id
             where jo.job_id = j.id and (g.slug = any(f.groups) or o.slug = any(f.occs))))
      and (f.jp is null or j.jp_level is null
           or array_position(array['none', 'N5', 'N4', 'N3', 'N2', 'N1'], j.jp_level) <= f.jp)
      and (f.maxexp is null or j.experience_years_min is null or j.experience_years_min <= f.maxexp)
      and not exists (select 1 from unnest(f.bens) s where not exists (
            select 1 from job_benefits jb join benefits b on b.id = jb.benefit_id
             where jb.job_id = j.id and b.slug = s and jb.value))
  ), r as (
    select m.id, row_number() over (order by
        lower(m.code) = f.code desc,  -- mã khớp chính xác (normCode, không phân biệt hoa thường) lên đầu
        case when f.sort = 'pv' then m.next_at end nulls last,
        case when f.sort = 'luong' then m.hi end desc nulls last,
        case when f.sort not in ('pv', 'luong') then m.updated_at end desc,
        lower(m.code) collate "C", m.code collate "C" desc) as rn
    from m, f
    where (f.smin is null and f.smax is null
           or m.hi is not null and (f.smin is null or m.hi >= f.smin) and (f.smax is null or m.lo <= f.smax))
      and (not f.has_pv or m.next_at is not null)
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(job_summary_json(r.id, f.now) order by r.rn) from r
                        where r.rn > (f.page - 1) * 12 and r.rn <= f.page * 12), '[]'),
    'total', (select count(*) from r), 'page', f.page, 'pageSize', 12,
    'pageCount', ceil((select count(*) from r) / 12.0)::int)
  from f
$$;

-- Tin draft trả null kể cả với admin (RLS cho admin thấy draft).
create function get_job(p_code text) returns jsonb
language sql stable security invoker set search_path = public as $$
  select job_json(j.id) || jsonb_build_object('interviews', job_upcoming(j.id, now()))
  from jobs j where lower(j.code) = norm_code(p_code) and j.status <> 'draft'
$$;

-- Điểm = 2 × số nghề chung + số tỉnh chung; chỉ tin đang tuyển, điểm > 0.
create function related_jobs(p_job_id bigint, p_limit int default 4) returns jsonb
language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_agg(job_summary_json(s.id, now()) order by s.score desc, lower(s.code) collate "C", s.code collate "C" desc), '[]')
  from (
    select * from (
      select j.id, j.code, 2 * (select count(*) from job_occupations a join job_occupations b using (occupation_id)
                                 where a.job_id = j.id and b.job_id = p_job_id)
                           + (select count(*) from job_prefectures a join job_prefectures b using (prefecture_id)
                               where a.job_id = j.id and b.job_id = p_job_id) as score
      from jobs j
      where j.id <> p_job_id and j.status = 'published' and (j.valid_through is null or j.valid_through > now())
    ) x
    where x.score > 0
    order by x.score desc, lower(x.code) collate "C", x.code collate "C" desc
    limit p_limit
  ) s
$$;

-- Lịch phỏng vấn sắp tới của tin đang tuyển, kèm `job`. from/to là ngày JST 'YYYY-MM-DD'.
create function upcoming_interviews(p jsonb) returns jsonb
language sql stable security invoker set search_path = public as $$
  with f as (
    select coalesce((p->>'now')::timestamptz, now()) as now, nullif(p->>'from', '') as dfrom, nullif(p->>'to', '') as dto,
      array(select jsonb_array_elements_text(coalesce(p->'prefectures', '[]'))) as prefs,
      array(select jsonb_array_elements_text(coalesce(p->'occupations', '[]'))) as occs
  )
  select coalesce(jsonb_agg(interview_json(e.id) || jsonb_build_object('job', job_json(j.id)) order by e.starts_at, e.id), '[]')
  from interview_events e join jobs j on j.id = e.job_id, f
  where e.status = 'scheduled' and e.starts_at > f.now
    and j.status = 'published' and (j.valid_through is null or j.valid_through > f.now)
    and (f.dfrom is null or to_char(e.starts_at at time zone 'Asia/Tokyo', 'YYYY-MM-DD') collate "C" >= f.dfrom)
    and (f.dto is null or to_char(e.starts_at at time zone 'Asia/Tokyo', 'YYYY-MM-DD') collate "C" <= f.dto)
    -- như demo: mã tỉnh không tồn tại thì bỏ qua bộ lọc tỉnh; slug nghề lạ thì không khớp gì
    and (not exists (select 1 from prefectures pr where pr.code = any(f.prefs)) or exists (
          select 1 from job_prefectures jp join prefectures pr on pr.id = jp.prefecture_id
           where jp.job_id = j.id and pr.code = any(f.prefs)))
    and (cardinality(f.occs) = 0 or exists (
          select 1 from job_occupations jo join occupations o on o.id = jo.occupation_id
           where jo.job_id = j.id and o.slug = any(f.occs)))
$$;

-- { slug nhóm: số tin đang tuyển }
create function open_job_counts_by_group() returns jsonb
language sql stable security invoker set search_path = public as $$
  select coalesce(jsonb_object_agg(g.slug, (
    select count(*) from jobs j
     where j.status = 'published' and (j.valid_through is null or j.valid_through > now())
       and exists (select 1 from job_occupations jo join occupations o on o.id = jo.occupation_id
                    where jo.job_id = j.id and o.group_id = g.id))), '{}')
  from occupation_groups g
$$;

grant execute on function search_jobs(jsonb), get_job(text), related_jobs(bigint, int), upcoming_interviews(jsonb),
  open_job_counts_by_group() to anon, authenticated;
