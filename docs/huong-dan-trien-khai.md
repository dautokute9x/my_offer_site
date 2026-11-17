# Hướng dẫn triển khai (Supabase + Vercel)

Làm lần lượt 9 bước. Thay các giá trị trong `[...]` bằng giá trị của bạn.

## 1. Tạo dự án Supabase
Tạo project mới trên supabase.com, chọn region gần người dùng, đặt mật khẩu DB và lưu lại. Ghi lại ở Project Settings > API: **Project URL**, khóa **anon**, khóa **service_role** (bí mật).

## 2. Extension `pg_trgm`
Không cần làm gì: migration 0001 tự chạy `create extension if not exists pg_trgm with schema extensions` (Supabase đã có schema `extensions`). Nếu SQL Editor báo thiếu quyền tạo extension, bật `pg_trgm` ở Database > Extensions, **schema `extensions`**, rồi chạy lại 0001.

## 3. Chạy migration theo thứ tự
Chạy từng tệp trong `supabase/migrations/` theo đúng thứ tự **0001 → 0002 → 0003 → 0004 → 0005 → 0006**: dán nội dung vào SQL Editor và Run, hoặc dùng Supabase CLI (`supabase link` rồi `supabase db push`). Đừng chạy lại migration đã chạy. Nếu một migration báo lỗi, **dừng lại**, đừng chạy tệp tiếp theo: sửa nguyên nhân rồi chạy lại đúng tệp đó. Migration 0001 tạo bucket `cvs` (private), 0003 đặt giới hạn 10 MB và loại tệp cho bucket.

## 4. Seed dữ liệu
- `supabase/seed_catalog.sql`: danh mục (tỉnh, ngành nghề...) và cài đặt site. Chạy **một lần**; chạy lại sẽ lỗi unique (an toàn, không ghi gì).
- `supabase/seed_demo.sql` (tùy chọn): các tin demo hư cấu (`is_demo = true`) để thử. Chạy lại sẽ thay toàn bộ tin demo. Để xóa tin demo sau này: đăng nhập `/admin/noi-dung`, mục **Dọn tin demo**.

## 5. Tắt đăng ký công khai
Authentication > Sign In / Providers (hoặc Settings): tắt **Allow new users to sign up**, để chỉ người bạn tạo mới đăng nhập được.

Cũng ở Authentication > URL Configuration: đặt **Site URL** là `https://[ten-mien]` (địa chỉ website thật), để link trong email của Supabase không trỏ về `localhost`.

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

Deploy. Biến `NEXT_PUBLIC_*` được gắn vào mã lúc build: đổi giá trị thì phải **Redeploy** mới có hiệu lực. Sau đó vào `/admin/noi-dung` điền thương hiệu, liên hệ, nội dung chính sách và chỉ bật `policiesConfirmed` khi đã rà soát.

## 9. Kiểm tra sau triển khai
- [ ] Gửi thử một hồ sơ với **PDF thật** ở trang một tin; nhận được mã `HS-xxxxxx`.
- [ ] Đăng nhập `/admin`, mở **Hồ sơ**, thấy hồ sơ vừa gửi.
- [ ] Tải CV từ hồ sơ đó, mở được.
- [ ] Thử tải lên tệp `.exe` đổi tên thành `.pdf`: phải bị **từ chối**.
- [ ] Đăng xuất, mở lại `/admin`: bị chuyển về trang đăng nhập.
- [ ] Gọi REST ẩn danh, ví dụ `curl "[SUPABASE_URL]/rest/v1/applications?select=*" -H "apikey: [ANON_KEY]"`: không trả dòng nào (rỗng hoặc bị từ chối).
- [ ] Xóa hồ sơ thử (trang chi tiết hồ sơ, "Xóa hồ sơ") khi xong.

Các mục này cũng kiểm các giới hạn chưa chứng minh được ở README (đăng nhập Auth, PUT signed URL, `list()` metadata.size, PostgREST, RLS thật). Lỗi ở đây cần xử lý trước khi nhận hồ sơ thật.

## Bảo vệ dữ liệu cá nhân (Việt Nam: Luật 91/2025/QH15, Nghị định 356/2025/NĐ-CP; Nhật Bản: APPI)

Luật Bảo vệ dữ liệu cá nhân và Nghị định 356/2025/NĐ-CP có hiệu lực từ 01/01/2026, thay Nghị định 13/2023. Website đã có sẵn: chính sách bảo mật mẫu, ô đồng ý ghi rõ mục đích và nơi lưu, lưu phiên bản đồng ý theo từng hồ sơ, xóa hồ sơ theo yêu cầu, dọn hồ sơ quá hạn và hồ sơ không trúng tuyển (Điều 25). Phần dưới là việc **chủ site phải tự làm**; danh sách này không thay cho tư vấn pháp lý.

