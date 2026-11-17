# Website tuyển dụng kỹ sư Việt Nam tại Nhật

Website việc làm cho kỹ sư người Việt muốn làm việc tại Nhật (Next.js 16 App Router, TypeScript, Tailwind 4, Supabase). Có: danh sách và tìm kiếm việc làm, trang chi tiết song ngữ Việt–Nhật, lịch phỏng vấn (giờ Nhật), form ứng tuyển kèm CV, và trang quản trị `/admin` (tin tuyển dụng, hồ sơ, danh mục, nhập CSV, nội dung và liên hệ).

Nếu không cấu hình Supabase, site chạy ở **chế độ demo** với dữ liệu mẫu hư cấu.

## Chạy local (chế độ demo)

```bash
npm install
npm run dev   # http://localhost:3000
```

Không cần biến môi trường. Ở chế độ demo, form ứng tuyển không lưu hồ sơ thật và `/admin` chỉ hiện thông báo demo.

## Biến môi trường

Mẫu ở `.env.example` (sao chép thành `.env.local`).

| Biến | Phạm vi | Ý nghĩa |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | công khai | Địa chỉ website (sitemap, canonical). Thiếu thì canonical trỏ về `http://localhost:3000`. |
| `NEXT_PUBLIC_SUPABASE_URL` | công khai | URL dự án Supabase. **Để trống = chế độ demo.** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | công khai | Khóa anon; bắt buộc khi đã đặt URL (thiếu thì `proxy.ts` báo lỗi). |
| `SUPABASE_SERVICE_ROLE_KEY` | **chỉ server** | Khóa service role, dùng cho gửi hồ sơ/CV. Không thêm `NEXT_PUBLIC_`. |
| `IP_HASH_SALT` | **chỉ server** | Chuỗi ngẫu nhiên để băm IP khi chống spam; thiếu thì lưu hồ sơ báo lỗi. |

## Lệnh

| Lệnh | Mục đích |
|---|---|
| `npm test` | Unit test (vitest). |
| `npm run db:test` | Test DB: dựng Postgres 16 cục bộ (cổng 54329, cần binaries ở `/usr/lib/postgresql/16/bin`, xem `scripts/db-local.sh`), chạy migration + seed, các tệp `tests/db/*.sql`, rồi test so khớp demo/SQL. |
| `npm run e2e` | Playwright (tự `build` rồi `start` ở cổng 3100; chạy ở chế độ demo). |
| `npm run lint`, `npx tsc --noEmit`, `npm run build` | Kiểm tra tĩnh và build. |
| `npm run db:gen-seed` | Sinh lại `supabase/seed_*.sql` từ dữ liệu TS. |

## Cấu trúc

- `app/` — trang công khai (`viec-lam`, `lich-phong-van`, `lien-he`, `gioi-thieu`, chính sách, điều khoản), `app/admin/` (đăng nhập, `(protected)/` các trang quản trị), `app/api/applications/{start,complete}` (gửi hồ sơ).
- `proxy.ts` — làm mới phiên Supabase và chuyển người chưa đăng nhập khỏi `/admin` (bỏ qua ở chế độ demo).
- `lib/data/` — nguồn dữ liệu: `demo.ts` (mẫu) hoặc `supabase.ts` (RPC), chọn theo `isDemoMode()`.
- `lib/applications/`, `lib/admin/`, `lib/supabase/` — xử lý hồ sơ, nhập liệu quản trị, các client Supabase.
- `supabase/migrations/0001–0006` — schema, RLS, API; `supabase/seed_catalog.sql`, `seed_demo.sql` — dữ liệu.
- `tests/unit`, `tests/db`, `tests/e2e` — các bộ test.
- `docs/huong-dan-trien-khai.md` — **hướng dẫn triển khai Supabase + Vercel**.

## Nội dung chủ site phải điền

Mặc định (`lib/site-defaults.ts`) là placeholder dạng `[...]`; placeholder bị ẩn khỏi giao diện. Điền ở `/admin/noi-dung` (Nội dung & liên hệ):

- thương hiệu, tên miền, email, điện thoại, Zalo, link Facebook, link nhóm Zalo, giới thiệu;
- phiên bản đồng ý (`consentVersion`) và số tháng lưu hồ sơ (`retentionMonths`, mặc định 12);
- **`policiesConfirmed`**: mặc định `false`. Chính sách bảo mật và điều khoản (`/chinh-sach-bao-mat`, `/dieu-khoan`) là nội dung mẫu chưa được xác nhận; chỉ bật khi chủ site đã rà soát nội dung chính sách và pháp lý.

Thông tin nhà tuyển dụng, tin và dữ liệu demo đều là hư cấu.

## Đã kiểm thử

Chạy ngày 16/11/2026 trên nhánh `feature/website-v1`:

- `npm test`: 184 passed, 25 skipped (25 test so khớp cần Postgres, chạy trong `db:test`); 25 tệp pass, 1 tệp bỏ qua.
- `npm run db:test`: 6 tệp SQL (`smoke`, `schema`, `rls`, `applications`, `admin_jobs`, `import`) chạy không lỗi (`ON_ERROR_STOP`), cộng 25/25 test so khớp demo/SQL (`parity`) — trên Postgres cục bộ, không phải Supabase thật.
- `npm run lint`, `npx tsc --noEmit`: sạch.
- `npm run build`: thành công.
- `npx playwright test --trace off`: 35/35 pass (chế độ demo).

Lời gọi Supabase JS được test bằng mock.

## Giới hạn còn lại

Chưa kiểm chứng được khi chưa có dự án Supabase thật (cần chạy checklist ở `docs/huong-dan-trien-khai.md` sau khi triển khai):

- luồng đăng nhập Supabase Auth và chuyển hướng `/admin`;
- upload CV bằng `PUT` thô tới signed URL có được Storage thật chấp nhận không; `list()` có trả `metadata.size` không (route `complete` dựa vào đây để kiểm tra tệp);
- các truy vấn qua PostgREST, gồm bộ lọc `.or()`;
- RLS trên nền tảng thật (đã kiểm bằng Postgres cục bộ với stub vai trò Supabase);
- chống spam theo IP lấy từ `X-Forwarded-For`/`X-Real-IP`: có thể bị giả mạo nếu chạy sau proxy không đáng tin (trên Vercel header do nền tảng đặt).

Lưu ý vận hành (lỗi nhỏ đã biết, chưa sửa):

- cập nhật/xóa bản ghi không tồn tại có thể báo thành công (0 dòng bị ảnh hưởng);
- nhập CSV 2000 dòng mất ≈2 giây trên Postgres cục bộ (giới hạn statement của Supabase là 8 giây; chưa đo trên Supabase thật); CSV ghi đè toàn bộ trường của tin đã có (ô trống xóa nội dung; lịch phỏng vấn chỉ được thêm);
- "Dọn hồ sơ quá hạn lưu" xử lý tối đa 200 hồ sơ (≈20 giây) mỗi lần bấm, còn tồn thì bấm lại; chưa có dọn tự động theo lịch; nếu xóa CV lỗi thì có thể còn tệp mồ côi trong Storage (ghi log);
- ghi chú nội bộ hiển thị tác giả dạng "QTV <uuid>"; chưa có `Referrer-Policy`;
- tin chi tiết render động (không ISR), mỗi lượt xem gọi một RPC;
- nhiều lỗi nhỏ về giao diện/accessibility của Giai đoạn 1 xem `docs/superpowers/notes/2026-11-16-giai-doan-1-ket-qua.md`.
