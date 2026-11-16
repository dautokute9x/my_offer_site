# Giai đoạn 1 — Giao diện công khai với dữ liệu demo: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Website công khai chạy hoàn toàn trên dữ liệu demo:

- tìm kiếm, bộ lọc đồng bộ URL, danh sách, chi tiết, lịch phỏng vấn;
- các trang nội dung;
- form ứng tuyển/tư vấn. Ở chế độ demo, form báo rõ là chưa lưu.

**Architecture:**

- Một app Next.js App Router. Mọi trang đọc dữ liệu qua `lib/data/index.ts`; giai đoạn này chỉ có nguồn demo (`lib/data/demo.ts`). Giai đoạn 2 thêm `lib/data/supabase.ts` với cùng interface.
- Logic thuần (chuẩn hóa, lương, giờ, bộ lọc, validate) nằm trong `lib/` và có test vitest.
- Các luồng người dùng được kiểm bằng Playwright, chạy trên `next build && next start`.

**Tech Stack:** Next.js 16.4 (App Router, `params`/`searchParams` là Promise), React 19, TypeScript, Tailwind CSS 4, vitest, @playwright/test 1.63.0. Chọn đúng 1.63.0 để khớp trình duyệt cài sẵn tại `/opt/pw-browsers`.

**Spec:** `docs/superpowers/specs/2026-11-16-tuyen-dung-ky-su-design.md`

## Global Constraints

- **Ngôn ngữ:** giao diện tiếng Việt; `<html lang="vi">`; đoạn tiếng Nhật bọc `lang="ja"`.
- **Màu:**
  - navy `#0F2747`, xanh chính `#176AC0`, nền `#F5F7FB`, vùng nội dung trắng;
  - xanh lá cho trạng thái đang tuyển, cam cho lịch phỏng vấn;
  - chữ và nền phải đạt WCAG AA (≥4.5:1 cho chữ thường).
- **Font:** `next/font/google` với `Be_Vietnam_Pro` (400/600/700, subset `vietnamese`) và `Noto_Sans_JP` (400/700). Fallback: `system-ui, "Hiragino Sans", "Yu Gothic", sans-serif`. Nội dung 16px, line-height 1.6.
- **Kích thước và bàn phím:**
  - không tràn ngang ở 360/390/768/1024/1440px;
  - nút chính trên mobile tối thiểu 44px (`min-h-11`);
  - focus hiển thị rõ: `focus-visible:outline-2 outline-offset-2 outline-[#176AC0]`.
- **Thư viện:** không thêm dependency ngoài `next`, `react`, `react-dom`, Tailwind, `vitest`, `@playwright/test`. Không dùng thư viện UI, zod, markdown hay CSV.
- **Dữ liệu demo:**
  - mọi tin demo có `isDemo: true` và hiển thị nhãn "Dữ liệu minh họa";
  - banner toàn site: "Website đang chạy dữ liệu minh họa";
  - trang của tin demo có `robots: noindex`.
- **Không bịa:** không số điện thoại, đối tác, chứng nhận, đánh giá hay số liệu giả. Liên hệ lấy từ `lib/site-defaults.ts` dưới dạng placeholder `[SỐ LIÊN HỆ]`…, và link chỉ hiện khi giá trị không phải placeholder.
- **Giá trị thiếu:** hiển thị đúng chuỗi `Chưa xác nhận`.
- **Danh sách:** 12 tin mỗi trang.
- **Thời gian:** lưu ISO UTC; hiển thị theo `Asia/Tokyo` và kèm nhãn `giờ Nhật (JST, UTC+9)`; giờ VN theo `Asia/Ho_Chi_Minh` kèm nhãn `giờ Việt Nam (UTC+7)`.
- **Form:** chỉ hiện thông báo thành công khi server trả `{ ok: true, refCode }`. Ở chế độ demo, server trả 503 với thông điệp "Website đang ở chế độ minh họa — hồ sơ CHƯA được gửi."
- **Tham số URL của `/viec-lam`:** `q`, `tinh` (mã JIS, phân tách dấu phẩy), `nhom` (slug nhóm nghề), `nghe` (slug nghề), `luong` (`min-max`, đơn vị 万円, có thể bỏ trống một đầu), `ky` (`thang`|`nam`, mặc định `thang`), `tiengnhat` (`N1`…`N5`|`none`), `kn` (số năm), `ql` (slug quyền lợi), `pv=1`, `sx` (`moi`|`pv`|`luong`), `trang`.
  - Tham số `luong` dùng 万円 cho cả tháng lẫn năm. Đây là quyết định của người lập trình để URL ngắn và quen với cách người Nhật ghi lương.

## Review Focus

1. **Gõ mã tin có `#`, khoảng trắng thừa, chữ số full-width (`＃００４１２`) hoặc thiếu số 0 ở đầu (`412`).** Ba dạng đầu phải tìm ra đúng tin `00412`. Dạng thiếu số 0 không được khớp chính xác với mã `00412`. Test thuộc Task 2 và Task 4.
2. **URL có tham số rác** (`trang=-3`, `trang=abc`, `tinh=99`, `tiengnhat=N9`, `luong=abc`). Trang không lỗi; tham số không hợp lệ bị bỏ qua; `trang` vượt quá số trang thì hiện trạng thái rỗng kèm link về trang 1. Test thuộc Task 4.
3. **Lịch phỏng vấn sát nửa đêm.** 23:30 JST là 21:30 cùng ngày giờ VN; 01:00 JST là 23:00 *ngày hôm trước* giờ VN, nên ngày hiển thị phải khác nhau. Test thuộc Task 3.
4. **Tin chỉ có một đầu lương, hoặc chỉ có lương năm, khi lọc theo kỳ tháng.** Kết quả phải theo đúng quy tắc giao khoảng trong spec. Test thuộc Task 4.
5. **Bấm "Gửi" hai lần nhanh hoặc nhấn Enter liên tục.** Chỉ được có đúng một request. Test thuộc Task 10.

