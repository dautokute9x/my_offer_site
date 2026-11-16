# Thiết kế: Website tuyển dụng kỹ sư tại Nhật cho người Việt

Ngày: 2026-11-16 · Trạng thái: chờ duyệt

## 1. Mục đích

Giúp người Việt đang tìm hoặc muốn chuyển việc kỹ sư tại Nhật:

- tìm nhanh công việc phù hợp,
- hiểu rõ điều kiện tuyển dụng,
- xem lịch phỏng vấn,
- gửi hồ sơ mà không cần tạo tài khoản.

Đơn vị vận hành (quản trị viên) dùng website để đăng tin, quản lý lịch phỏng vấn và xử lý hồ sơ.

Website tham khảo (Google Sites + Apps Script) đã có các chức năng: tìm kiếm, lọc nhiều tỉnh/nhiều nghề, thẻ poster, lịch phỏng vấn, liên hệ Facebook/Zalo. Bản mới giữ các chức năng đó và khắc phục ba điểm yếu:

- Danh sách chọn bằng Ctrl+click không dùng được trên điện thoại.
- Dữ liệu lương không có đơn vị (ví dụ "350 > 441").
- Poster màu vàng khó đọc và khó so sánh giữa các tin.

## 2. Mục tiêu, ngoài phạm vi, điều cấm

**Mục tiêu**

- Các trang công khai: `/`, `/viec-lam`, `/viec-lam/[slug-code]`, `/lich-phong-van`, `/gioi-thieu`, `/lien-he`, `/chinh-sach-bao-mat`, `/dieu-khoan`.
- Luồng ứng tuyển kèm CV riêng tư, và luồng "nhận tư vấn trước" khi chưa có CV.
- Trang `/admin` có đăng nhập. Chức năng: quản lý tin, danh mục, lịch phỏng vấn, hồ sơ, nội dung trang, nhập CSV.
- Chế độ demo chạy được khi chưa có Supabase.

**Ngoài phạm vi bản đầu**

- Tài khoản ứng viên.
- Đặt chỗ hoặc giữ suất phỏng vấn.
- Dịch tự động bằng AI.
- Đồng bộ Google Sheets.
- Gửi email thông báo.
- Nhiều vai trò quản trị.
- Đa ngôn ngữ giao diện (giao diện là tiếng Việt; nội dung tiếng Nhật chỉ để đối chiếu).

**Điều cấm** — vi phạm một điểm là hỏng, dù website vẫn "chạy":

- Báo "đã gửi thành công" khi dữ liệu chưa thật sự được lưu.
- Người công khai đọc được hồ sơ hoặc CV.
- Dùng thương hiệu, hình ảnh, liên hệ hoặc dữ liệu của website tham khảo.
- Tự bịa số điện thoại, đối tác, chứng nhận, đánh giá hoặc số liệu.
- Đưa dữ liệu giả vào structured data.
- Suy ra lương thực nhận.
- Tải toàn bộ kho việc làm về trình duyệt.

## 3. Ràng buộc

- Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres, Auth, Storage). Một ứng dụng duy nhất.
- Triển khai: Vercel + Supabase Cloud.
  - Hệ quả: hàm server trên Vercel chỉ nhận request tối đa ~4.5 MB, nên CV 10 MB **phải tải thẳng lên Supabase Storage** bằng signed upload URL (xem mục 7).
- Phiên làm việc này chưa có Supabase thật. Phân quyền (RLS) được kiểm thử trên Postgres cục bộ, có giả lập schema `auth` và các role `anon`/`authenticated`.
- Responsive ở 360/390/768/1024/1440 px; nút chính tối thiểu 44 px; đạt WCAG AA; dùng được bằng bàn phím.
- Hạn chế thêm thư viện. Dự kiến chỉ thêm `@supabase/supabase-js` và `@supabase/ssr`; dùng thêm `vitest` và `@playwright/test` cho kiểm thử. Trình đọc CSV và hàm kiểm tra dữ liệu tự viết, kèm test.

## 4. Các phương án đã cân nhắc

1. **Một lớp truy cập dữ liệu, hai nguồn: demo và Supabase** — *đã chọn*.
   - Các trang chỉ gọi `lib/data`. Có `NEXT_PUBLIC_SUPABASE_URL` thì dùng Supabase, không có thì dùng dữ liệu demo trong mã.
   - Đổi lại: logic lọc có hai bản (TypeScript cho demo, SQL cho Supabase). Một test so khớp kết quả hai bản trên cùng dữ liệu seed.
