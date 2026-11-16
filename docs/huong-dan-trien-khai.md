# Hướng dẫn triển khai (Supabase + Vercel)

Làm lần lượt 9 bước. Thay các giá trị trong `[...]` bằng giá trị của bạn.

## 1. Tạo dự án Supabase
Tạo project mới trên supabase.com, chọn region gần người dùng, đặt mật khẩu DB và lưu lại. Ghi lại ở Project Settings > API: **Project URL**, khóa **anon**, khóa **service_role** (bí mật).

## 2. Bật extension `pg_trgm` và `unaccent`
Database > Extensions: bật `pg_trgm` và `unaccent`, **schema `extensions`** (migration dùng `extensions.gin_trgm_ops`). Hoặc trong SQL Editor:

```sql
create extension if not exists pg_trgm schema extensions;
create extension if not exists unaccent schema extensions;
```

## 3. Chạy migration theo thứ tự
Chạy từng tệp trong `supabase/migrations/` theo đúng thứ tự **0001 → 0002 → 0003 → 0004 → 0005**: dán nội dung vào SQL Editor và Run, hoặc dùng Supabase CLI (`supabase link` rồi `supabase db push`). Đừng chạy lại migration đã chạy. Migration 0001 tạo bucket `cvs` (private), 0003 đặt giới hạn 10 MB và loại tệp cho bucket.

## 4. Seed dữ liệu
- `supabase/seed_catalog.sql`: danh mục (tỉnh, ngành nghề...) và cài đặt site. Chạy **một lần**; chạy lại sẽ lỗi unique (an toàn, không ghi gì).
- `supabase/seed_demo.sql` (tùy chọn): các tin demo hư cấu (`is_demo = true`) để thử. Chạy lại sẽ thay toàn bộ tin demo. Để xóa tin demo sau này: đăng nhập `/admin/noi-dung`, mục **Dọn tin demo**.

## 5. Tắt đăng ký công khai
Authentication > Sign In / Providers (hoặc Settings): tắt **Allow new users to sign up**, để chỉ người bạn tạo mới đăng nhập được.

## 6. Tạo tài khoản quản trị
Authentication > Users > Add user: nhập email và mật khẩu (tick auto-confirm). Rồi trong SQL Editor:

```sql
insert into public.admins(user_id) select id from auth.users where email = '[email-quan-tri]';
```

Người không có trong `admins` đăng nhập được Supabase nhưng bị đăng xuất khỏi `/admin`.

## 7. Kiểm tra bucket `cvs`
Storage > bucket `cvs`: phải ở chế độ **Private** (không Public), giới hạn tệp **10 MB**.

## 8. Biến môi trường trên Vercel
Import repo vào Vercel (Next.js) và đặt trong Settings > Environment Variables (xem bảng ở README):

| Biến | Giá trị |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://[ten-mien]` |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | khóa anon |
| `SUPABASE_SERVICE_ROLE_KEY` | khóa service_role (chỉ server) |
| `IP_HASH_SALT` | chuỗi ngẫu nhiên dài (`openssl rand -hex 32`) |

Deploy. Sau đó vào `/admin/noi-dung` điền thương hiệu, liên hệ, nội dung chính sách và chỉ bật `policiesConfirmed` khi đã rà soát.

## 9. Kiểm tra sau triển khai
- [ ] Gửi thử một hồ sơ với **PDF thật** ở trang một tin; nhận được mã `HS-xxxxxx`.
- [ ] Đăng nhập `/admin`, mở **Hồ sơ**, thấy hồ sơ vừa gửi.
- [ ] Tải CV từ hồ sơ đó, mở được.
- [ ] Thử tải lên tệp `.exe` đổi tên thành `.pdf`: phải bị **từ chối**.
- [ ] Đăng xuất, mở lại `/admin`: bị chuyển về trang đăng nhập.
- [ ] Gọi REST ẩn danh, ví dụ `curl "[SUPABASE_URL]/rest/v1/applications?select=*" -H "apikey: [ANON_KEY]"`: không trả dòng nào (rỗng hoặc bị từ chối).
- [ ] Xóa hồ sơ thử (trang chi tiết hồ sơ, "Xóa hồ sơ") khi xong.

Các mục này cũng kiểm các giới hạn chưa chứng minh được ở README (đăng nhập Auth, PUT signed URL, `list()` metadata.size, PostgREST, RLS thật). Lỗi ở đây cần xử lý trước khi nhận hồ sơ thật.

## Dọn hồ sơ quá hạn lưu
Hồ sơ được giữ `retentionMonths` tháng (mặc định 12, chỉnh ở `/admin/noi-dung`). Định kỳ vào `/admin/ho-so`, mục **Dọn dẹp**, bấm **Dọn hồ sơ quá hạn lưu**: xóa hồ sơ quá hạn và hồ sơ chờ tải CV quá 24 giờ, kèm CV. Thao tác không có lịch tự động và không hoàn tác được.

## Sao lưu
Hồ sơ chứa dữ liệu cá nhân. Bật/kiểm tra sao lưu DB của gói Supabase đang dùng; sao lưu DB không gồm tệp trong Storage (CV), cần tự sao lưu nếu cần. Giữ sao lưu theo cùng thời hạn lưu hồ sơ.