---

### Task 1: Khung dự án, theme, layout chung

**Files:**
- Create (scaffold): `package.json`, `next.config.ts`, `tsconfig.json`, `app/globals.css`, `app/layout.tsx`, `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.example`
- Create: `lib/site-defaults.ts`, `components/SiteHeader.tsx`, `components/SiteFooter.tsx`, `components/DemoBanner.tsx`, `app/not-found.tsx`
- Test: `tests/unit/site-defaults.test.ts`

**Interfaces:**
- Produces:
  - `siteDefaults: SiteSettings`
  - `isPlaceholder(v: string): boolean` (true khi chuỗi có dạng `[...]`)
  - Kiểu `SiteSettings`:
    ```
    {
      brandName, domain, email, phone, zalo, facebookUrl, zaloGroupUrl,
      aboutText, consentVersion, retentionMonths: 12, policiesConfirmed: false
    }
    ```
  - CSS tokens Tailwind 4 trong `@theme`: `--color-navy`, `--color-brand`, `--color-bg`, `--color-ok`, `--color-warn`.

- [ ] **Step 1:** Chạy `npx create-next-app@16.4.6 . --ts --tailwind --app --eslint --no-src-dir --import-alias "@/*" --use-npm --yes`. Sau đó `npm i -D vitest @playwright/test@1.63.0`. Thêm các script `"test": "vitest run"` và `"e2e": "playwright test"`.
- [ ] **Step 2:** Viết test `isPlaceholder('[EMAIL]') === true`, `isPlaceholder('a@b.vn') === false`. Thêm test: `siteDefaults.retentionMonths === 12`.
- [ ] **Step 3:** Cài đặt `lib/site-defaults.ts`. Layout gồm:
  - header: logo dạng chữ `brandName`; nav gồm Việc làm, Lịch phỏng vấn, Giới thiệu, Liên hệ; nút "Nhận tư vấn" dẫn tới `/lien-he#tu-van`;
  - menu mobile dùng `<details>`;
  - footer: liên hệ (ẩn mục placeholder), link chính sách và điều khoản;
  - `DemoBanner` hiện khi `isDemoMode()`. Ở task này hàm đó tạm trả `!process.env.NEXT_PUBLIC_SUPABASE_URL`; Task 4 chuyển nó sang `lib/data`.
- [ ] **Step 4:** `npm test` PASS; `npm run build` thành công.
- [ ] **Step 5:** Commit `chore: khởi tạo Next.js, theme và layout chung`.

### Task 2: Kiểu dữ liệu, danh mục, chuẩn hóa chuỗi

**Files:**
- Create: `lib/types.ts`, `lib/normalize.ts`, `lib/demo/catalog.ts`
- Test: `tests/unit/normalize.test.ts`, `tests/unit/catalog.test.ts`

**Interfaces:**
- Produces (`lib/types.ts`):
  - `type Tri = boolean | null`
  - `type JpLevel = 'N1'|'N2'|'N3'|'N4'|'N5'|'none'`
  - `Prefecture { id; code /* '13' */; nameJa; nameVi; romaji; region; aliases: string[] }`
  - `OccupationGroup { id; slug; nameVi; nameJa; sort }`
  - `Occupation { id; groupId; slug; nameVi; nameJa; aliases: string[] }`
  - `Skill { id; name; aliases: string[] }`
  - `Benefit { id; slug; nameVi; nameJa; featured: boolean; sort }`
  - `InterviewEvent { id; jobId; startsAt: string; endsAt: string|null; format: 'online'|'onsite'|'unknown'; publicNote: string|null; status: 'scheduled'|'cancelled' }`
  - `Job`:
    - Định danh và trạng thái: `id`, `code`, `slug`, `status: 'draft'|'published'|'closed'`, `isDemo`, `publishedAt`, `updatedAt`, `validThrough: string|null`.
    - Tiêu đề, địa điểm: `titleVi`, `titleJa`, `employerName: string|null`, `locationDetailJa`.
    - Liên kết danh mục: `prefectureIds`, `occupationIds`, `skillIds`, `benefits: Record<string /*slug*/, boolean>`.
    - Lương: `monthlyMinYen`, `monthlyMaxYen`, `annualMinYen`, `annualMaxYen` (đều `number|null`); `salaryNegotiable: Tri`; `salarySourceText: string|null`.
    - Yêu cầu: `jpLevel: JpLevel|null`, `jpNote`, `experienceYearsMin: number|null`, `experienceNote`, `driverLicenseRequired: Tri`, `companyCarProvided: Tri`.
    - Nội dung: `content: Record<ContentField, { ja: string|null; vi: string|null }>`, với `ContentField = 'summary'|'description'|'requirements'|'workingHours'|'holidays'|'overtime'|'benefitsNote'`.
    - Bản dịch: `translationStatus: 'none'|'unreviewed'|'approved'`.
  - `Catalog { prefectures; groups; occupations; skills; benefits }`