2. **Chỉ dùng Supabase, demo nằm trong seed database.** Loại, vì thiếu Supabase là website không chạy, trái yêu cầu.
3. **Làm giao diện tĩnh trước, viết lại khi có database.** Loại, vì phải làm hai lần.

## 5. Kiến trúc

```
app/                      trang công khai + /admin + /api
  (public)/...            Server Components, đọc qua lib/data
  admin/...               kiểm tra quyền admin ở server cho từng trang/action
  api/applications/       start → (client upload thẳng Storage) → complete
lib/
  data/                   index.ts chọn nguồn; demo.ts; supabase.ts
  demo/seed.ts            12–18 tin minh họa, lịch tạo tương đối theo giờ JST
  search.ts               chuẩn hóa chuỗi, alias, tham số URL <-> bộ lọc
  salary.ts, time.ts      định dạng lương; định dạng giờ JST/VN
  validate.ts, csv.ts     kiểm tra dữ liệu form; đọc CSV và kiểm tra theo dòng
  supabase/               client server/browser; client service role chỉ dùng ở server
supabase/migrations/      schema, RLS, hàm search_jobs, bucket cvs
supabase/seed.sql         danh mục và tin demo
tests/                    vitest (unit, so khớp hai nguồn), playwright (e2e), rls.sql
```

- Trang công khai render ở server.
  - `/viec-lam` render động theo `searchParams`.
  - Trang chi tiết dùng ISR (`revalidate` 300 s) và được revalidate khi quản trị viên lưu tin.
- Khóa service role chỉ dùng trong route handler và server action; không bao giờ có tiền tố `NEXT_PUBLIC_`.

## 6. Dữ liệu (Postgres)

**Danh mục**

- `prefectures`: `id`, `code` (JIS 01–47), `name_ja` (東京都), `name_vi`, `romaji` (Tokyo), `aliases text[]` (東京, tokyo-to…).
- `occupation_groups`: 5 nhóm nghề như trong yêu cầu, mỗi nhóm có `name_vi`, `name_ja`, `sort`.
- `occupations`: `group_id`, `name_vi`, `name_ja`, `aliases`. Mỗi nghề là một dòng. Không tạo danh mục mới từ chuỗi ghép nhiều nghề.
- `skills`: `name`, `aliases` (AutoCAD, Revit, Tekla, SolidWorks, PLC…).
- `benefits`: `slug`, `name_vi`, `name_ja`, `sort`, `featured` (được ưu tiên hiện trên thẻ).
  - Seed: ký túc xá, hỗ trợ nhà ở, hỗ trợ chuyển nhà, cho phép đưa gia đình sang, hỗ trợ lấy chứng chỉ, đào tạo, thưởng, phụ cấp đi lại.

**`jobs`** (dữ liệu công khai, chỉ đọc được khi `status = 'published'` hoặc `'closed'`)

| Nhóm | Cột |
|---|---|
| Định danh | `id uuid`, `code text unique` (giữ nguyên số 0 ở đầu, regex `^[A-Za-z0-9]{1,20}$`), `slug` |
| Trạng thái | `status`: `draft` \| `published` \| `closed`; `published_at`, `updated_at`, `valid_through` (tùy chọn) |
| Tiêu đề | `title_vi`, `title_ja` |
| Nhà tuyển dụng | `employer_name` (tùy chọn; chỉ hiển thị khi quản trị viên điền) |
| Địa điểm | `location_detail_ja` (ví dụ 兵庫県神戸市兵庫区) + bảng nối `job_prefectures` |
| Nghề, kỹ năng | bảng nối `job_occupations`, `job_skills` |
| Lương | `monthly_min_yen`, `monthly_max_yen`, `annual_min_yen`, `annual_max_yen` (int, đơn vị yên); `salary_negotiable bool null`; `salary_source_text` (chuỗi gốc khi nhập); `salary_needs_review bool` |
| Yêu cầu | `jp_level`: `N1..N5` \| `none` \| null (= chưa xác nhận); `jp_note`; `experience_years_min int null`; `experience_note`; `driver_license_required bool null`; `company_car_provided bool null` |
| Nội dung | cặp `*_ja` / `*_vi` cho `summary`, `description`, `requirements`, `working_hours`, `holidays`, `overtime`, `benefits_note` |
| Bản dịch | `translation_status`: `none` \| `unreviewed` \| `approved`; `translation_source_hash` (hash nội dung `*_ja` lúc dịch; khác hash hiện tại thì hiển thị "bản dịch có thể đã cũ") |
| Tìm kiếm | `search_text` (trigger điền: chuỗi chuẩn hóa từ code, tiêu đề, tên/alias của tỉnh, nghề, kỹ năng) |

