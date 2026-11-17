import type { Metadata } from "next";
import Link from "next/link";
import PolicyDraftBanner from "@/components/PolicyDraftBanner";
import { contactLinks } from "@/lib/contact";
import { getSiteSettings } from "@/lib/data";

export const metadata: Metadata = {
  title: "Chính sách bảo mật",
  description: "Cách website thu thập, sử dụng, lưu trữ và xóa dữ liệu cá nhân của ứng viên theo Luật Bảo vệ dữ liệu cá nhân.",
  alternates: { canonical: "/chinh-sach-bao-mat" },
};

const h2 = "pt-6 text-[length:var(--text-title)]";
const list = "list-disc space-y-2 pl-6";

// Nội dung mẫu bám theo Luật 91/2025/QH15 và Nghị định 356/2025/NĐ-CP (hiệu lực 01/01/2026); chủ site cần rà soát pháp lý rồi mới bật policiesConfirmed.
export default async function Page() {
  const s = await getSiteSettings();
  const { policiesConfirmed, retentionMonths } = s;
  const contacts = contactLinks(s);
  return (
    <article className="prose-body space-y-5">
      <h1 className="text-[length:var(--text-display-s)]">Chính sách bảo mật</h1>
      {!policiesConfirmed && <PolicyDraftBanner />}
      <p>
        Chính sách này giải thích cách {s.brandName} thu thập, sử dụng, lưu trữ và xóa dữ liệu cá nhân của bạn khi bạn gửi hồ sơ ứng tuyển
        hoặc yêu cầu tư vấn, theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP (có hiệu lực từ 01/01/2026).
      </p>

      <h2 className={h2}>1. Bên chịu trách nhiệm dữ liệu</h2>
      <p>{s.brandName} là bên kiểm soát và xử lý dữ liệu cá nhân bạn gửi qua website này.</p>
      {contacts.length > 0 ? (
        <ul className={list}>
          {contacts.map((c) => <li key={c.label}>{c.label}: {c.href ? <a href={c.href} className="link">{c.text}</a> : c.text}</li>)}
        </ul>
      ) : (
        <p>Kênh liên hệ: xem trang <Link href="/lien-he" className="link">Liên hệ</Link>.</p>
      )}

      <h2 className={h2}>2. Dữ liệu chúng tôi thu thập</h2>
      <ul className={list}>
        <li>Họ và tên; ít nhất một cách liên hệ (email, điện thoại hoặc Zalo, Facebook).</li>
        <li>Trình độ tiếng Nhật, ghi chú bạn tự nhập, mã và tên tin bạn ứng tuyển.</li>
        <li>CV (tệp PDF, Word hoặc Excel) nếu bạn đính kèm.</li>
        <li>Thời điểm và phiên bản nội dung bạn đã đồng ý.</li>
        <li>Địa chỉ IP dưới dạng mã băm một chiều, chỉ để chống gửi hồ sơ hàng loạt; chúng tôi không lưu địa chỉ IP gốc.</li>
      </ul>
      <p>
        Chúng tôi không yêu cầu dữ liệu cá nhân nhạy cảm (ví dụ: sức khỏe, tôn giáo, quan điểm chính trị, số định danh cá nhân, tài khoản ngân hàng).
        Vui lòng không đưa các thông tin này vào CV hoặc ghi chú.
      </p>

      <h2 className={h2}>3. Mục đích xử lý</h2>
      <ul className={list}>
        <li>Xem xét hồ sơ cho tin bạn ứng tuyển và liên hệ với bạn về tin đó.</li>
        <li>Tư vấn việc làm khi bạn gửi yêu cầu tư vấn.</li>
        <li>Sắp xếp lịch phỏng vấn với nhà tuyển dụng của tin bạn ứng tuyển.</li>
      </ul>
      <p>
        Hồ sơ chỉ được gửi cho nhà tuyển dụng của tin bạn ứng tuyển sau khi đã trao đổi với bạn. Chúng tôi không bán dữ liệu cá nhân
        và không dùng dữ liệu của bạn cho quảng cáo.
      </p>

      <h2 className={h2}>4. Nơi lưu trữ và chuyển dữ liệu ra nước ngoài</h2>
      <p>
        Dữ liệu và CV được lưu trên dịch vụ đám mây (Supabase, Vercel) có máy chủ đặt ngoài Việt Nam. Theo quy định, việc lưu trữ này được
        coi là chuyển dữ liệu cá nhân ra nước ngoài. CV nằm trong kho lưu trữ riêng tư: người ngoài không truy cập được, quản trị viên chỉ
        mở được qua liên kết tạm thời có hiệu lực 60 giây.
      </p>
      <p>Khi hồ sơ được gửi cho nhà tuyển dụng tại Nhật Bản, dữ liệu cũng được chuyển sang Nhật Bản.</p>

      <h2 className={h2}>5. Thời hạn lưu và xóa</h2>
      <ul className={list}>
        <li>Hồ sơ được lưu tối đa {retentionMonths} tháng kể từ ngày gửi, sau đó bị xóa cùng CV.</li>
        <li>Nếu bạn không trúng tuyển hoặc rút hồ sơ, hồ sơ và CV sẽ bị xóa, trừ khi bạn đồng ý để chúng tôi lưu lại.</li>
        <li>Hồ sơ gửi dở (chưa tải xong CV) bị xóa sau 24 giờ.</li>
        <li>Bạn có thể yêu cầu xóa bất cứ lúc nào (xem mục 6).</li>
      </ul>

      <h2 className={h2}>6. Quyền của bạn</h2>
      <p>Theo Luật Bảo vệ dữ liệu cá nhân, bạn có quyền:</p>
      <ul className={list}>
        <li>được biết về việc xử lý dữ liệu cá nhân của mình;</li>
        <li>đồng ý hoặc không đồng ý, và rút lại sự đồng ý bất cứ lúc nào;</li>
        <li>xem, chỉnh sửa hoặc yêu cầu chỉnh sửa dữ liệu của mình;</li>
        <li>yêu cầu cung cấp, yêu cầu xóa, yêu cầu hạn chế xử lý dữ liệu;</li>
        <li>phản đối việc xử lý dữ liệu;</li>
        <li>khiếu nại, tố cáo, khởi kiện theo quy định của pháp luật.</li>
      </ul>
      <p>
        Để thực hiện các quyền này, hãy liên hệ qua các kênh ở mục 1 và ghi mã hồ sơ (dạng HS-XXXXXX) bạn nhận được khi gửi.
        Chúng tôi sẽ xác minh bạn là người gửi hồ sơ và xử lý yêu cầu trong thời hạn pháp luật quy định. Rút lại sự đồng ý không ảnh hưởng
        đến việc xử lý đã thực hiện trước đó; sau khi bạn rút lại, hồ sơ sẽ bị xóa.
      </p>

      <h2 className={h2}>7. Bảo vệ dữ liệu và sự cố</h2>
      <p>
        Chỉ quản trị viên đã đăng nhập mới xem được hồ sơ; quyền truy cập được kiểm tra ở máy chủ và trong cơ sở dữ liệu. Khi phát hiện sự cố
        lộ, mất dữ liệu cá nhân, chúng tôi sẽ thông báo cho cơ quan chuyên trách bảo vệ dữ liệu cá nhân và cho bạn theo quy định.
      </p>

      <h2 className={h2}>8. Thay đổi chính sách</h2>
      <p>
        Khi chính sách thay đổi, phiên bản mới được đăng trên trang này. Mỗi hồ sơ lưu lại phiên bản nội dung mà người gửi đã đồng ý.
      </p>
    </article>
  );
}