- Produces (`lib/normalize.ts`):
  - `normText(s: string): string`: NFKC → lowercase → NFD, bỏ dấu kết hợp, `đ→d` → gộp khoảng trắng → trim.
  - `normCode(s: string): string`: `normText`, bỏ `#` ở đầu, bỏ mọi khoảng trắng.
- Produces (`lib/demo/catalog.ts`): `demoCatalog: Catalog`
  - đủ 47 tỉnh, mã JIS `'01'`…`'47'`, 8 vùng;
  - 5 nhóm nghề theo spec, mỗi nhóm 3–6 nghề;
  - khoảng 12 kỹ năng;
  - 8 quyền lợi theo spec. Slug: `ky-tuc-xa`, `ho-tro-nha-o`, `ho-tro-chuyen-nha`, `dua-gia-dinh`, `ho-tro-chung-chi`, `dao-tao`, `thuong`, `phu-cap-di-lai`. Ba quyền lợi đầu có `featured: true`.

- [ ] **Step 1: Test**
  ```ts
  expect(normText('  Kỹ   Sư ĐIỆN ')).toBe('ky su dien');
  expect(normText('ＡｕｔｏＣＡＤ')).toBe('autocad');
  expect(normText('東京都')).toBe('東京都');
  expect(normCode('＃００４１２ ')).toBe('00412');
  expect(normCode('#00412')).toBe('00412');
  expect(demoCatalog.prefectures).toHaveLength(47);
  const tokyo = demoCatalog.prefectures.find(p => p.code === '13')!;
  expect(tokyo.aliases.map(normText)).toEqual(expect.arrayContaining(['tokyo','東京','東京都']));
  expect(new Set(demoCatalog.groups.map(g => g.slug)).size).toBe(5);
  // mỗi nghề thuộc đúng một nhóm có thật; slug không trùng
  ```
- [ ] **Step 2:** Chạy `npx vitest run tests/unit/normalize.test.ts tests/unit/catalog.test.ts`. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt. `aliases` của mỗi tỉnh chứa `nameJa`, `nameJa` bỏ hậu tố 都/道/府/県, `romaji`, và `nameVi`.
- [ ] **Step 4:** Chạy lại. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit `feat: kiểu dữ liệu, danh mục demo, chuẩn hóa chuỗi`.

### Task 3: Định dạng lương và thời gian

**Files:**
- Create: `lib/salary.ts`, `lib/time.ts`
- Test: `tests/unit/salary.test.ts`, `tests/unit/time.test.ts`

**Interfaces:**
- Produces:
  - `formatYenRange(min: number|null, max: number|null, period: 'month'|'year'): string|null`
  - `salaryLines(job: Job): { monthly: string|null; annual: string|null }`
  - `UNCONFIRMED = 'Chưa xác nhận'`
  - `formatJst(iso: string): string`. Ví dụ: `'Thứ Sáu, 20/11/2026 · 10:00 giờ Nhật (JST, UTC+9)'`.
  - `formatVn(iso: string): string`. Ví dụ: `'20/11/2026 · 08:00 giờ Việt Nam (UTC+7)'`.
  - `jstDateKey(iso: string): string` (`YYYY-MM-DD` theo JST)
  - `jstToIso(dateKey: string, hhmm: string): string`
  - `jstTodayKey(now?: Date): string`

- [ ] **Step 1: Test**
  ```ts
  expect(formatYenRange(250000, 300000, 'month')).toBe('25–30 万円/tháng');
  expect(formatYenRange(3500000, 4410000, 'year')).toBe('350–441 万円/năm');
  expect(formatYenRange(3640000, null, 'year')).toBe('Từ 364 万円/năm');
  expect(formatYenRange(null, 300000, 'month')).toBe('Đến 30 万円/tháng');
  expect(formatYenRange(null, null, 'month')).toBeNull();
  expect(formatYenRange(215500, null, 'month')).toBe('Từ 21,55 万円/tháng');
  expect(formatJst('2026-11-20T01:00:00Z')).toBe('Thứ Sáu, 20/11/2026 · 10:00 giờ Nhật (JST, UTC+9)');
  expect(formatVn('2026-11-20T01:00:00Z')).toBe('20/11/2026 · 08:00 giờ Việt Nam (UTC+7)');
  // sát nửa đêm:
  expect(formatVn('2026-11-19T16:00:00Z')).toBe('19/11/2026 · 23:00 giờ Việt Nam (UTC+7)'); // = 01:00 JST ngày 20
  expect(jstDateKey('2026-11-19T16:00:00Z')).toBe('2026-11-20');
  expect(jstToIso('2026-11-20', '10:00')).toBe('2026-11-20T01:00:00.000Z');
  ```
  - Số 万円: tối đa 2 chữ số thập phân, dấu phẩy thập phân, bỏ số 0 thừa.
- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt bằng `Intl.DateTimeFormat` với `timeZone` tương ứng. Thứ trong tuần lấy từ mảng `['Chủ Nhật','Thứ Hai',…,'Thứ Bảy']`; không dựa vào ICU tiếng Việt vì kết quả khác nhau giữa các môi trường.
- [ ] **Step 4:** Chạy test. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit `feat: định dạng lương và giờ JST/VN`.

### Task 4: Dữ liệu demo, bộ lọc ↔ URL, lớp dữ liệu demo

**Files:**
- Create: `lib/demo/jobs.ts`, `lib/filters.ts`, `lib/data/demo.ts`, `lib/data/index.ts`
- Test: `tests/unit/demo-jobs.test.ts`, `tests/unit/filters.test.ts`, `tests/unit/search-demo.test.ts`