- `job_benefits(job_id, benefit_id, value bool)`: `true` = có, `false` = không, không có dòng = chưa xác nhận.
- Lương lưu bằng yên. Thu nhập năm hiển thị theo 万円 ("350–441 万円/năm"). Cột thiếu thì hiển thị "Chưa xác nhận".
- `salary_needs_review` được bật khi nhập CSV mà:
  - min > max, hoặc
  - lương tháng × 12 vượt thu nhập năm tối đa, hoặc
  - chuỗi gốc không đọc được.

  Quản trị viên thấy cờ này; người công khai không thấy.

**`interview_events`**

- Cột: `id`, `job_id`, `starts_at timestamptz`, `ends_at timestamptz null`, `format` (online/onsite/unknown), `public_note`, `status` (scheduled/cancelled).
- Lịch "sắp tới" khi `status = 'scheduled'`, `starts_at > now()`, và tin đang `published`.

**Tin hết hạn:** tin `published` có `valid_through < now()` được coi là đã đóng ở mọi truy vấn công khai (trạng thái hiệu lực tính trong `search_jobs` và trang chi tiết). Quản trị viên thấy nhãn "Đã quá hạn" và có thể đóng hẳn tin.

**Riêng tư — không có policy cho `anon`**

- `applications`:
  - Định danh: `id`, `ref_code` (ví dụ `HS-7K3QX9`, unique), `kind` (apply/consult).
  - Công việc: `job_id null`; ảnh chụp `job_code` và `job_title` tại thời điểm nộp.
  - Ứng viên: `full_name`, `email`, `phone`, `facebook`, `jp_level`, `note`.
  - CV: `cv_path`, `cv_mime`, `cv_size`.
  - Đồng ý: `consent_version`, `consent_at`.
  - Trạng thái: `status` gồm `pending_upload`, `new`, `contacting`, `interview_scheduled`, `hired`, `rejected`, `withdrawn`.
  - Kỹ thuật: `idempotency_key unique`, `ip_hash`, `created_at`, `delete_after date`.
- `application_notes`: `application_id`, `author_id`, `body`, `created_at`.
- `admins(user_id → auth.users)`, hàm `is_admin()` (security definer).
- `site_settings` (một dòng, kiểu jsonb): tên thương hiệu, liên hệ, nội dung giới thiệu, `consent_version`, số tháng lưu hồ sơ (mặc định 12).
  - Mọi người đọc được phần công khai.
  - Chỉ quản trị viên sửa được.

**RLS**

- `anon` chỉ đọc: danh mục, `jobs` có status published/closed, lịch của các tin đó, `site_settings`.
- Quản trị viên (`is_admin()`) được làm mọi thao tác.
- Hồ sơ do server ghi bằng service role, sau khi đã kiểm tra dữ liệu.
- Bucket `cvs` để private, không có policy cho `anon`. Quản trị viên tải CV qua signed URL hạn 60 giây, tạo ở server sau khi đã kiểm tra quyền.

**Hàm `search_jobs(params jsonb)`** (SQL, stable) — trả về các tin trong trang hiện tại kèm `total`.

- Từ khóa:
  - Chuẩn hóa NFKC, chữ thường, gộp khoảng trắng, bỏ `#` ở đầu.
  - Chia thành các từ; tin phải chứa đủ tất cả các từ (AND), so bằng `ILIKE` trên `search_text`, có index `pg_trgm`.
  - Nếu chuỗi nhập trùng khớp một mã tin thì tin đó lên đầu.
- Bộ lọc:
  - Nhiều tỉnh thì kết hợp OR; nhiều nghề thì OR; hai nhóm này kết hợp với nhau bằng AND.
  - Chọn cả nhóm nghề nghĩa là chọn mọi nghề trong nhóm.
  - Lương: chọn kỳ tháng hoặc năm, so với cột của đúng kỳ đó. Tin thiếu dữ liệu lương bị loại khi có lọc lương.
  - Tiếng Nhật: chọn mức tối đa ứng viên đạt được; tin yêu cầu cao hơn bị loại.
  - Kinh nghiệm tối đa.
  - Quyền lợi: tin phải có tất cả quyền lợi đã chọn (`value = true`).
  - "Có lịch sắp tới".