- [ ] Nhờ luật sư rà soát `/chinh-sach-bao-mat` và `/dieu-khoan`. Sau đó vào `/admin/noi-dung`: đổi **phiên bản đồng ý** (ví dụ `v1-2026-11`) và bật **policiesConfirmed**.
- [ ] Lập **hồ sơ đánh giá tác động xử lý dữ liệu cá nhân**. Dữ liệu ứng viên lưu trên máy chủ đám mây ngoài Việt Nam (Supabase, Vercel), nên cần thêm **hồ sơ đánh giá tác động chuyển dữ liệu ra nước ngoài**, nộp cơ quan chuyên trách bảo vệ dữ liệu cá nhân (Cục A05, Bộ Công an); các nguồn tổng hợp nêu hạn 60 ngày kể từ khi bắt đầu chuyển. Doanh nghiệp nhỏ, khởi nghiệp có thể được miễn một số nghĩa vụ trong 5 năm đầu: kiểm tra điều kiện trong Nghị định 356.
- [ ] Chỉ định người hoặc bộ phận phụ trách bảo vệ dữ liệu cá nhân (hoặc thuê dịch vụ bên ngoài).
- [ ] Ký thỏa thuận xử lý dữ liệu với nhà tuyển dụng tại Nhật trước khi gửi hồ sơ ứng viên cho họ.
- [ ] Quy trình nhận yêu cầu của ứng viên (xem, sửa, xóa, rút lại đồng ý): xác minh qua mã hồ sơ `HS-xxxxxx`, xử lý trong thời hạn luật định; xóa ở `/admin/ho-so/[id]` → **Xóa hồ sơ**.
- [ ] Quy trình xử lý sự cố lộ, mất dữ liệu: ai phát hiện, ai thông báo cơ quan chuyên trách và ứng viên.
- [ ] Nếu đổi khu vực máy chủ Supabase hoặc Vercel, sửa tên nước ở mục 4 của `/chinh-sach-bao-mat` (hiện ghi Ấn Độ, khu vực Mumbai, và Hoa Kỳ).

**Phía Nhật Bản (APPI, 個人情報保護法)** khi hồ sơ được gửi cho nhà tuyển dụng tại Nhật:

- [ ] Thỏa thuận với nhà tuyển dụng ghi rõ: chỉ dùng hồ sơ cho việc tuyển dụng đó, không cung cấp cho bên thứ ba khi ứng viên chưa đồng ý, xóa hồ sơ khi không tuyển, báo ngay cho bạn khi có sự cố.
- [ ] Trước mỗi lần gửi hồ sơ: báo ứng viên tên nhà tuyển dụng và lấy đồng ý (website đã cam kết điều này ở mục 5 chính sách).
- [ ] Nếu đơn vị vận hành website là pháp nhân Nhật Bản, hoặc có văn phòng tại Nhật xử lý hồ sơ: APPI áp dụng trực tiếp. Cần chính sách bảo mật tiếng Nhật, công bố mục đích sử dụng, thủ tục nhận yêu cầu công khai, sửa, ngừng sử dụng, và quy trình báo cáo sự cố với PPC (các bài tổng hợp nêu: báo cáo sơ bộ khoảng 3–5 ngày, báo cáo chính thức trong 30 ngày, 60 ngày nếu do hành vi cố ý).
- [ ] Luật sửa đổi APPI (Luật số 56 năm 2026) đã được ban hành, hiệu lực theo từng giai đoạn: kiểm tra lại các mốc với PPC khi có hiệu lực.
- [ ] Ngoài bảo vệ dữ liệu: kiểm tra giấy phép giới thiệu việc làm tại Nhật (職業安定法, giấy phép 有料職業紹介事業) và quy định của Việt Nam về đưa người lao động đi làm việc ở nước ngoài (Luật 69/2020/QH14), nếu mô hình kinh doanh của bạn thuộc diện phải có giấy phép.
- [ ] Chuyển hồ sơ không trúng tuyển sang trạng thái **Không phù hợp** và dọn định kỳ (mục dưới), trừ khi ứng viên đồng ý cho lưu lại.

## Dọn hồ sơ quá hạn lưu
Hồ sơ được giữ `retentionMonths` tháng (mặc định 12, chỉnh ở `/admin/noi-dung`). Định kỳ vào `/admin/ho-so`, mục **Dọn dẹp**, bấm **Dọn hồ sơ quá hạn lưu**: xóa kèm CV các hồ sơ quá hạn, hồ sơ ở trạng thái "Không phù hợp" hoặc "Rút hồ sơ" (Điều 25 Luật 91/2025/QH15), và hồ sơ chờ tải CV quá 24 giờ. Thao tác không có lịch tự động và không hoàn tác được.

## Sao lưu
Hồ sơ chứa dữ liệu cá nhân. Bật/kiểm tra sao lưu DB của gói Supabase đang dùng; sao lưu DB không gồm tệp trong Storage (CV), cần tự sao lưu nếu cần. Giữ sao lưu theo cùng thời hạn lưu hồ sơ.
