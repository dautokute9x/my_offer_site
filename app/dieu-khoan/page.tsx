import type { Metadata } from "next";
import PolicyDraftBanner from "@/components/PolicyDraftBanner";
import { getSiteSettings } from "@/lib/data";

export const metadata: Metadata = { title: "Điều khoản sử dụng", alternates: { canonical: "/dieu-khoan" } };

export default async function Page() {
  const { policiesConfirmed, retentionMonths } = await getSiteSettings();
  return (
    <article className="prose-body space-y-5">
      <h1 className="text-[length:var(--text-display-s)]">Điều khoản sử dụng</h1>
      {!policiesConfirmed && <PolicyDraftBanner />}
      <h2 className="pt-4 text-[length:var(--text-title)]">Phạm vi sử dụng</h2>
      <p>Website cung cấp thông tin việc làm để tham khảo. Việc gửi hồ sơ hoặc đăng ký quan tâm không đồng nghĩa với việc được nhận vào làm hay giữ suất phỏng vấn.</p>
      <h2 className="pt-4 text-[length:var(--text-title)]">Thông tin tin tuyển dụng</h2>
      <p>Thông tin có thể thay đổi theo yêu cầu của nhà tuyển dụng. Vui lòng xác nhận lại với bên tư vấn trước khi quyết định.</p>
      <h2 className="pt-4 text-[length:var(--text-title)]">Dữ liệu cá nhân</h2>
      <p>Hồ sơ của bạn được lưu tối đa {retentionMonths} tháng; xem thêm Chính sách bảo mật.</p>
    </article>
  );
}