- Sắp xếp: `updated` (mặc định), `interview` (lịch gần nhất), `salary_month` hoặc `salary_year` (giá trị null xếp cuối). Thứ tự ổn định nhờ sắp phụ theo `code`.

## 7. Luồng ứng tuyển

1. Nút "Ứng tuyển" mở form, điền sẵn mã và tên tin.
   - Trên điện thoại: thanh ứng tuyển cố định ở cuối màn hình, trang có padding dưới tương ứng để không che nội dung.
   - Chế độ tư vấn: không cần CV, `job_id` có thể để trống.
2. Kiểm tra ở client cho phản hồi nhanh. Server **kiểm tra lại toàn bộ**:
   - Họ tên 1–100 ký tự.
   - Có ít nhất một trong: email, điện thoại/Zalo, Facebook. Email và số điện thoại phải đúng định dạng.
   - Ghi chú tối đa 2000 ký tự.
   - Bắt buộc đồng ý xử lý hồ sơ.
   - CV: đuôi tệp thuộc pdf, doc, docx, xls, xlsx; MIME được khai báo phù hợp; dung lượng từ 1 byte đến 10 MB.
3. `POST /api/applications/start`:
   - Kiểm tra dữ liệu.
   - Giới hạn tần suất: tối đa 5 hồ sơ mỗi `ip_hash` trong 10 phút, đếm trong bảng applications. `ip_hash` = SHA-256 của IP kèm bí mật `IP_HASH_SALT`; không lưu IP gốc.
   - Insert với `idempotency_key` do client tạo khi mở form. Trùng khóa thì trả về đúng hồ sơ cũ, không tạo bản mới.
   - Có CV: tạo `status = pending_upload` và trả về signed upload URL.
   - Không có CV: tạo thẳng `status = new` và trả về `ref_code`.
4. Client tải tệp thẳng lên Storage bằng XHR để hiển thị % tiến trình.
5. `POST /api/applications/complete`:
   - Server đọc các byte đầu và kiểm tra magic bytes (`%PDF`; OLE `D0CF11E0` cho doc/xls; `PK` cùng `[Content_Types].xml` cho docx/xlsx) và dung lượng thật.
   - Hợp lệ: chuyển sang `new` và trả về `ref_code`.
   - Không hợp lệ: xóa object, trả lỗi kèm hướng dẫn thử lại.
6. Chỉ sau bước 5 thành công, giao diện mới hiện "Đã nhận hồ sơ — mã HS-xxxx".
   - Nút gửi bị khóa trong suốt quá trình.
   - Lỗi mạng: giữ nguyên dữ liệu đã nhập, có nút thử lại (dùng cùng idempotency key).
7. **Chế độ demo:** API trả lỗi 503. Form hiện "Website đang ở chế độ minh họa — hồ sơ CHƯA được gửi. Vui lòng liên hệ qua Zalo/Facebook." Tuyệt đối không hiện thông báo thành công.
8. Hồ sơ `pending_upload` quá 24 giờ bị ẩn trong admin và được xóa cùng lúc với thao tác dọn hồ sơ hết hạn.

## 8. Giao diện công khai

**Thiết kế chung**

- Màu: navy `#0F2747`, xanh chính `#176AC0`, nền `#F5F7FB`, vùng nội dung trắng. Xanh lá cho trạng thái "đang tuyển"; cam cho lịch phỏng vấn.
- Font:
  - Ưu tiên `next/font` với Be Vietnam Pro (tiếng Việt) và Noto Sans JP (tiếng Nhật).
  - Nếu môi trường build không tải được Google Fonts thì dùng chuỗi font hệ thống, kết thúc bằng `"Noto Sans JP", "Hiragino Sans", "Yu Gothic", sans-serif`.
  - Nội dung chính 16 px; line-height 1.6.

**Thẻ việc làm** — gọn, mặc định dạng danh sách. Nội dung:

- mã tin `#26833`,
- tiêu đề tiếng Việt (tiêu đề tiếng Nhật nhỏ bên dưới),
- tỉnh,
- lương ("Tháng 25–30 万円 · Năm 350–441 万円" hoặc "Lương: Chưa xác nhận"; có nhãn "Có thể thương lượng" nếu đúng),
- tiếng Nhật và kinh nghiệm (chỉ khi đã xác nhận),
- tối đa 3 quyền lợi `featured` có giá trị "có",
- ngày cập nhật,
- lịch phỏng vấn gần nhất (cam),
- nút "Xem chi tiết".

