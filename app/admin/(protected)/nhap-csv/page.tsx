import { CsvImport } from "@/components/admin/CsvImport";
import { requireAdmin } from "@/lib/auth";
import { isDemoMode } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CsvAdmin() {
  if (isDemoMode()) return null; // layout đã hiện thông báo demo
  await requireAdmin("/admin/nhap-csv");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nhập tin bằng CSV</h1>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        <li>Mã tin đã có (không phân biệt hoa thường) sẽ được <strong>cập nhật</strong>, mã mới sẽ được tạo. Nếu còn bất kỳ lỗi nào, không dòng nào được ghi.</li>
        <li>Tỉnh, ngành nghề, kỹ năng, phúc lợi: nhiều giá trị cách nhau bằng <code>|</code>; khớp theo tên hoặc tên khác (tỉnh còn khớp mã JIS, ngành theo slug).</li>
        <li>Lương tháng (<code>monthly_*_yen</code>): số yên (từ 10000) hoặc có hậu tố 万/万円 (vd <code>25万</code>). Thu nhập năm (<code>annual_*_man</code>): số theo 万円, vd <code>350</code>, <code>350万</code>, <code>350 万円</code>.</li>
        <li><code>salary_negotiable</code>, <code>driver_license_required</code>, <code>company_car_provided</code>: <code>co</code> / <code>khong</code> / để trống.</li>
        <li>Lịch phỏng vấn (<code>interviews</code>): <code>YYYY-MM-DD HH:mm</code> hoặc <code>YYYY/MM/DD HH:mm</code> theo giờ Nhật, cách nhau bằng <code>|</code>; chỉ thêm mới, bỏ qua lịch trùng giờ.</li>
        <li>Giữ nguyên số 0 ở đầu của mã tin (Excel hay bỏ: hãy đặt cột mã kiểu văn bản).</li>
      </ul>
      <CsvImport />
    </div>
  );
}