**Interfaces:**
- Consumes:
  - `Job`, `Catalog` (Task 2)
  - `normText`, `normCode` (Task 2)
  - `jstTodayKey`, `jstToIso` (Task 3)
- Produces:
  - `buildDemoJobs(now: Date): { jobs: Job[]; interviews: InterviewEvent[] }`. 15 tin, gồm đúng các tình huống ở mục 11 của spec:
    - mã `00412`;
    - 1 tin có 3 lịch;
    - 1 tin thiếu nhiều trường;
    - 1 tin `closed`;
    - 1 lịch đã qua;
    - 1 lịch `cancelled`;
    - 1 tin `translationStatus: 'unreviewed'`;
    - các tin chỉ có lương tháng, chỉ có lương năm, có cả hai, và thiếu lương.

    Lịch tạo lúc 10:00 JST vào các ngày hôm nay(JST) +2, +5, +9, +14, +20; lịch đã qua ở ngày −3. ID và mã tin cố định, không phụ thuộc thứ tự.
  - `type JobFilters`:
    ```
    {
      q: string; prefectures: string[] /*JIS*/; groups: string[]; occupations: string[];
      salaryMinMan: number|null; salaryMaxMan: number|null; period: 'month'|'year';
      jpLevel: JpLevel|null; maxExperience: number|null; benefits: string[];
      hasInterview: boolean; sort: 'moi'|'pv'|'luong'; page: number
    }
    ```
  - `parseFilters(sp: Record<string, string|string[]|undefined>, catalog: Catalog): JobFilters`. Giá trị rác bị bỏ; `page` nhỏ hơn 1 hoặc không phải số thì về 1.
  - `filtersToQuery(f: JobFilters): string`. Không ghi giá trị mặc định; thứ tự khóa cố định.
  - `hasActiveFilters(f): boolean`
  - `JobSummary = Job & { nextInterview: InterviewEvent|null }`
  - Hàm export từ `lib/data/index.ts` (giai đoạn 2 thêm nguồn Supabase cùng chữ ký):
    ```
    isDemoMode(): boolean
    getCatalog(): Promise<Catalog>
    searchJobs(f: JobFilters): Promise<{ items: JobSummary[]; total: number; page: number; pageSize: 12; pageCount: number }>
    getJobByCode(code: string): Promise<(Job & { interviews: InterviewEvent[] /*sắp tới, đã sắp*/ }) | null>   // cả tin closed; tin draft → null
    getRelatedJobs(job: Job, limit = 4): Promise<JobSummary[]>
    listUpcomingInterviews(o: { from?: string; to?: string /*YYYY-MM-DD JST*/; prefectures: string[]; occupations: string[] }): Promise<Array<InterviewEvent & { job: Job }>>
    countOpenJobsByGroup(): Promise<Record<string /*group slug*/, number>>
    getSiteSettings(): Promise<SiteSettings>
    ```
- Quy tắc lọc (copy từ spec):
  - từ khóa: các từ kết hợp AND trên chuỗi tìm kiếm của tin; tin có mã khớp chính xác `normCode(q)` lên đầu;
  - tỉnh OR, nghề OR, hai nhóm AND với nhau; chọn nhóm nghề = chọn mọi nghề trong nhóm;
  - lương: khoảng giao nhau, theo đúng kỳ; tin có một đầu thì đầu đó dùng cho cả min và max; tin không có lương của kỳ đã chọn bị loại;
  - `jpLevel` null và `experienceYearsMin` null vẫn đạt; `none` là mức thấp nhất;
  - quyền lợi: tin phải có tất cả, với giá trị `true`;
  - chỉ gồm tin đang tuyển (`published` và chưa quá `validThrough`).
- Sắp xếp:
  - `moi`: `updatedAt` giảm dần;
  - `pv`: lịch sắp tới gần nhất (tin không có lịch xếp cuối);
  - `luong`: theo `period`, giá trị max (hoặc min nếu chỉ có min) giảm dần, null xếp cuối;
  - sắp phụ theo `code` tăng dần.
- `?demo_error=1`: `searchJobs` ném lỗi. Chỉ áp dụng khi demo, kiểm tra ở page bằng `searchParams` rồi truyền vào hàm.