Phác thảo:

```
┌──────────────────────────────────────────┐
│ #26833                       Cập nhật 14/11│
│ Thiết kế điện nhà máy (PLC, mạch điện)     │
│ 電気設備設計                                │
│ 📍 Hyogo   💴 Năm 364–441 万円 · Thương lượng │
│ N3 · ≥2 năm   [Ký túc xá] [Gia đình]       │
│ 🗓 PV 20/11/2026 10:00 JST          Xem chi tiết →│
└──────────────────────────────────────────┘
```

Có công tắc "Danh sách / Poster". Chế độ poster là lưới thẻ lớn hơn, nền trắng, viền navy; lựa chọn này lưu ở `localStorage`.

**`/viec-lam`**

- Desktop (≥1024 px): cột bộ lọc bên trái. Mobile: nút "Bộ lọc (n)" mở panel toàn màn hình, có nút "Xem n kết quả".
- Mỗi nhóm bộ lọc có ô tìm kiếm và danh sách checkbox (tỉnh gom theo vùng, nghề gom theo nhóm).
- Lựa chọn hiện tại hiển thị thành chip, mỗi chip có nút ✕; có nút "Xóa tất cả".
- Mọi trạng thái nằm trên URL, ví dụ `?q=&tinh=13,27&nghe=3,7&luong=300000-&ky=thang&tiengnhat=N3&kn=2&ql=ky-tuc-xa&pv=1&sx=updated&trang=2`.
  - Nhờ đó khi từ trang chi tiết quay lại (back), trình duyệt mở lại đúng trạng thái.
  - Link "← Quay lại kết quả" ở trang chi tiết dùng `history.back()` khi trang trước là `/viec-lam`.
- Hiển thị tổng số kết quả; 12 tin mỗi trang; phân trang bằng link thường (thẻ `<a>`).
- Có skeleton qua `loading.tsx`, trạng thái rỗng kèm gợi ý xóa bộ lọc, và trạng thái lỗi qua `error.tsx` có nút thử lại.

**`/viec-lam/[slug]-[code]`**

- Tìm tin theo `code` (phần sau dấu `-` cuối cùng). Slug sai thì chuyển hướng 308 về URL chuẩn.
- Tin đã đóng: vẫn mở được, có banner "Đã ngừng tuyển", không có nút ứng tuyển.
- Hai tab: "Đầy đủ" và "Tóm tắt/Poster".
- Các khối nội dung:
  - Lương & thu nhập.
  - Yêu cầu: tiếng Nhật, kinh nghiệm, kỹ năng, bằng lái.
  - Mô tả công việc.
  - Điều kiện làm việc: giờ làm, ngày nghỉ, tăng ca.
  - Quyền lợi: lưới có / không / chưa xác nhận, kèm xe công ty.
  - Lịch phỏng vấn.
  - Việc làm liên quan: tối đa 4 tin cùng nghề hoặc cùng tỉnh.
- Mỗi khối có công tắc "Xem bản gốc tiếng Nhật". Nhãn bản dịch:
  - `unreviewed`: "Bản dịch chưa được duyệt".
  - `none`: chỉ có bản tiếng Nhật.

**`/lich-phong-van`**

- Danh sách sự kiện còn hiệu lực, nhóm theo ngày, sắp theo thời gian gần nhất.
- Lọc theo khoảng ngày, tỉnh, nghề (qua URL).
- Định dạng giờ: "Thứ Sáu, 20/11/2026 · 10:00 giờ Nhật (JST, UTC+9)". Công tắc "Hiện giờ Việt Nam" thêm dòng "= 08:00 giờ VN (UTC+7)".
- Mỗi sự kiện có link đến tin tương ứng và nút "Đăng ký quan tâm/Ứng tuyển".

**Trang chủ**

- Header: logo dạng chữ (tên thương hiệu), điều hướng, nút "Nhận tư vấn".
- Hero kèm ô tìm kiếm.
- 5 nhóm nghề, mỗi nhóm hiển thị số tin thật.
- 6 tin mới cập nhật.
- 5 lịch phỏng vấn sớm nhất.
- Quy trình 4 bước.
- Giới thiệu ngắn (từ `site_settings`).
- FAQ (dùng `<details>`).
- Footer.

