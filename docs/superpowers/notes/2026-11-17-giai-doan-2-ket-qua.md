# Giai đoạn 2: kết quả và quyết định

Toàn bộ thay đổi nằm trên nhánh `feature/website-v1`. Kiểm tra cuối ngày 17/11/2026:

| Hạng mục | Kết quả |
|---|---|
| Unit test | 190 đạt (25 test so khớp database chạy riêng trong `db:test`) |
| `npm run db:test` | đạt, so khớp 25/25 |
| Lint, `tsc` | sạch |
| Build | đạt |
| Kiểm thử trình duyệt (e2e) | 35/35 ở chế độ demo |

## Quyết định đã đưa ra khi triển khai

### Cấu trúc dữ liệu và tìm kiếm

- `jobs.id` là số tự tăng (`bigint identity`), không phải UUID. Mã tin là duy nhất, không phân biệt hoa thường (unique index trên `lower(code)`). Mọi chỗ tra mã đều so không phân biệt hoa thường.
- `norm_text` không dùng `unaccent`. Hàm tách dấu bằng NFD, xóa các dấu trong khoảng U+0300–036F, bỏ U+FEFF rồi ghép lại bằng NFC. Cách này cho kết quả giống hệt hàm TS và giữ nguyên dấu `゛`/`゜` của kana.
- Các hàm công khai chỉ trả các cột được liệt kê rõ. Người dùng ẩn danh đọc thẳng bảng `jobs` vẫn thấy `search_text`, `translation_source_hash`, `salary_needs_review`. Rủi ro này được chấp nhận vì dữ liệu ít giá trị.
- Trang chi tiết tin render động, không dùng ISR.

### Hồ sơ ứng tuyển và CV

- Mỗi lần gửi lại khi hồ sơ còn ở `pending_upload`:
  - CV được lưu vào một đường dẫn mới, không ghi đè;
  - các tệp chưa xác minh trước đó bị xóa;
  - tối đa 5 lần gửi lại.
- Bước `complete` chỉ xác nhận khi đường dẫn CV của hồ sơ vẫn khớp. Sau khi xác nhận, các tệp cũ được dọn.
- Bucket `cvs` giới hạn 10 MB và chỉ nhận các loại tệp cho phép.
- `pending_upload` chỉ hệ thống được đặt. Quản trị viên không đặt và không gỡ được trạng thái này.
- Lệnh dọn hồ sơ xóa dòng trước (có kiểm tra lại điều kiện), sau đó mới xóa tệp. Mỗi lần bấm xử lý tối đa 200 hồ sơ.
- Phiên bản nội dung đồng ý do server lấy từ `site_settings`, không lấy từ trình duyệt.

### Quản trị

- Tài khoản không phải quản trị viên bị đăng xuất rồi chuyển về `/admin/login?error=forbidden`.
- Lỗi khi gọi `is_admin` thì ném lỗi, không đăng xuất.
- `safeNext` chỉ cho phép đường dẫn bắt đầu bằng `/admin` trên cùng origin.

### Nhập CSV

- Dòng có mã tin đã tồn tại sẽ ghi đè toàn bộ trường, có cảnh báo trước khi nhập. Riêng lịch phỏng vấn chỉ được thêm.
- `import_jobs` chạy với `SECURITY DEFINER`, chỉ kiểm tra `is_admin()` một lần, để vừa giới hạn 8 giây mỗi câu lệnh của Supabase. Đã kiểm chứng: người ẩn danh và người không phải quản trị bị từ chối; danh sách cột được phép ghi vẫn giữ nguyên.
- Lệnh này đặt `search_path` là `public, pg_temp`. Cần xác nhận trên Supabase thật rằng `authenticated` không có quyền `CREATE` trên schema `public`.

## Phải kiểm tra trên Supabase thật (Giai đoạn 3)

Danh sách kiểm tra sau triển khai nằm trong `docs/huong-dan-trien-khai.md`. Những điểm sau chưa thể kiểm chứng trong môi trường hiện tại:

- **Đăng nhập:** đăng nhập và đăng xuất bằng Supabase Auth thật.
- **Storage:**
  - Storage có nhận lệnh PUT tải thô vào signed upload URL không;
  - `list()` có trả `metadata.size` không.
- **PostgREST:** các truy vấn, gồm các bộ lọc `.or()`.
- **Phân quyền trên Supabase thật:**
  - RLS và quyền mặc định;
  - `has_schema_privilege('authenticated','public','CREATE')` phải trả `false`.
- **Hiệu năng:** thời gian nhập CSV 2000 dòng (cục bộ mất khoảng 2–4 giây).
- **Giới hạn số hồ sơ theo IP:** dựa vào header `X-Forwarded-For`, nên có thể bị giả mạo nếu chạy sau proxy không tin cậy.

## Lỗi nhỏ còn để lại (không chặn)

- **Dữ liệu và thao tác:**
  - cập nhật hoặc xóa bản ghi không tồn tại vẫn báo thành công;
  - ghi chú nội bộ hiển thị tác giả dạng "QTV <uuid>";
  - form lịch phỏng vấn mất dữ liệu đã nhập khi có lỗi.
- **Kiểm thử còn thiếu:**
  - proxy chuyển hướng chưa có test;
  - phần tính tiền tố đường dẫn của `removeObjectsAt` chưa có unit test riêng;
  - route `complete` trả 400 thay vì 413 khi tệp quá lớn.
- **Vận hành:**
  - chưa có dọn hồ sơ tự động theo lịch (có thể dùng pg_cron hoặc route chạy định kỳ);
  - hướng dẫn triển khai nên bổ sung: dừng lại ở migration lỗi đầu tiên; đổi biến `NEXT_PUBLIC_*` thì phải triển khai lại; cấu hình Site URL của Supabase Auth.