- [ ] **Step 1: Test**
  ```ts
  // demo-jobs
  const { jobs, interviews } = buildDemoJobs(new Date('2026-11-16T03:00:00Z'));
  expect(jobs.length).toBeGreaterThanOrEqual(12); expect(jobs.length).toBeLessThanOrEqual(18);
  expect(jobs.every(j => j.isDemo)).toBe(true);
  expect(jobs.find(j => j.code === '00412')).toBeTruthy();
  expect(new Set(jobs.map(j => j.code)).size).toBe(jobs.length);
  expect(interviews.find(i => i.status === 'cancelled')).toBeTruthy();
  // mỗi nhóm nghề có ≥1 tin

  // filters
  const f = parseFilters({ tinh: '13,27,99', trang: '-3', tiengnhat: 'N9', luong: '25-', ky: 'thang' }, demoCatalog);
  expect(f.prefectures).toEqual(['13','27']); expect(f.page).toBe(1); expect(f.jpLevel).toBeNull();
  expect(f.salaryMinMan).toBe(25); expect(f.salaryMaxMan).toBeNull();
  expect(parseFilters(Object.fromEntries(new URLSearchParams(filtersToQuery(f))), demoCatalog)).toEqual(f);

  // search-demo
  (await searchJobs({ ...empty, q: '#00412' })).items[0].code === '00412'
  (await searchJobs({ ...empty, q: '＃００４１２' })).items[0].code === '00412'
  (await searchJobs({ ...empty, q: 'Tokyo' })).items  // khớp tập tin có tỉnh 13, và bằng kết quả của q:'東京都'
  (await searchJobs({ ...empty, q: 'ky su dien' })).total > 0
  (await searchJobs({ ...empty, q: 'zzzkhongco' })).total === 0
  (await searchJobs({ ...empty, prefectures: ['13','27'], groups: ['dien'] })).items
    // mỗi tin: thuộc (13 hoặc 27) VÀ có nghề thuộc nhóm 'dien'
  // lọc kết hợp rồi xóa: kết quả bằng empty.total
  // tin closed không xuất hiện; getJobByCode(closedCode) vẫn trả tin
  // lương: tin chỉ có annual bị loại khi period='month' và có salaryMinMan
  // tin jpLevel null vẫn có khi jpLevel='N3'; tin yêu cầu N2 bị loại khi jpLevel='N3'
  // page=99 → items [] và total như bình thường
  // pageSize 12; trang 2 không trùng trang 1
  ```
- [ ] **Step 2:** Chạy test. Kết quả mong đợi: FAIL.
- [ ] **Step 3:** Cài đặt.
  - Dữ liệu demo tính một lần cho mỗi request: `buildDemoJobs(new Date())`.
  - Chuỗi tìm kiếm của tin là `normText` của: code, `titleVi`, `titleJa`, alias các tỉnh, tên và alias các nghề, kỹ năng, `locationDetailJa`.
- [ ] **Step 4:** Chạy test. Kết quả mong đợi: PASS.
- [ ] **Step 5:** Commit `feat: dữ liệu demo, bộ lọc URL và tìm kiếm`.

### Task 5: Thẻ việc làm và trang `/viec-lam`

**Files:**
- Create:
  - `components/JobCard.tsx`, `components/JobPoster.tsx`
  - `components/filters/FilterPanel.tsx` (client), `components/filters/CheckList.tsx` (client), `components/filters/ActiveChips.tsx`
  - `components/Pagination.tsx`, `components/ViewToggle.tsx` (client)
  - `app/viec-lam/page.tsx`, `app/viec-lam/loading.tsx`, `app/viec-lam/error.tsx`
- Test: thuộc Task 11 (e2e)

**Interfaces:**
- Consumes: `searchJobs`, `getCatalog`, `parseFilters`, `filtersToQuery`, `hasActiveFilters`, `salaryLines`, `formatJst`
- Produces:
  - `jobHref(job: Pick<Job,'slug'|'code'>): string`, trả `/viec-lam/${slug}-${code}`, đặt trong `lib/filters.ts`
  - `<JobCard job={JobSummary} catalog={Catalog} />`, dùng lại ở trang chủ và trang liên quan

- [ ] **Step 1:** Cài đặt `JobCard` theo phác thảo ở mục 8 spec:
  - tiêu đề là `<h3><a>`, link phủ toàn thẻ;
  - lương `salaryLines`, hiện `Lương: Chưa xác nhận` khi cả hai null;
  - chip "Có thể thương lượng" khi `salaryNegotiable === true`;
  - tối đa 3 quyền lợi `featured` có giá trị true;
  - ngày cập nhật dạng `dd/mm/yyyy`;
  - lịch gần nhất màu cam;
  - nhãn "Dữ liệu minh họa".
- [ ] **Step 2:** Cài đặt `FilterPanel`:
  - là form GET; mỗi thay đổi gọi `router.push('/viec-lam?' + filtersToQuery({...f, page: 1}))`;
  - mỗi nhóm checkbox có ô tìm kiếm (lọc theo `normText` và alias); tỉnh gom theo vùng, nghề gom theo nhóm (có checkbox chọn cả nhóm);
  - lương có 2 input số (万円) và radio tháng/năm; select tiếng Nhật; select kinh nghiệm; checkbox quyền lợi; checkbox "Có lịch phỏng vấn sắp tới";
  - desktop (≥1024px): cột trái, sticky;
  - mobile: nút `Bộ lọc (n)` mở `<dialog>` toàn màn hình (`showModal()`; Esc đóng; focus vào tiêu đề), chân dialog có nút "Xem {total} kết quả" và "Xóa tất cả".
- [ ] **Step 3:** Cài đặt `ActiveChips`. Mỗi chip là link tới URL đã bỏ điều kiện đó, có `aria-label="Bỏ lọc: …"`; thêm link "Xóa tất cả" về `/viec-lam`.
- [ ] **Step 4:** Cài đặt `page.tsx` (server):
  - ô tìm kiếm có `name="q"`; select sắp xếp; dòng `Tìm thấy {total} việc làm`;
  - lưới thẻ: 1 cột < 768px, 2 cột ≥ 768px; chế độ poster: 2/3 cột;
  - phân trang dùng `<a>`;
  - trạng thái rỗng: "Không tìm thấy việc làm phù hợp" + link xóa bộ lọc;
  - `generateMetadata`: canonical `/viec-lam`, kèm `robots: { index: false, follow: true }` khi `hasActiveFilters`.
  - `loading.tsx`: 6 thẻ skeleton. `error.tsx`: thông báo lỗi + nút "Thử lại" gọi `reset()`.