**`/gioi-thieu`, `/lien-he`, chính sách**

- Nội dung lấy từ `site_settings`. Văn bản thuần, các đoạn cách nhau bằng dòng trống; không dùng markdown.
- Trang chính sách và điều khoản dùng nội dung mẫu, có banner "Cần chủ website xác nhận trước khi xuất bản" chừng nào cờ `policies_confirmed = false`.
- `/lien-he` có form tư vấn, dùng chung luồng `kind = consult`.

## 9. Trang quản trị `/admin`

- Đăng nhập email và mật khẩu bằng Supabase Auth; tắt đăng ký trong Supabase Dashboard.
- `middleware.ts` làm mới session. Mỗi layout, page và server action đều gọi `requireAdmin()`: không đăng nhập thì chuyển sang trang login; đăng nhập nhưng không có trong bảng admins thì trả 403.
- Đăng xuất xóa cookie; mọi truy vấn sau đó chạy với quyền `anon` nên RLS chặn dữ liệu riêng.

**Các trang**

- **Tổng quan:** số tin theo trạng thái, số hồ sơ mới trong 7 ngày, 5 lịch sắp tới.
- **Tin tuyển dụng:**
  - Danh sách có tìm và lọc theo trạng thái.
  - Form tạo/sửa đủ các trường, có chọn tỉnh, nghề, kỹ năng, quyền lợi (3 trạng thái).
  - Xem trước bằng chính component của trang chi tiết.
  - Nút xuất bản / đóng tin.
  - Lịch phỏng vấn quản lý ngay trong trang tin; giờ nhập theo JST, server đổi sang timestamptz.
- **Danh mục:** CRUD cho tỉnh (chỉ sửa tên và alias), nghề, nhóm nghề, kỹ năng, quyền lợi.
- **Hồ sơ:**
  - Danh sách lọc theo trạng thái và theo tin.
  - Trang chi tiết: thông tin liên hệ, "Tải CV" (signed URL 60 giây), đổi trạng thái, ghi chú nội bộ.
  - Nút "Xóa hồ sơ" xóa cả CV.
  - Nút "Dọn hồ sơ quá hạn lưu" xóa các hồ sơ có `delete_after < hôm nay`.
- **Nội dung & liên hệ:** sửa `site_settings`.
- **Nhập CSV:**
  1. Tải file mẫu.
  2. Chọn tệp; server action đọc tệp và đề xuất ánh xạ cột (khớp theo tên cột trong mẫu); quản trị viên chỉnh ánh xạ bằng các dropdown.
  3. Xem trước: các dòng sẽ tạo mới / cập nhật (khớp theo `code`) / lỗi.
  4. Báo lỗi theo dòng: mã trùng trong file, mã sai định dạng, tỉnh/nghề không khớp tên hoặc alias, lương không phải số hoặc min > max, ngày giờ phỏng vấn sai, enum sai. Cảnh báo `salary_needs_review` hiện nhưng không chặn.
  5. Chỉ bấm "Nhập" được khi không còn lỗi.
  6. Nhập toàn bộ trong một transaction bằng RPC `import_jobs(jsonb)`; có lỗi thì không dòng nào được ghi.
  7. Cột tỉnh và nghề nhận nhiều giá trị, phân tách bằng `|`.

## 10. SEO

- Mỗi trang có `generateMetadata` riêng: title, description, canonical, Open Graph.
- Có `sitemap.ts` (các trang tĩnh và các tin published) và `robots.ts` (chặn `/admin`, `/api`).
- `/viec-lam` có tham số lọc (trừ `trang`): đặt `noindex,follow`, canonical về `/viec-lam`.
- Tin `closed`: vẫn ở trạng thái `index` nhưng hiển thị "Đã ngừng tuyển", ngoài sitemap; JobPosting nếu có thì `validThrough` là ngày đóng tin.
- JSON-LD `JobPosting` chỉ xuất ra khi đủ: tiêu đề, mô tả, `datePosted`, `employer_name` (`hiringOrganization`) và ít nhất một tỉnh. Lương chỉ đưa vào khi có số. Tin demo **không** xuất JobPosting.

## 11. Dữ liệu demo

