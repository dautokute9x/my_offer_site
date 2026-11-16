# Giai đoạn 1 — kết quả và việc chuyển sang Giai đoạn 2

Nhánh: `feature/website-v1`. Kiểm tra cuối (16/11/2026):

- unit 67/67;
- e2e Playwright 25/25;
- `eslint` sạch, `tsc --noEmit` sạch, `next build` OK.

## Quyết định đã đưa ra khi triển khai

- Tham số `nghe` dùng slug nghề, `luong` dùng đơn vị 万円 (theo Global Constraints của kế hoạch).
- Slug 5 nhóm nghề: `dien`, `xay-dung`, `quan-ly-thi-cong`, `cad-co-khi`, `san-xuat`.
- Tắt `cacheComponents`/`partialPrefetching` (mặc định của create-next-app 16.4.6) để dùng ISR và dữ liệu demo tính theo thời điểm request.
- Trang danh sách nằm trong route group `app/viec-lam/(list)/`. Nhờ vậy trang chi tiết trả 308/404 thật thay vì 200.
- Có skip link ở đầu trang. Ô tìm kiếm đứng trước bộ lọc trong DOM, nên đến được bằng bàn phím trong vòng 30 lần Tab.
- Kiểm tra form ứng tuyển:
  - `consent` phải đúng `true`, `jpLevel` phải thuộc danh sách cho phép;
  - docx/xlsx chấp nhận thêm MIME `application/zip` và `application/x-zip-compressed`;
  - server sẽ kiểm tra magic bytes của tệp ở Giai đoạn 2.
- Khi lương min = max thì chỉ hiển thị một giá trị.
- Truy vấn `412` không được coi là khớp chính xác mã `00412`, chỉ là khớp một phần.

## Phải làm ở Giai đoạn 2

Bắt buộc:

- **Chuẩn hóa chuỗi:** SQL `norm_text()` phải ra cùng kết quả với `normText()`, tức là NFKC → lower → NFD bỏ dấu → đ→d → gộp khoảng trắng → **NFC**.
- **API `POST /api/applications/start`:**
  - nhánh JSON không được tin metadata tệp do client gửi;
  - thêm `consentVersion` vào `ApplicationInput`;
  - giới hạn `content-length` trước khi gọi `formData()`;
  - lưu số điện thoại đã chuẩn hóa.
- **JSON-LD:** đã yêu cầu `publishedAt`. Kiểm tra lại với dữ liệu thật trước khi đăng tin thật đầu tiên.
- **Giới hạn độ dài email và tên tệp:** thêm trước khi lưu dữ liệu.
- **`BilingualBlock`:** khi `translationStatus = none` và `ja` null thì đang render `<p lang=ja>` rỗng. Sửa trước khi nhập dữ liệu thật.
- **`NEXT_PUBLIC_SITE_URL`:** thiếu biến này khi build production thì canonical sẽ trỏ về `localhost`. Nên làm build thất bại trong trường hợp đó.
- **Dữ liệu demo:** thêm một tin `draft`. Thêm test so khớp kết quả lọc giữa nguồn demo và Supabase.

Nên làm:

- `listUpcomingInterviews` chỉ trả các trường cần thiết, thay vì cả `Job`.

## Lỗi nhỏ còn để lại (không chặn)

- **Lưới và kích thước bấm:** checkbox ở bộ lọc lịch phỏng vấn cao 36px; link nav trên desktop chưa đạt 44px; skip link gây xô lệch bố cục khoảng 44px khi được focus.
- **Bộ lọc việc làm:** chưa có chỉ báo đang tải khi đổi bộ lọc; checkbox có thể bỏ tick thoáng qua khi kết quả trung gian về; đổi sắp xếp vẫn phải bấm nút "Tìm".
- **Chế độ poster:** chưa có công tắc giờ Việt Nam; chữ "PV" chưa được giải thích.
- **Accessibility:** emoji chưa `aria-hidden`; tên tỉnh tiếng Nhật trong bộ lọc chưa có `lang="ja"`; trên desktop panel bộ lọc vẫn bị đọc là "dialog".
- **Test còn mỏng:** giờ 00:30 JST; làm tròn 333333 → 33,33; tham số ngày của trang lịch phỏng vấn; test slug.