- [ ] **Step 5:** `npm run build` thành công. Mở thủ công `/viec-lam?tinh=13&trang=2`: trang hiển thị bình thường.
- [ ] **Step 6:** Commit `feat: trang danh sách việc làm với bộ lọc`.

### Task 6: Trang chi tiết `/viec-lam/[slug]`

**Files:**
- Create:
  - `app/viec-lam/[slug]/page.tsx`
  - `components/job/JobDetailFull.tsx`, `components/job/JobDetailPoster.tsx`, `components/job/BilingualBlock.tsx` (client: công tắc "Xem bản gốc tiếng Nhật"), `components/job/TriValue.tsx`
  - `components/ApplyBar.tsx` (client: thanh cố định trên mobile)
  - `components/BackToResults.tsx` (client)
- Test: `tests/unit/slug.test.ts`

**Interfaces:**
- Consumes: `getJobByCode`, `getRelatedJobs`, `getCatalog`, `jobHref`, `salaryLines`, `formatJst`, `formatVn`
- Produces:
  - `codeFromSlugParam(param: string): string`, trả phần sau dấu `-` cuối cùng, đặt trong `lib/filters.ts`
  - `<TriValue value={Tri} yes="Có" no="Không" />`, hiển thị `Chưa xác nhận` khi null
  - `<ApplyButton job>`, mở form (Task 10)

- [ ] **Step 1: Test**
  ```ts
  expect(codeFromSlugParam('thiet-ke-dien-plc-00412')).toBe('00412');
  expect(codeFromSlugParam('00412')).toBe('00412');
  ```
- [ ] **Step 2:** Chạy test (FAIL), cài đặt, chạy lại (PASS).
- [ ] **Step 3:** Cài đặt trang:
  - không tìm thấy → `notFound()`;
  - slug khác `job.slug` → `permanentRedirect(jobHref(job))`;
  - tab "Đầy đủ" / "Tóm tắt" bằng `?xem=tomtat`;
  - các khối theo thứ tự ở mục 8 spec; yêu cầu và quyền lợi là hai `<section>` riêng;
  - quyền lợi hiển thị cả 8 mục của danh mục với có / không / chưa xác nhận, cộng thêm xe công ty;
  - nhãn bản dịch: `unreviewed` → "Bản dịch chưa được duyệt", `none` → chỉ hiện tiếng Nhật;
  - tin `closed` hoặc quá hạn: banner "Đã ngừng tuyển", ẩn nút ứng tuyển;
  - mỗi lịch hiển thị `formatJst`, kèm công tắc giờ VN;
  - `ApplyBar` dùng `fixed bottom-0` dưới 1024px; trang thêm `pb-24` dưới 1024px để không che nội dung;
  - `generateMetadata`: title `{titleVi} ({code}) | {brandName}`, description lấy từ summary, canonical `jobHref`, Open Graph; tin demo → `robots: noindex`;
  - JSON-LD chỉ khi `!isDemo && employerName && prefectureIds.length && content.description`.
- [ ] **Step 4:** `npm run build` thành công.
- [ ] **Step 5:** Commit `feat: trang chi tiết việc làm`.

### Task 7: `/lich-phong-van`

**Files:**
- Create: `app/lich-phong-van/page.tsx`, `components/TimezoneToggle.tsx` (client; lưu lựa chọn vào `localStorage` có try/catch)
- Test: thêm vào `tests/unit/search-demo.test.ts`

**Interfaces:**
- Consumes: `listUpcomingInterviews`, `formatJst`, `formatVn`, `jstDateKey`, `jobHref`

- [ ] **Step 1: Test**
  - `listUpcomingInterviews({prefectures:[],occupations:[]})`:
    - không chứa lịch `cancelled`, lịch đã qua, hay lịch của tin `closed`;
    - sắp theo `startsAt` tăng dần;
    - tin có 3 lịch xuất hiện 3 lần.
  - Lọc `from`/`to` theo ngày JST.
- [ ] **Step 2:** Chạy test (FAIL), cài đặt, chạy lại (PASS).
- [ ] **Step 3:** Cài đặt trang:
  - nhóm theo `jstDateKey`; tiêu đề ngày dạng "Thứ Sáu, 20/11/2026";
  - mỗi dòng gồm giờ JST (và giờ VN khi bật), tiêu đề tin kèm link, mã, tỉnh, hình thức, và nút "Đăng ký quan tâm" dẫn tới `jobHref + '#ung-tuyen'`;
  - bộ lọc GET: `tu`, `den` (date input), `tinh`, `nghe`;
  - trạng thái rỗng;
  - ghi chú: "Đăng ký quan tâm không đồng nghĩa giữ suất phỏng vấn."
- [ ] **Step 4:** Commit `feat: trang lịch phỏng vấn`.

### Task 8: Trang chủ, giới thiệu, liên hệ, chính sách, SEO chung

**Files:**
- Create: `app/page.tsx`, `app/gioi-thieu/page.tsx`, `app/lien-he/page.tsx`, `app/chinh-sach-bao-mat/page.tsx`, `app/dieu-khoan/page.tsx`, `components/PolicyDraftBanner.tsx`, `components/Paragraphs.tsx`, `app/sitemap.ts`, `app/robots.ts`

**Interfaces:**
- Consumes: `searchJobs`, `listUpcomingInterviews`, `countOpenJobsByGroup`, `getSiteSettings`, `JobCard`
- Produces: `<Paragraphs text>`, tách đoạn theo dòng trống, không render HTML.

