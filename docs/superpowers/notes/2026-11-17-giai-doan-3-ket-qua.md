# Giai đoạn 3: kiểm tra và bàn giao (phần chạy được không cần Supabase thật)

Nhánh `feature/website-v1`, ngày 17/11/2026. Chưa có dự án Supabase thật, nên phần kiểm chứng trên nền tảng thật vẫn để lại (xem cuối tệp).

## Kết quả kiểm tra

| Hạng mục | Kết quả |
|---|---|
| Unit test | 214 đạt, 25 bỏ qua (chạy trong `db:test`) |
| `npm run db:test` | 6 tệp SQL đạt, so khớp 25/25 |
| Lint, `tsc`, build | sạch / đạt |
| e2e Playwright | 37/37 (chế độ demo) |
| Tràn ngang 360/390/768/1024/1440 px, 14 trang | không có |
| axe WCAG 2.1 A/AA, desktop và 390 px | 0 lỗi |
| Bàn phím | skip link, focus hiển thị rõ, drawer lọc giữ focus, Escape đóng, trả focus |
| SEO | title/description/canonical theo trang; `/viec-lam` có lọc: `noindex,follow` + canonical `/viec-lam`; tin demo `noindex` và không có JSON-LD; sitemap không có tin đóng; robots chặn `/admin`, `/api` |
| JS tải về | khoảng 146–151 KB (nén) mỗi trang |

## Đã sửa trong giai đoạn này

- Cập nhật/xóa bản ghi không tồn tại: báo "Không tìm thấy bản ghi".
- CV quá 10 MB: trả 413.
- Header `Referrer-Policy`, `X-Content-Type-Options`.
- Build dừng nếu đã cấu hình Supabase mà thiếu `NEXT_PUBLIC_SITE_URL`.
- Form lịch phỏng vấn (quản trị) giữ giá trị khi lỗi.
- Vùng bấm 44 px; skip link không xô lệch bố cục.
- Bộ lọc báo "Đang cập nhật kết quả…"; đổi sắp xếp áp dụng ngay; desktop không còn là dialog.
- Poster có công tắc giờ Việt Nam; "PV" được giải thích; emoji `aria-hidden`; tên tỉnh tiếng Nhật `lang="ja"`.
- Thanh "Ứng tuyển" cố định trên mobile không còn che ô đang nhập (`scroll-padding-bottom`).
- Trang chủ có canonical; `og:site_name`; trang 404 có tiêu đề riêng.
- Test mới: proxy chuyển hướng, tiền tố đường dẫn CV, giờ 00:30 JST, làm tròn lương, tham số ngày, slug.
- Hướng dẫn triển khai: dừng ở migration lỗi, Site URL của Supabase Auth, redeploy khi đổi `NEXT_PUBLIC_*`.

## Đối chiếu tiêu chí hoàn thành

| # | Tiêu chí | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 | Tìm theo mã tin trả đúng công việc | Đạt | e2e tìm `#00412`; test so khớp SQL |
| 2 | Nhiều bộ lọc kết hợp đúng | Đạt | e2e + so khớp demo/SQL 10 tổ hợp |
| 3 | Xóa bộ lọc khôi phục kết quả | Đạt | e2e |
| 4 | URL giữ trạng thái, mở trực tiếp chi tiết | Đạt | e2e back/forward, slug sai → 308, không có → 404 |
| 5 | Định danh tin không đổi khi sắp xếp | Đạt | URL theo mã tin (`…-00412`), `id` cố định |
| 6 | Lương có đơn vị, kỳ tính, trạng thái thiếu | Đạt | unit `salary`; hiển thị "Chưa xác nhận" |
| 7 | Lịch phỏng vấn đúng ngày giờ, múi giờ | Đạt | unit JST/VN (gồm 00:30 JST); e2e |
| 8 | Form không gửi lặp | Đạt | e2e bấm nhiều lần; khóa idempotency ở server |
| 9 | Chỉ báo thành công sau khi lưu thật | Đạt (cục bộ) | demo báo "CHƯA được gửi"; server chỉ trả mã HS sau `complete`. Cần thử với Supabase thật |
| 10 | Người công khai không đọc được hồ sơ, CV | Đạt (cục bộ) | `tests/db/rls.sql` trên Postgres cục bộ. Cần chạy checklist trên Supabase thật |
| 11 | Đăng xuất làm mất quyền dữ liệu riêng | Chưa kiểm chứng thật | test proxy + RLS cục bộ; cần Supabase Auth thật |
| 12 | Dùng được trên điện thoại và bàn phím | Đạt | e2e, kiểm tra tràn ngang, axe, bàn phím |
| 13 | Không lỗi build hoặc runtime nghiêm trọng | Đạt | build, không có lỗi console |

## Còn lại

Cần dự án Supabase thật (chạy `docs/huong-dan-trien-khai.md` mục 9):

- đăng nhập/đăng xuất Supabase Auth;
- PUT tải CV vào signed URL, `list()` trả `metadata.size`;
- PostgREST `.or()`, RLS và quyền mặc định trên nền tảng thật;
- thời gian nhập CSV 2000 dòng.

Lỗi nhỏ không chặn:

- `og:title`/`og:url` chỉ có ở trang chi tiết tin; nhiều trang dùng chung một meta description.
- Title và `og:site_name` hiện placeholder `[TÊN THƯƠNG HIỆU]` cho tới khi điền ở `/admin/noi-dung`.
- Trên desktop phải Tab qua toàn bộ danh sách tỉnh mới tới kết quả (chưa có link "bỏ qua đến kết quả").
- Checkbox lọc có thể bỏ tick thoáng qua; bấm chip bộ lọc không hiện "Đang cập nhật".
- Panel lọc dựng lại khi cửa sổ vượt mốc `lg`, mất chữ đang gõ trong ô tìm của bộ lọc.
- Ghi chú nội bộ hiển thị tác giả "QTV <uuid>"; chưa dọn hồ sơ tự động theo lịch.
- Worktree có `node_modules` dạng symlink thì Turbopack không build được.