- 15 tin, mỗi tin có nhãn "Dữ liệu minh họa", phủ 5 nhóm nghề và khoảng 10 tỉnh.
- Lương: có tin chỉ có lương tháng, có tin chỉ có thu nhập năm, có tin đủ cả hai, có tin thiếu lương.
- Các tình huống kiểm thử:
  - 1 tin có 3 lịch phỏng vấn.
  - 1 tin thiếu nhiều trường.
  - 1 tin đã đóng.
  - 1 lịch đã qua.
  - 1 lịch bị hủy.
  - 1 tin có bản dịch chưa duyệt.
  - Mã tin có số 0 ở đầu (`00412`).
- Lịch tính tương đối từ "hôm nay theo JST": +2, +5, +9 ngày… lúc 10:00 JST.
- Tìm không ra kết quả: thử với chuỗi bất kỳ.
- Tải lỗi: `?demo_error=1` khiến lớp dữ liệu demo ném lỗi (chỉ ở chế độ demo) để xem `error.tsx`.
- `supabase/seed.sql` chứa danh mục và các tin demo tương tự. Ngày lịch dùng `now() at time zone 'Asia/Tokyo'` cộng thêm khoảng thời gian.

## 12. Kiểm thử và tiêu chí hoàn thành

- **vitest:**
  - Chuẩn hóa chuỗi và alias (Tokyo / 東京 / 東京都).
  - Mã tin có số 0 ở đầu.
  - Định dạng lương và trường hợp thiếu lương.
  - Định dạng JST và giờ VN.
  - Kiểm tra form, magic bytes, trình đọc CSV và các lỗi theo dòng.
  - Chuyển đổi tham số URL ↔ bộ lọc.
  - `searchJobs` demo cho các tổ hợp bộ lọc.
- **So khớp hai nguồn:** chạy `search_jobs` SQL trên Postgres cục bộ với seed, so với bản demo ở 10 tổ hợp bộ lọc.
- **`tests/rls.sql`** trên Postgres cục bộ, có giả lập `auth.uid()`:
  - `anon` không đọc được `applications`, `application_notes`, tin `draft`, hay object trong `storage.objects` thuộc bucket `cvs`.
  - Người đã đăng nhập nhưng không phải admin cũng bị chặn.
  - Admin đọc được.
- **Playwright** (chạy `next build` + `start` ở chế độ demo):
  - Tìm theo mã tin.
  - Kết hợp nhiều bộ lọc, xóa bộ lọc, giữ trạng thái URL khi back.
  - Mở trực tiếp trang chi tiết; slug sai thì chuyển hướng.
  - Form gửi một lần dù bấm nhiều lần, và ở chế độ demo không hiện thành công.
  - Panel lọc trên mobile.
  - Không tràn ngang ở 360/390/768/1024/1440 px.
  - Thao tác bằng bàn phím: Tab đến bộ lọc, Enter, focus hiển thị rõ.
  - `/admin` chuyển hướng sang login khi chưa đăng nhập.
- **Không kiểm thử được trong phiên này** (ghi trong README):
  - Luồng upload thật lên Storage.
  - Đăng nhập Supabase Auth thật.
  - Đăng xuất làm mất quyền trên Supabase thật (chỉ chứng minh bằng RLS cục bộ và kiểm tra code).

## 13. Bàn giao

- README tiếng Việt:
  - chạy local,
  - biến môi trường,
  - tạo dự án Supabase và chạy migration/seed,
  - tạo quản trị viên (tạo user trong Dashboard → `insert into admins`),
  - triển khai lên Vercel,
  - danh sách kiểm tra đã chạy và các giới hạn còn lại.
- `.env.example` không chứa bí mật.
- Placeholder thương hiệu và liên hệ nằm trong `lib/site-defaults.ts` (dùng khi chưa có `site_settings`).

## 14. Quyết định của người lập trình (chủ dự án có thể sửa)

- Nghĩa của "TC riêng" chưa rõ nên không seed; quản trị viên tự thêm.
- Thời hạn lưu hồ sơ mặc định 12 tháng.
- Không gửi email thông báo hồ sơ mới; quản trị viên xem trong `/admin`.
- Bộ lọc tỉnh hiển thị đủ 47 tỉnh theo vùng, không kèm số đếm (tránh thêm truy vấn).
- Bộ lọc tiếng Nhật là "mức của tôi", tức chọn mức ứng viên đang có; không phải lọc theo yêu cầu chính xác của tin.
- Không dùng thư viện UI, markdown, zod hay CSV; tự viết phần cần thiết, có test.