- [ ] **Step 1:** Trang chủ gồm các phần theo mục 8 spec.
  - Hero: tiêu đề "Tìm việc và chuyển việc kỹ sư tại Nhật cho người Việt"; form GET đến `/viec-lam` gồm `q` và select nhóm nghề.
  - 5 thẻ nhóm nghề kèm số tin thật, link `/viec-lam?nhom=…`.
  - 6 tin mới nhất; 5 lịch phỏng vấn sớm nhất.
  - Quy trình 4 bước: Tìm việc → Gửi hồ sơ → Tư vấn → Phỏng vấn.
  - Giới thiệu ngắn; FAQ bằng `<details>`, 5 câu chung về quy trình, không nêu cam kết.
  - Không hiển thị số liệu nào ngoài số đếm từ dữ liệu.
- [ ] **Step 2:** Các trang nội dung:
  - `/gioi-thieu`: `aboutText` từ settings, kèm banner "Nội dung cần chủ website cung cấp" khi chuỗi là placeholder.
  - `/lien-he`: danh sách kênh liên hệ (ẩn placeholder) và form tư vấn `#tu-van` (Task 10).
  - Trang chính sách và điều khoản: nội dung mẫu về mục đích xử lý hồ sơ, thời hạn lưu `retentionMonths` tháng, quyền yêu cầu xóa; luôn có `PolicyDraftBanner` khi `!policiesConfirmed`.
- [ ] **Step 3:** SEO:
  - `sitemap.ts` gồm các trang tĩnh và tin đang tuyển có `!isDemo`;
  - `robots.ts`: disallow `/admin`, `/api`;
  - `metadataBase` lấy từ `NEXT_PUBLIC_SITE_URL` (fallback `http://localhost:3000`).
- [ ] **Step 4:** `npm run build` thành công.
- [ ] **Step 5:** Commit `feat: trang chủ, nội dung và SEO`.

### Task 9: Kiểm tra dữ liệu form dùng chung (client và server)

**Files:**
- Create: `lib/validate.ts`
- Test: `tests/unit/validate.test.ts`

**Interfaces:**
- Produces:
  - `ApplicationInput`:
    ```
    {
      kind: 'apply'|'consult'; jobCode: string|null; fullName: string;
      email: string; phone: string; facebook: string; jpLevel: JpLevel|''; note: string;
      consent: boolean; idempotencyKey: string;
      file: { name: string; size: number; type: string } | null
    }
    ```
  - `validateApplication(i: ApplicationInput): Record<string, string>`. Trả map trường → thông báo lỗi tiếng Việt; rỗng nghĩa là hợp lệ.
  - `ALLOWED_EXT = ['pdf','doc','docx','xls','xlsx']`
  - `MAX_CV_BYTES = 10 * 1024 * 1024`
  - `sniffFileKind(head: Uint8Array): 'pdf'|'ole'|'zip'|null`. Giai đoạn 2 dùng hàm này ở server.

- [ ] **Step 1: Test**
  ```ts
  base = { kind:'apply', jobCode:'00412', fullName:'Nguyễn Văn A', email:'', phone:'', facebook:'', jpLevel:'', note:'', consent:true, idempotencyKey:'k', file:{name:'cv.pdf',size:1000,type:'application/pdf'} }
  expect(validateApplication({...base, phone:'090 123 4567'})).toEqual({});
  expect(validateApplication(base).contact).toBe('Cần ít nhất một cách liên hệ: email, điện thoại/Zalo hoặc Facebook.');
  expect(validateApplication({...base, email:'abc'}).email).toBeDefined();
  expect(validateApplication({...base, phone:'0901234567', consent:false}).consent).toBeDefined();
  expect(validateApplication({...base, phone:'0901234567', file:{name:'cv.exe',size:10,type:'application/x-msdownload'}}).file).toBeDefined();
  expect(validateApplication({...base, phone:'0901234567', file:{name:'cv.pdf',size:MAX_CV_BYTES+1,type:'application/pdf'}}).file).toBeDefined();
  expect(validateApplication({...base, phone:'0901234567', file:{name:'cv.pdf',size:0,type:'application/pdf'}}).file).toBeDefined();
  expect(validateApplication({...base, kind:'consult', jobCode:null, phone:'0901234567', file:null})).toEqual({});
  expect(validateApplication({...base, phone:'0901234567', file:null}).file).toBeDefined(); // apply cần CV
  expect(validateApplication({...base, fullName:' ', phone:'0901234567'}).fullName).toBeDefined();
  expect(validateApplication({...base, phone:'0901234567', note:'x'.repeat(2001)}).note).toBeDefined();
  expect(sniffFileKind(new TextEncoder().encode('%PDF-1.7'))).toBe('pdf');
  expect(sniffFileKind(Uint8Array.from([0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1]))).toBe('ole');
  expect(sniffFileKind(Uint8Array.from([0x50,0x4B,0x03,0x04]))).toBe('zip');
  expect(sniffFileKind(new TextEncoder().encode('MZ'))).toBeNull();
  ```
  - Điện thoại: sau khi bỏ khoảng trắng, `-` và `.`, khớp `^\+?\d{9,15}$`.
  - Email: khớp `^[^\s@]+@[^\s@]+\.[^\s@]+$`.
  - MIME: chấp nhận rỗng hoặc `application/octet-stream`, vì một số trình duyệt mobile không khai báo; server ở giai đoạn 2 kiểm tra magic bytes.
