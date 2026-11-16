# Giai đoạn 2 — Supabase, hồ sơ riêng tư, quản trị, CSV: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Khi có biến môi trường Supabase, website đọc và ghi dữ liệu thật: tin tuyển dụng, lịch phỏng vấn, hồ sơ kèm CV riêng tư, quản trị viên đăng nhập, nhập tin bằng CSV.
- Khi không có biến môi trường, website giữ nguyên chế độ demo như Giai đoạn 1.

**Architecture:**
- `lib/data/index.ts` chọn nguồn dữ liệu: `demo.ts` hoặc `supabase.ts`, cùng chữ ký hàm.
- Việc lọc và phân trang chạy ở server, trong hàm SQL `search_jobs`.
- Hồ sơ ứng tuyển do server ghi bằng service role, sau khi đã kiểm tra dữ liệu.
- CV được tải thẳng lên bucket riêng tư `cvs` bằng signed upload URL.
- Khu quản trị `/admin` dùng Supabase Auth, có kiểm tra quyền ở server và RLS trong database.
- Migration được kiểm thử trên Postgres 16 cục bộ (`/usr/lib/postgresql/16/bin`), có giả lập các phần `auth`, `storage` và các role của Supabase.

**Tech Stack:** Next.js 16.4 (middleware tên mới là `proxy.ts`), `@supabase/supabase-js`, `@supabase/ssr`, Postgres với extension `pg_trgm` và `unaccent`, vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-16-tuyen-dung-ky-su-design.md` (mục 6, 7, 9, 13). Kết quả Giai đoạn 1 và các việc chuyển tiếp: `docs/superpowers/notes/2026-11-16-giai-doan-1-ket-qua.md`.

## Global Constraints

- **Dependency mới:** chỉ được thêm `@supabase/supabase-js` và `@supabase/ssr`. Không ORM, không zod, không thư viện CSV hay UI.
- **Service role key:**
  - chỉ dùng trong `lib/supabase/admin.ts`;
  - file này có `import "server-only"` (nếu Next không resolve được thì thêm dependency `server-only`);
  - không bao giờ có tiền tố `NEXT_PUBLIC_`.
- **Chế độ demo:** `isDemoMode()` trả về `!process.env.NEXT_PUBLIC_SUPABASE_URL`. Khi demo, mọi hành vi của Giai đoạn 1 giữ nguyên và 25 test e2e hiện có vẫn phải đạt.
- **Định danh:** `jobs.id` là `bigint generated always as identity`, khớp với `Job.id: number`. Định danh công khai vẫn là `code`, regex `^[A-Za-z0-9]{1,20}$`, giữ nguyên số 0 ở đầu.
  - *Quyết định của người lập trình:* đổi từ `uuid` trong spec sang `bigint`, vì kiểu dữ liệu ở client đang là `number`.
- **Lương:** các cột `*_yen` là `integer`. CSV nhập thu nhập năm theo 万円, server nhân 10 000 trước khi lưu.
- **Thời gian:** cột `timestamptz`. Admin nhập giờ theo JST và chuyển đổi bằng `jstToIso` (đã có trong `lib/time.ts`).
- **Chuẩn hóa chuỗi:** `norm_text(text)` trong SQL phải cho cùng kết quả với `normText()` trong `lib/normalize.ts`:
  `normalize(NFKC)` → `lower` → `unaccent` → `đ→d` → gộp khoảng trắng → `trim` → `normalize(NFC)`.
  Test so khớp TS/SQL bắt buộc.
- **Không thông báo thành công giả:** API chỉ trả `200 { ok: true, refCode }` sau khi DB và Storage đã ghi xong.
- **Giới hạn hồ sơ:**
  - tối đa 5 hồ sơ mỗi `ip_hash` trong 10 phút;
  - `ip_hash = sha256(IP_HASH_SALT + ip)`, không lưu IP gốc;
  - CV tối đa 10 MB.
- **Bản ghi đồng ý:** lưu `consent_version` và `consent_at` cho mỗi hồ sơ.
- **Trạng thái hồ sơ:** `pending_upload`, `new`, `contacting`, `interview_scheduled`, `hired`, `rejected`, `withdrawn`. Nhãn tiếng Việt lần lượt: Chờ tải CV, Mới nhận, Đang liên hệ, Hẹn phỏng vấn, Trúng tuyển, Không phù hợp, Rút hồ sơ.
- **Mã hồ sơ:** `ref_code` có dạng `HS-` + 6 ký tự lấy từ bảng chữ `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`, unique.
- **Ngôn ngữ và trình bày:**
  - giao diện admin bằng tiếng Việt, cùng token màu và yêu cầu a11y như Giai đoạn 1;
  - admin chỉ cần dùng tốt từ 768 px trở lên, nhưng ở 390 px không được vỡ trang.
- **Commit:** mỗi task một hoặc vài commit, kèm trailer như Giai đoạn 1. Không push (controller sẽ push).

## Review Focus

1. **Lộ dữ liệu riêng tư cho người công khai.** `anon` hoặc người đã đăng nhập nhưng không phải admin gọi thẳng REST hoặc RPC (`select * from applications`, `storage.objects` của bucket `cvs`, `search_jobs` cố lấy tin `draft`) → không được thấy gì. Test nằm ở Task 2 (`tests/db/rls.sql`).
2. **Gửi lặp hoặc chạy đua.** Hai request `start` cùng `idempotency_key` gửi đồng thời → đúng 1 dòng được tạo, cả hai request nhận cùng `refCode` hoặc cùng `uploadUrl`. Gọi `complete` hai lần → lần sau trả lại kết quả cũ, không lỗi. Test ở Task 5.
3. **CV đội lốt.** Tệp `.pdf` mà nội dung là `MZ`; khai báo 1 KB nhưng tải lên 15 MB; gọi `complete` khi chưa tải tệp → hồ sơ không được chuyển sang `new`, object bị xóa, trả lỗi kèm hướng dẫn thử lại. Test ở Task 5.
4. **CSV bẩn.**
   - Có BOM, xuống dòng CRLF, ô có dấu phẩy và ngoặc kép, mã `00412` dễ bị Excel đổi thành `412`, tỉnh ghi `東京` thay vì `東京都`, lương `350万`, ngày `2026/11/20 10:00`.
   - Kết quả mong đợi: báo lỗi đúng số dòng hoặc nhận đúng alias. Khi còn lỗi thì không ghi dòng nào.
   - Test ở Task 10.
5. **Phiên quản trị hết hạn hoặc đã đăng xuất mà vẫn gọi server action.** Server action phải từ chối bằng `requireAdmin()` và RLS, không chỉ dựa vào việc ẩn nút. Test ở Task 6 (unit cho `requireAdmin`) và Task 2 (RLS).

---

### Task 1: Supabase client, proxy, môi trường kiểm thử DB cục bộ

**Files:**
- Create:
  - `lib/supabase/server.ts`, `lib/supabase/browser.ts`, `lib/supabase/admin.ts`
  - `proxy.ts`
  - `scripts/db-local.sh`
  - `tests/db/supabase-stubs.sql`
- Modify: `package.json` (dependencies; scripts `db:test`, `db:seed`), `.env.example`
- Test: `tests/db/smoke.sql`

**Interfaces:**
- Produces:
  - `createServerSupabase(): Promise<SupabaseClient>`: dùng `@supabase/ssr` với cookie của `next/headers`. Đây là client mang phiên của người dùng.
  - `createBrowserSupabase()`: client cho trang đăng nhập.
  - `createAdminSupabase()`: service role, chỉ chạy ở server, không có phiên.
  - `proxy.ts`: làm mới phiên Supabase cho `/admin/:path*`. Khi demo thì không làm gì.
  - `scripts/db-local.sh <cmd>` với các lệnh `start|reset|psql|stop`:
    - khởi tạo cluster tạm tại `$TMPDIR/pgdata`, cổng 54329;
    - chạy `tests/db/supabase-stubs.sql`, sau đó lần lượt `supabase/migrations/*.sql`, `supabase/seed_catalog.sql`, `supabase/seed_demo.sql`.
  - `tests/db/supabase-stubs.sql` giả lập phần nền của Supabase:
    - role `anon`, `authenticated`, `service_role` (role cuối có `bypassrls`);
    - schema `auth`: bảng `auth.users(id uuid primary key, email text)` và `auth.uid()` đọc `current_setting('request.jwt.claim.sub', true)::uuid`;
    - schema `storage`: bảng `storage.buckets(id text primary key, name text, public bool)` và `storage.objects(id uuid default gen_random_uuid(), bucket_id text, name text, owner uuid, created_at timestamptz default now())` có bật RLS.
  - Script `npm run db:test` chạy `reset` rồi mọi file `tests/db/*.sql` qua `psql -v ON_ERROR_STOP=1`. Mỗi file test dùng khối `DO` và `RAISE EXCEPTION` khi sai.

- [ ] **Step 1:** Chạy `npm i @supabase/supabase-js @supabase/ssr`.
- [ ] **Step 2:** Viết `supabase-stubs.sql`, `db-local.sh` và `smoke.sql` (kiểm tra `select auth.uid()` trả null khi chưa set claim). Chạy `npm run db:test`. Kết quả mong đợi: PASS. Ở bước này chưa có migration nào; script phải bỏ qua khi thư mục rỗng.
- [ ] **Step 3:** Viết ba client và `proxy.ts` theo tài liệu `@supabase/ssr` dành cho Next App Router (đọc `node_modules/@supabase/ssr` và `node_modules/next/dist/docs` để biết cách khai báo `proxy`).
- [ ] **Step 4:** Cập nhật `.env.example`: thêm chú thích cho `SUPABASE_SERVICE_ROLE_KEY` và `IP_HASH_SALT`, ghi rõ hai biến này chỉ dùng ở server.
- [ ] **Step 5:** Chạy `npm test`, `npm run lint`, `npm run build`. Chạy e2e: vẫn 25/25 ở chế độ demo.
- [ ] **Step 6:** Commit với message `feat: client Supabase, proxy và môi trường kiểm thử DB cục bộ`.

### Task 2: Migration schema, RLS, storage, seed

**Files:**
- Create:
  - `supabase/migrations/0001_schema.sql`
  - `supabase/seed_catalog.sql`
  - `supabase/seed_demo.sql`
  - `scripts/gen-seed.mts`
- Test: `tests/db/rls.sql`, `tests/db/schema.sql`, `tests/unit/seed-sync.test.ts`

**Interfaces:**
- Produces (bảng, đặt tên snake_case theo mục 6 của spec):
  - **Danh mục:** `prefectures`, `occupation_groups`, `occupations`, `skills`, `benefits` (id và các trường giống kiểu TS).
  - **`jobs`:**
    - mọi cột của kiểu `Job` ở dạng snake_case;
    - nội dung `*_ja`/`*_vi` cho 7 field trong `ContentField`;
    - `translation_status` có `check in ('none','unreviewed','approved')`, cùng `translation_source_hash text`;
    - `salary_needs_review bool default false`;
    - `is_demo bool default false`;
    - `search_text text` do trigger điền;
    - `created_at`, `updated_at`.
  - **Bảng nối:** `job_prefectures`, `job_occupations`, `job_skills`, `job_benefits(job_id, benefit_id, value bool)`.
  - **`interview_events`:** cột như kiểu `InterviewEvent`, `id` là identity.
  - **`applications`:** cột theo mục 6 của spec, thêm `cv_path`, `cv_mime`, `cv_size`, `consent_version`, `consent_at`, `delete_after date`; `idempotency_key unique`; `ref_code unique`.
  - **`application_notes`**.
  - **`admins(user_id uuid pk references auth.users on delete cascade)`**.
  - **`site_settings(id int primary key check (id = 1), data jsonb not null)`**.
- Hàm:
  - `norm_text(text) returns text immutable`;
  - `is_admin() returns bool security definer`, kiểm tra `exists(select 1 from admins where user_id = auth.uid())`, có `set search_path = public`;
  - trigger `jobs_search_text` chạy trên `jobs`, và trigger trên các bảng nối để cập nhật lại `search_text` của tin liên quan. Nội dung `search_text` gồm `code`, tiêu đề, `location_detail_ja`, tên và alias của tỉnh, nghề, kỹ năng;
  - trigger cập nhật `updated_at`.
- Index: GIN `pg_trgm` trên `search_text`; index cho `jobs(status, updated_at)`, `interview_events(job_id, starts_at)`, `applications(ip_hash, created_at)`.
- RLS (bật cho mọi bảng):
  - **anon và authenticated** chỉ được `select`:
    - các bảng danh mục;
    - `jobs` khi `status in ('published','closed')`;
    - các bảng nối và `interview_events` khi job tương ứng thỏa điều kiện trên;
    - `site_settings`.
  - **`is_admin()`** được mọi thao tác trên mọi bảng.
  - **`applications` và `application_notes`:** chỉ admin. Không có policy nào cho `anon`.
  - **Storage:** tạo bucket `cvs` với `public = false`. Policy trên `storage.objects` chỉ cho admin `select` và `delete` khi `bucket_id = 'cvs'`.
- `scripts/gen-seed.mts`:
  - chạy bằng `node --experimental-strip-types`;
  - import `lib/demo/catalog.ts` và `lib/demo/jobs.ts` (dùng đường dẫn tương đối; nếu alias `@/` cản trở thì chỉ đổi import trong hai file đó sang tương đối);
  - sinh ra `seed_catalog.sql` và `seed_demo.sql`. Tin demo có `is_demo = true`. Lịch phỏng vấn tính tương đối bằng `(date_trunc('day', now() at time zone 'Asia/Tokyo') + interval 'N days 10 hours') at time zone 'Asia/Tokyo'`.

- [ ] **Step 1: Test (`tests/db/rls.sql`)**, viết bằng `set role` cùng `set request.jwt.claim.sub`:
  - **anon:**
    - `select count(*) from applications` → 0, hoặc bị từ chối quyền;
    - `insert into applications` → bị từ chối;
    - `select from jobs where status = 'draft'` → 0;
    - `select from storage.objects where bucket_id = 'cvs'` → 0.
  - **authenticated nhưng không phải admin:** cho kết quả như `anon` đối với `applications` và storage.
  - **admin:** sau khi chèn vào `auth.users` và `admins`, đọc được `applications` và `storage.objects`.
  - **Mất quyền:** đặt claim `sub` về rỗng (mô phỏng đăng xuất) → không còn quyền như admin.
  - `select norm_text('  Kỹ   Sư ĐIỆN ') = 'ky su dien'` và `select norm_text('ﾊﾟｲﾌﾟ') = 'パイプ'`.
- [ ] **Step 2:** Chạy `npm run db:test`. Kết quả mong đợi: FAIL, vì chưa có bảng.
- [ ] **Step 3:** Viết migration và `gen-seed.mts`. Sinh hai file seed.
- [ ] **Step 4:** Chạy `npm run db:test`. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Viết `seed-sync.test.ts`: chạy lại generator vào bộ nhớ rồi so với nội dung file trong repo. Mục đích là phát hiện khi danh mục TS và seed SQL lệch nhau.
- [ ] **Step 6:** Commit với message `feat: migration schema, RLS, storage và seed`.

### Task 3: Hàm SQL tìm kiếm và đọc dữ liệu công khai; test so khớp với nguồn demo

**Files:**
- Create: `supabase/migrations/0002_public_api.sql`, `tests/db/parity.test.ts`
- Modify: `vitest.config.ts`. File `parity.test.ts` chỉ chạy khi có biến `DB_TEST=1`; script `db:test` đặt biến này.

**Interfaces:**
- Produces (SQL `stable`, `security invoker`, dùng được với RLS):
  - `search_jobs(p jsonb) returns jsonb`:
    - nhận các key `q`, `prefectures` (mã JIS), `groups`, `occupations` (slug), `salaryMinMan`, `salaryMaxMan`, `period`, `jpLevel`, `maxExperience`, `benefits` (slug), `hasInterview`, `sort`, `page`, `now`;
    - trả về `{ items: [JobSummary JSON camelCase], total, page, pageSize: 12, pageCount }`;
    - quy tắc giống hệt `lib/data/demo.ts`: tin đang tuyển, hoán đổi giao khoảng lương, `jpLevel` hoặc kinh nghiệm null thì vẫn đạt, tin có mã khớp chính xác lên đầu, sắp xếp phụ theo `code`.
  - `get_job(p_code text) returns jsonb`: trả tin cùng `interviews` (lịch sắp tới và đã sắp xếp). Tin `closed` vẫn trả về; `draft` trả null.
  - `related_jobs(p_job_id bigint, p_limit int) returns jsonb`.
  - `upcoming_interviews(p jsonb) returns jsonb`.
  - `open_job_counts_by_group() returns jsonb`.
- Kết quả JSON có đúng hình dạng của `Job`, `JobSummary`, `InterviewEvent`. Lớp TS chỉ đổi kiểu, không biến đổi dữ liệu.

- [ ] **Step 1: Test `parity.test.ts`**
  - Seed DB bằng `seed_demo.sql` với `now` cố định, truyền qua `p.now`. Xem thêm Task 2: dùng chung một mốc `now` để sinh seed.
  - Với mỗi tổ hợp bộ lọc bên dưới, gọi `search_jobs` qua `psql -At -c` và `JSON.parse` kết quả, rồi so `items.map(code)` và `total` với `demo.searchJobs` (cùng `now`):
    1. rỗng;
    2. `q:'#00412'`;
    3. `q:'Tokyo'`;
    4. `q:'ky su dien'`;
    5. `prefectures:['13','27']` + `groups:['dien']`;
    6. `salaryMinMan:30, period:'month'`;
    7. `salaryMinMan:400, period:'year'`;
    8. `jpLevel:'N3'`;
    9. `benefits:['ky-tuc-xa']`;
    10. `hasInterview:true, sort:'pv'`;
    11. `sort:'luong'`;
    12. `page:2`.
  - So khớp tương tự cho `upcoming_interviews` (không tham số, và có `occupations:['plc-mach-dien']`) và cho `open_job_counts_by_group`.
  - So `normText(x) === norm_text(x)` với 20 chuỗi mẫu gồm tiếng Việt, kana full-width/half-width, chữ số full-width, `#` và khoảng trắng thừa.
- [ ] **Step 2:** Chạy `DB_TEST=1 npx vitest run tests/db/parity.test.ts`. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Viết migration `0002`.
- [ ] **Step 4:** Chạy lại. Kết quả mong đợi: PASS. Sau đó chạy `npm run db:test`, `tests/db/rls.sql` vẫn PASS. Thêm vào `rls.sql`: anon gọi `search_jobs` không thấy tin `draft`, và `get_job` của tin `draft` trả null.
- [ ] **Step 5:** Commit với message `feat: hàm SQL tìm kiếm công khai và test so khớp với demo`.

### Task 4: Nguồn dữ liệu Supabase trong `lib/data`

**Files:**
- Create: `lib/data/supabase.ts`
- Modify: `lib/data/index.ts`, `app/viec-lam/[slug]/page.tsx` (thêm `revalidate`)
- Test: `tests/unit/data-index.test.ts`

**Interfaces:**
- Consumes: các RPC của Task 3 qua `createServerSupabase()`.
- Produces:
  - `lib/data/index.ts` export cùng các hàm như Giai đoạn 1. Mỗi hàm gọi `isDemoMode() ? demo.x(...) : sb.x(...)`.
  - `getCatalog()` đọc 5 bảng danh mục.
  - `getSiteSettings()` đọc `site_settings.data` rồi gộp với `siteDefaults` (field nào thiếu thì lấy mặc định).
  - Lỗi từ Supabase được ném thành `Error("Không tải được dữ liệu")`, để `error.tsx` hiển thị nút "Thử lại". Không ẩn lỗi.
  - `app/viec-lam/[slug]/page.tsx` có `export const revalidate = 300` (theo spec).

- [ ] **Step 1: Test** `data-index.test.ts`:
  - Khi không có env: `isDemoMode() === true` và `searchJobs` trả dữ liệu demo.
  - Khi có env: mock module `@/lib/data/supabase` bằng `vi.mock` và kiểm tra `searchJobs` gọi `sb.searchJobs`.
  - Khi `sb.getSiteSettings` trả thiếu field thì kết quả được gộp với `siteDefaults`.
- [ ] **Step 2:** Chạy test (FAIL), viết code, chạy lại (PASS).
- [ ] **Step 3:** Kiểm tra thủ công với DB cục bộ:
  - Không có PostgREST cục bộ, nên bước này dùng mock.
  - Ghi rõ trong report rằng kết nối thật sẽ được kiểm ở Giai đoạn 3, sau khi có dự án Supabase.
- [ ] **Step 4:** Chạy e2e ở chế độ demo: 25/25.
- [ ] **Step 5:** Commit với message `feat: nguồn dữ liệu Supabase cho lib/data`.

### Task 5: Luồng lưu hồ sơ thật (`start` → upload → `complete`)

**Files:**
- Create:
  - `lib/applications/server.ts`
  - `app/api/applications/complete/route.ts`
  - `supabase/migrations/0003_applications_api.sql`
- Modify: `app/api/applications/start/route.ts`, `components/ApplicationForm.tsx`, `lib/validate.ts`
- Test: `tests/unit/applications-server.test.ts`, `tests/db/applications.sql`

**Interfaces:**
- Produces:
  - `lib/validate.ts`:
    - thêm `consentVersion: string` (bắt buộc, tối đa 50 ký tự) vào `ApplicationInput`;
    - email tối đa 254 ký tự, tên tệp tối đa 200 ký tự;
    - metadata `file` do client gửi chỉ dùng để kiểm tra trước; chốt chặn thật là bước `complete` (đọc kích thước thật và magic bytes).
  - SQL `start_application(p jsonb) returns jsonb`, `security definer`, chỉ `service_role` được `execute`:
    - trong cùng một transaction: kiểm tra giới hạn theo `ip_hash` (tối đa 5 trong 10 phút, quá thì trả `{error:'rate_limited'}`);
    - `insert ... on conflict (idempotency_key) do nothing`, rồi trả về dòng hiện có;
    - sinh `ref_code` (thử lại khi trùng);
    - `delete_after = current_date + (retentionMonths || ' months')::interval`, lấy từ `site_settings`;
    - `status` là `pending_upload` khi có CV, ngược lại là `new`;
    - `job_id` được tra từ `jobCode`; tin phải đang tuyển, nếu không thì trả `{error:'job_closed'}`.
  - `lib/applications/server.ts` (dùng `createAdminSupabase()`):
    - `startApplication(input, ip): Promise<{ refCode, id, upload?: { path, token, signedUrl } } | { error }>`:
      - đường dẫn CV là `cvs/<yyyy>/<mm>/<application id>/<uuid>.<ext>`;
      - tạo signed upload URL bằng `storage.from('cvs').createSignedUploadUrl(path)`.
    - `completeApplication(id, idempotencyKey)`:
      - đọc metadata object; kích thước phải từ 1 byte đến `MAX_CV_BYTES`;
      - tải các byte đầu (`download`, lấy 8 KB đầu) và chạy `sniffFileKind`. Kết quả phải khớp đuôi tệp: `pdf→'pdf'`, `doc/xls→'ole'`, `docx/xlsx→'zip'`; với `zip` cần thêm chuỗi `[Content_Types].xml` trong 8 KB đầu;
      - hợp lệ → `status='new'`, trả `{ refCode }`;
      - không hợp lệ → xóa object và trả `{ error:'invalid_file' }`;
      - gọi lại cho hồ sơ đã ở trạng thái `new` → trả lại đúng `refCode` cũ (idempotent).
  - **Route `start`:**
    - kiểm tra `content-length` trước khi parse: JSON tối đa 64 KB. Multipart không còn được dùng nữa vì CV đi thẳng lên Storage. Request multipart quá 64 KB → trả 413;
    - form gửi JSON gồm các trường cùng `file: {name, size, type}` để server kiểm tra trước. Ở bước `complete`, server kiểm tra kích thước thật và magic bytes;
  - **Route `complete`:** `POST {id, idempotencyKey}` → `200 {ok:true, refCode}` hoặc lỗi 4xx.
  - **Mã lỗi và thông báo tiếng Việt:**

    | Lỗi | HTTP | Thông báo |
    |---|---|---|
    | `rate_limited` | 429 | "Bạn đã gửi quá nhiều hồ sơ, vui lòng thử lại sau 10 phút." |
    | `job_closed` | 409 | "Tin này đã ngừng tuyển." |
    | `invalid_file` | 422 | "Tệp CV không hợp lệ hoặc bị lỗi, vui lòng chọn lại tệp PDF/DOC/DOCX/XLS/XLSX." |
    | lỗi khác | 500 | "Lỗi máy chủ, vui lòng thử lại." |

  - **`ApplicationForm`:**
    - gửi JSON tới `start`;
    - nếu nhận `upload`, tải CV bằng `XMLHttpRequest` `PUT` lên `signedUrl` (header `x-upsert: false`, `content-type` là MIME của tệp) và hiển thị % qua `<progress>` kèm chữ;
    - sau đó gọi `complete`;
    - chỉ `isSuccess` mới hiển thị thành công;
    - lỗi ở bất kỳ bước nào: giữ nguyên dữ liệu đã nhập và cho thử lại với cùng `idempotencyKey`. `start` trả lại upload URL mới cho hồ sơ đang `pending_upload`.
  - **Chế độ demo:** giữ nguyên `503` như Giai đoạn 1.

- [ ] **Step 1: Test.**
  - `tests/db/applications.sql`:
    - gọi `start_application` hai lần với cùng key → 1 dòng, cùng `ref_code`;
    - lần thứ 6 từ cùng `ip_hash` trong 10 phút → `rate_limited`;
    - tin đã đóng → `job_closed`;
    - `anon` không được `execute`.
  - `tests/unit/applications-server.test.ts`, mock `createAdminSupabase`:
    - `complete` với byte đầu `MZ` → `invalid_file` và có gọi `remove`;
    - kích thước 15 MB → `invalid_file`;
    - không có object → `invalid_file`;
    - PDF hợp lệ → `refCode`;
    - gọi `complete` lần hai → cùng `refCode`.
  - Route: JSON quá 64 KB → 413; JSON hỏng → 400.
- [ ] **Step 2:** Chạy test (FAIL), viết code, chạy lại (PASS).
- [ ] **Step 3:** Chạy e2e ở chế độ demo: 25/25. Form vẫn hiện thông báo 503 và chỉ gửi 1 request.
- [ ] **Step 4:** Commit với message `feat: lưu hồ sơ và CV riêng tư`.

### Task 6: Đăng nhập quản trị, `requireAdmin`, khung `/admin`

**Files:**
- Create:
  - `lib/auth.ts`
  - `app/admin/login/page.tsx`, `app/admin/login/actions.ts`
  - `app/admin/(protected)/layout.tsx`, `app/admin/(protected)/page.tsx`
  - `app/admin/logout/route.ts`
- Test: `tests/unit/auth.test.ts`, `tests/e2e/admin.spec.ts`

**Interfaces:**
- Produces:
  - `requireAdmin(): Promise<{ userId: string; email: string }>`:
    - chưa có phiên → `redirect('/admin/login?next=…')`;
    - có phiên nhưng không có trong bảng `admins` → `forbidden()` (nếu Next 16 có) hoặc trả trang 403;
    - mọi page, layout và server action của admin đều gọi hàm này.
  - Ở chế độ demo: `/admin` hiện thông báo "Chưa kết nối Supabase — xem README để thiết lập", trả HTTP 200, không có form đăng nhập.
  - Login: form email và mật khẩu gọi server action `signInWithPassword`. Thông báo lỗi chung: "Email hoặc mật khẩu không đúng." Tham số `next` chỉ chấp nhận đường dẫn bắt đầu bằng `/admin` (chống open redirect).
  - Logout: `POST /admin/logout` → `signOut()` rồi redirect `/admin/login`.
  - **Tổng quan** (dữ liệu thật):
    - số tin theo từng trạng thái;
    - số hồ sơ `new` trong 7 ngày gần nhất;
    - 5 lịch phỏng vấn sắp tới;
    - các tin có `salary_needs_review`.
  - Layout admin có nav: Tổng quan, Tin tuyển dụng, Hồ sơ, Danh mục, Nhập CSV, Nội dung & liên hệ, Đăng xuất. Trang admin có `robots: noindex, nofollow`.

- [ ] **Step 1: Test.**
  - `auth.test.ts`, mock Supabase client và `next/navigation`: không phiên → redirect; không phải admin → forbidden; admin → trả user; `safeNext('//evil.com')` → `/admin`; `safeNext('/admin/ho-so')` → giữ nguyên.
  - `admin.spec.ts` (chế độ demo): `/admin` hiện thông báo chưa kết nối; `/admin/login` không lỗi.
- [ ] **Step 2:** Chạy test (FAIL), viết code, chạy lại (PASS). Chạy e2e: toàn bộ PASS.
- [ ] **Step 3:** Commit với message `feat: đăng nhập quản trị và khung /admin`.

### Task 7: Quản lý tin tuyển dụng và lịch phỏng vấn

**Files:**
- Create:
  - `app/admin/(protected)/tin/page.tsx`
  - `app/admin/(protected)/tin/[id]/page.tsx` (trang sửa; `id = 'moi'` là tạo mới)
  - `app/admin/(protected)/tin/actions.ts`
  - `components/admin/JobForm.tsx`, `components/admin/InterviewEditor.tsx`
  - `lib/admin/job-input.ts`
- Test: `tests/unit/job-input.test.ts`

**Interfaces:**
- Produces:
  - `parseJobForm(fd: FormData, catalog): { job: JobRow; prefectureIds; occupationIds; skillIds; benefits: Record<slug, boolean|null> } | { errors }`, đặt trong `lib/admin/job-input.ts`, dùng chung với CSV ở Task 10:
    - `code` theo regex;
    - `slug` tự sinh từ `titleVi` bằng `normText`, thay khoảng trắng bằng `-`, chỉ giữ `[a-z0-9-]`; người dùng sửa được;
    - lương nhập theo 万円, có ô riêng cho tháng và năm;
    - kiểm tra min ≤ max; `salary_needs_review` tự bật theo quy tắc ở mục 6 của spec;
    - quyền lợi chọn 3 trạng thái (Có / Không / Chưa xác nhận).
  - Actions `saveJob`, `setJobStatus(id, 'published'|'closed'|'draft')`, `saveInterview`, `cancelInterview`, `deleteInterview`. Mỗi action gọi `requireAdmin()`, sau đó `revalidatePath('/viec-lam')`, `revalidatePath(jobHref)` và `/lich-phong-van`.
  - Lưu tin: ghi bảng `jobs` rồi thay toàn bộ các bảng nối, trong RPC `admin_save_job(p jsonb)` (`security invoker`, RLS kiểm tra quyền admin) để thao tác là nguyên tử.
  - Xem trước: link `/admin/tin/[id]?xem=truoc` render `JobDetailFull` với dữ liệu nháp (đọc qua client admin), không công khai.
  - Bản dịch: các cặp ô `*_ja`/`*_vi` cùng select `translation_status`. Khi `*_ja` thay đổi so với `translation_source_hash` thì hiện cảnh báo "Bản gốc đã đổi — kiểm tra lại bản dịch".
  - Lịch phỏng vấn: nhập ngày và giờ JST, cùng hình thức và ghi chú công khai. Server dùng `jstToIso`.
  - Danh sách tin: lọc theo trạng thái, tìm theo mã hoặc tiêu đề, phân trang 20 tin mỗi trang.

- [ ] **Step 1: Test** `job-input.test.ts`:
  - mã `00412` giữ nguyên;
  - mã có dấu `-` → lỗi;
  - lương năm `350` (万) → `annualMinYen` bằng `3500000`;
  - min > max → lỗi;
  - lương tháng 30万 với thu nhập năm tối đa 300万 → `salaryNeedsReview` true;
  - slug của "Kỹ sư điện (Tokyo)" là `ky-su-dien-tokyo`;
  - quyền lợi gửi `'unknown'` → không ghi vào map (nghĩa là chưa xác nhận).
- [ ] **Step 2:** Chạy test (FAIL), viết code, chạy lại (PASS).
- [ ] **Step 3:** Commit với message `feat: quản lý tin và lịch phỏng vấn`.

### Task 8: Danh mục, nội dung và liên hệ, dọn tin demo

**Files:**
- Create:
  - `app/admin/(protected)/danh-muc/page.tsx`, `app/admin/(protected)/danh-muc/actions.ts`
  - `app/admin/(protected)/noi-dung/page.tsx`, `app/admin/(protected)/noi-dung/actions.ts`
- Test: `tests/unit/settings-input.test.ts`

**Interfaces:**
- **Danh mục:**
  - CRUD cho nghề, nhóm nghề, kỹ năng, quyền lợi;
  - tỉnh chỉ cho sửa `nameVi` và `aliases` (alias phân tách bằng dấu phẩy);
  - không cho xóa mục đang được tin sử dụng; báo "Đang được N tin sử dụng".
- **Nội dung:**
  - `parseSettings(fd): SiteSettings | { errors }`:
    - email phải hợp lệ hoặc là placeholder;
    - URL Facebook và Zalo phải là `https://` hoặc placeholder;
    - `retentionMonths` là số nguyên từ 1 đến 60;
    - `consentVersion` khác rỗng;
    - `policiesConfirmed` là checkbox.
  - Lưu bằng `upsert` vào `site_settings` với `id = 1`, sau đó `revalidatePath('/', 'layout')`.
- **Dọn demo:** nút "Xóa toàn bộ tin demo" xóa mọi tin có `is_demo = true`, có hộp xác nhận nhập chữ `XOA`.

- [ ] **Step 1: Test** `parseSettings`:
  - `retentionMonths` bằng 0, 61 hoặc `abc` → lỗi;
  - Facebook dạng `http://` → lỗi;
  - Facebook dạng `javascript:x` → lỗi;
  - placeholder `[EMAIL]` → hợp lệ.
- [ ] **Step 2:** Chạy test (FAIL), viết code, chạy lại (PASS).
- [ ] **Step 3:** Commit với message `feat: quản lý danh mục và nội dung`.

### Task 9: Quản lý hồ sơ

**Files:**
- Create:
  - `app/admin/(protected)/ho-so/page.tsx`, `app/admin/(protected)/ho-so/[id]/page.tsx`, `app/admin/(protected)/ho-so/actions.ts`
  - `app/admin/(protected)/ho-so/[id]/cv/route.ts`
- Test: `tests/unit/application-status.test.ts`

**Interfaces:**
- **Danh sách:**
  - lọc theo trạng thái và theo tin; 20 hồ sơ mỗi trang;
  - mặc định ẩn `pending_upload` cũ hơn 24 giờ;
  - hiển thị mã `HS-…`, họ tên, kênh liên hệ, tin, thời điểm nhận (giờ JST), trạng thái.
- **Chi tiết:**
  - đủ thông tin liên hệ, ghi chú của ứng viên, bản đồng ý (phiên bản và thời điểm);
  - đổi trạng thái bằng select 7 giá trị với nhãn tiếng Việt;
  - ghi chú nội bộ: thêm mới, hiển thị kèm tác giả và thời điểm.
- **Tải CV:** `GET /admin/ho-so/[id]/cv`:
  - gọi `requireAdmin()`;
  - tạo signed URL hạn 60 giây bằng `createAdminSupabase`, rồi trả redirect 302 tới URL đó;
  - đặt header `Cache-Control: no-store`.
- **Xóa:**
  - "Xóa hồ sơ" xóa CV trước rồi xóa dòng; có xác nhận;
  - "Dọn hồ sơ quá hạn lưu" xóa các hồ sơ có `delete_after < current_date` và hồ sơ `pending_upload` cũ hơn 24 giờ, kèm CV; báo lại số lượng đã xóa.
- `STATUS_LABELS` và `isValidStatus(s)` đặt trong `lib/applications/status.ts`.

- [ ] **Step 1: Test:** `isValidStatus('hired')` là true; `isValidStatus('x')` là false; nhãn đúng 7 giá trị như Global Constraints.
- [ ] **Step 2:** Chạy test (FAIL), viết code, chạy lại (PASS). Thêm vào `tests/db/rls.sql`: người đăng nhập không phải admin `update applications` → 0 dòng bị ảnh hưởng.
- [ ] **Step 3:** Commit với message `feat: quản lý hồ sơ và tải CV có kiểm soát`.

### Task 10: Nhập tin bằng CSV

**Files:**
- Create:
  - `lib/csv.ts`
  - `lib/admin/csv-import.ts`
  - `public/mau-nhap-tin.csv`
  - `app/admin/(protected)/nhap-csv/page.tsx`, `app/admin/(protected)/nhap-csv/actions.ts`
  - `supabase/migrations/0004_import.sql`
- Test: `tests/unit/csv.test.ts`, `tests/unit/csv-import.test.ts`

**Interfaces:**
- `parseCsv(text: string): string[][]`:
  - theo RFC 4180: hỗ trợ dấu ngoặc kép, `""` bên trong ô, xuống dòng nằm trong ô;
  - bỏ BOM, chấp nhận CRLF và LF;
  - bỏ qua dòng trống ở cuối tệp.
- `mapColumns(header: string[]): Record<column, number | null>`: khớp tên cột của file mẫu không phân biệt hoa thường và khoảng trắng. Danh sách cột theo mục 9 (bước 8) của spec.
- `validateRows(rows, mapping, catalog, existingCodes): { rows: Array<{ line: number; action: 'create'|'update'; data } >; errors: Array<{ line: number; column: string; message: string }>; warnings }`:
  - dùng chung `parseJobForm` (hoặc phần lõi của nó) với Task 7;
  - tỉnh và nghề khớp theo `normText` của tên và alias, phân tách bằng `|`;
  - lương chấp nhận `350`, `350万`, `350 万円`;
  - ngày giờ phỏng vấn chấp nhận `YYYY-MM-DD HH:mm` và `YYYY/MM/DD HH:mm`, theo giờ JST;
  - mã trùng nhau trong cùng tệp → lỗi ở cả hai dòng;
  - mã chỉ gồm chữ số nhưng ngắn hơn mã đã có cùng giá trị số (ví dụ `412` so với `00412`) → cảnh báo "Có thể Excel đã bỏ số 0 ở đầu";
  - số dòng báo lỗi đánh từ 2 (dòng 1 là header).
- RPC `import_jobs(p jsonb)` (`security invoker`, chỉ admin): upsert theo `code` trong một transaction; thay thế các bảng nối; lịch phỏng vấn chỉ thêm mới, bỏ qua lịch trùng `starts_at`.
- **Giao diện:**
  1. Tải file mẫu.
  2. Chọn tệp (tối đa 2 MB).
  3. Ánh xạ cột: dropdown cho từng cột, giá trị đề xuất sẵn.
  4. Xem trước: bảng gồm dòng, hành động (tạo/cập nhật), mã, tiêu đề, lỗi và cảnh báo.
  5. Nút "Nhập N tin" chỉ bật khi không còn lỗi.
  6. Hiện kết quả sau khi nhập.

  Giữa các bước, dữ liệu CSV nằm trong state ở client và được gửi lại cho server action để kiểm tra lần nữa ở bước nhập. Server không tin kết quả xem trước.

- [ ] **Step 1: Test.**
  - `csv.test.ts`: BOM, CRLF, ô có dấu phẩy và ngoặc kép, xuống dòng trong ô, dòng trống ở cuối.
  - `csv-import.test.ts`:
    - file mẫu trong `public/` phải parse và validate không lỗi (header cùng một dòng ví dụ);
    - Review Focus #4: `東京` khớp tỉnh 13; `350万` → `3500000`; `2026/11/20 10:00` → ISO đúng giờ JST; tỉnh không tồn tại → lỗi ở đúng dòng và đúng cột; mã trùng → lỗi; `412` khi đã có `00412` → cảnh báo.
- [ ] **Step 2:** Chạy test (FAIL), viết code, chạy lại (PASS). Thêm vào `tests/db/`: `import_jobs` với dữ liệu sai ở một dòng (ví dụ tỉnh không tồn tại) → toàn bộ bị rollback.
- [ ] **Step 3:** Commit với message `feat: nhập tin bằng CSV`.

### Task 11: README, hướng dẫn thiết lập, kiểm tra cuối

**Files:**
- Create: `README.md`, `docs/huong-dan-trien-khai.md`
- Modify: `.env.example`

**Nội dung:**
- **README (tiếng Việt):**
  - chạy local ở chế độ demo;
  - biến môi trường;
  - `npm test`, `npm run db:test`, `npm run e2e`.
- **Hướng dẫn triển khai:**
  1. Tạo dự án Supabase.
  2. Bật extension `pg_trgm` và `unaccent`.
  3. Chạy các migration theo thứ tự trong SQL Editor (hoặc `supabase db push`).
  4. Chạy `seed_catalog.sql`. `seed_demo.sql` là tùy chọn.
  5. Auth: tắt "Allow new users to sign up".
  6. Tạo user quản trị trong Dashboard, rồi chạy `insert into admins(user_id) select id from auth.users where email='…'`.
  7. Kiểm tra bucket `cvs` để ở chế độ private.
  8. Trên Vercel, đặt các biến môi trường: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `IP_HASH_SALT`.
  9. Kiểm tra sau khi triển khai: gửi thử một hồ sơ, đăng nhập admin, tải CV, đăng xuất.
- **Hai mục trong README:** "Đã kiểm thử" và "Giới hạn còn lại", trong đó ghi rõ những gì chưa kiểm được khi chưa có dự án Supabase thật.

- [ ] **Step 1:** Viết tài liệu. Chạy `npm test`, `npm run db:test`, `npm run lint`, `npm run build`, `npx playwright test --trace off`. Kết quả mong đợi: tất cả PASS.
- [ ] **Step 2:** Commit với message `docs: README và hướng dẫn triển khai`.