- [ ] **Step 2:** Chạy test (FAIL), cài đặt, chạy lại (PASS).
- [ ] **Step 3:** Commit `feat: kiểm tra dữ liệu hồ sơ dùng chung`.

### Task 10: Form ứng tuyển / tư vấn và API ở chế độ demo

**Files:**
- Create: `components/ApplicationForm.tsx` (client), `app/api/applications/start/route.ts`
- Modify: trang chi tiết (`#ung-tuyen`), `/lien-he` (`#tu-van`)
- Test: thuộc Task 11 (e2e)

**Interfaces:**
- Consumes: `validateApplication`, `isDemoMode`
- Produces:
  - `POST /api/applications/start` nhận `multipart/form-data` hoặc JSON. Ở chế độ demo luôn trả:
    ```
    503 { ok: false, demo: true, message: 'Website đang ở chế độ minh họa — hồ sơ CHƯA được gửi. Vui lòng liên hệ qua Zalo/Facebook.' }
    ```
    sau khi đã chạy `validateApplication` (dữ liệu sai thì trả 400 kèm `errors`).
  - Giai đoạn 2 thay phần thân bằng luồng Supabase.

- [ ] **Step 1:** Cài đặt form.
  - Các trường theo mục 7 spec; mã và tên tin điền sẵn và chỉ đọc.
  - `idempotencyKey = crypto.randomUUID()` tạo khi mount.
  - Trạng thái `submitting` khóa nút (`disabled` + `aria-busy`); handler `onSubmit` thoát ngay nếu `submittingRef.current` đang true, để chặn cả Enter lặp.
  - Lỗi theo từng trường dùng `aria-describedby`; lỗi chung nằm trong `role="alert"`.
  - Khi 503 hoặc lỗi mạng: giữ nguyên dữ liệu và hiện nút "Thử lại".
  - Chỉ khi nhận `{ ok: true, refCode }` mới hiện "Đã nhận hồ sơ — mã {refCode}".
  - Input file `accept=".pdf,.doc,.docx,.xls,.xlsx"`.
  - Form ứng tuyển có link "Chưa có CV? Nhận tư vấn trước", chuyển `kind` sang `consult`.
  - Thanh tiến trình: giai đoạn này chỉ là trạng thái "Đang gửi…"; XHR progress thêm ở giai đoạn 2.
- [ ] **Step 2:** Cài đặt route và gắn form vào hai trang.
- [ ] **Step 3:** `npm run build` thành công.
- [ ] **Step 4:** Commit `feat: form ứng tuyển và tư vấn (chế độ demo)`.

### Task 11: Kiểm thử e2e Giai đoạn 1

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/jobs.spec.ts`, `tests/e2e/detail.spec.ts`, `tests/e2e/form.spec.ts`, `tests/e2e/layout.spec.ts`

**Interfaces:**
- Consumes: mọi trang. Mã demo `00412` và tin closed lấy từ `buildDemoJobs`.

- [ ] **Step 1:** `playwright.config.ts`:
  - `webServer: { command: 'npm run build && npm run start -- -p 3100', port: 3100 }`;
  - project chromium; `trace: 'off'`.
- [ ] **Step 2:** Viết các test:
  - **jobs:**
    - gõ `#00412` vào ô tìm → thẻ đầu tiên có `#00412`;
    - chọn 2 tỉnh + 1 nhóm nghề → URL chứa `tinh=` và `nhom=`, mọi thẻ thuộc điều kiện;
    - bấm "Xóa tất cả" → tổng số kết quả bằng tổng lúc ban đầu;
    - vào chi tiết rồi `page.goBack()` → URL và số kết quả giữ nguyên;
    - `?q=zzzkhongco` → hiện trạng thái rỗng;
    - `?demo_error=1` → hiện nút "Thử lại";
    - `?trang=abc` → không lỗi.
  - **detail:**
    - mở trực tiếp `/viec-lam/<slug>-00412` → tiêu đề đúng;
    - `/viec-lam/sai-slug-00412` → bị chuyển về URL chuẩn;
    - tin closed → có "Đã ngừng tuyển" và không có nút ứng tuyển;
    - tin thiếu lương → "Chưa xác nhận";
    - bản dịch chưa duyệt → có nhãn.
  - **form:**
    - chặn POST đầu tiên bằng `page.route` (trì hoãn 1 giây), bấm gửi 3 lần → đếm request bằng 1;
    - phản hồi 503 → thấy "CHƯA được gửi" và không thấy "Đã nhận hồ sơ";
    - không nhập liên hệ → hiện lỗi liên hệ.
  - **layout:**
    - với các width 360/390/768/1024/1440 trên `/`, `/viec-lam`, chi tiết, `/lich-phong-van`: `document.documentElement.scrollWidth <= innerWidth`;
    - ở 390: nút "Bộ lọc" mở dialog, chọn 1 tỉnh, "Xem … kết quả" → URL có `tinh=`;
    - bàn phím: Tab từ đầu trang tới ô tìm kiếm, gõ, Enter → URL có `q=`;
    - lịch phỏng vấn hiện chuỗi "giờ Nhật (JST, UTC+9)".
- [ ] **Step 3:** `npx playwright test --trace off`. Kết quả mong đợi: tất cả PASS.
- [ ] **Step 4:** `npm test`, `npm run lint`, `npm run build` đều sạch.
- [ ] **Step 5:** Commit `test: e2e giai đoạn 1`, rồi push nhánh `feature/website-v1`.
