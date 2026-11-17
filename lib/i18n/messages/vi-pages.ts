// Khóa "pages" của từ điển tiếng Việt. Chỉ chuỗi; biến dạng {ten}, điền bằng fmt().
// Mỗi mục chính sách: đoạn trước danh sách, danh sách, đoạn sau danh sách (mảng rỗng nếu không có).
type Section = { h: string; before: string[]; list: string[]; after: string[] };

const pages = {
  contact: {
    title: "Liên hệ",
    noChannels: "Kênh liên hệ chưa được cập nhật.",
    consult: "Nhận tư vấn",
  },
  about: {
    title: "Giới thiệu",
    placeholder: "Nội dung cần chủ website cung cấp",
    ownerTextNote: "Nội dung giới thiệu do chủ website viết bằng tiếng Việt.",
  },
  terms: {
    title: "Điều khoản sử dụng",
    scopeH: "Phạm vi sử dụng",
    scope: "Website cung cấp thông tin việc làm để tham khảo. Việc gửi hồ sơ hoặc đăng ký quan tâm không đồng nghĩa với việc được nhận vào làm hay giữ suất phỏng vấn.",
    jobsH: "Thông tin tin tuyển dụng",
    jobs: "Thông tin có thể thay đổi theo yêu cầu của nhà tuyển dụng. Vui lòng xác nhận lại với bên tư vấn trước khi quyết định.",
    dataH: "Dữ liệu cá nhân",
    dataBefore: "Dữ liệu cá nhân bạn gửi được xử lý theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và được lưu tối đa {months} tháng. Cách thu thập, lưu trữ, xóa và các quyền của bạn được nêu trong ",
    dataLink: "Chính sách bảo mật",
    dataAfter: ".",
  },
  privacy: {
    title: "Chính sách bảo mật",
    description: "Cách website thu thập, sử dụng, lưu trữ và xóa dữ liệu cá nhân của ứng viên theo Luật Bảo vệ dữ liệu cá nhân.",
    intro: "Chính sách này giải thích cách {brand} thu thập, sử dụng, lưu trữ và xóa dữ liệu cá nhân của bạn khi bạn gửi hồ sơ ứng tuyển hoặc yêu cầu tư vấn, theo Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP (có hiệu lực từ 01/01/2026).",
    // Hiện ở mục 1 khi chưa có kênh liên hệ.
    noContactsBefore: "Kênh liên hệ: xem trang ",
    noContactsLink: "Liên hệ",
    noContactsAfter: ".",
    sections: [
      {
        h: "1. Bên chịu trách nhiệm dữ liệu",
        before: ["{brand} là bên kiểm soát và xử lý dữ liệu cá nhân bạn gửi qua website này."],
        list: [],
        after: [],
      },
      {
        h: "2. Dữ liệu chúng tôi thu thập",
        before: [],
        list: [
          "Họ và tên; ít nhất một cách liên hệ (email, điện thoại hoặc Zalo, Facebook).",
          "Trình độ tiếng Nhật, ghi chú bạn tự nhập, mã và tên tin bạn ứng tuyển.",
          "CV (tệp PDF, Word hoặc Excel) nếu bạn đính kèm.",
          "Thời điểm và phiên bản nội dung bạn đã đồng ý.",
          "Địa chỉ IP dưới dạng mã băm một chiều, chỉ để chống gửi hồ sơ hàng loạt; chúng tôi không lưu địa chỉ IP gốc.",
        ],
        after: ["Chúng tôi không yêu cầu dữ liệu cá nhân nhạy cảm (ví dụ: sức khỏe, tôn giáo, quan điểm chính trị, số định danh cá nhân, tài khoản ngân hàng). Vui lòng không đưa các thông tin này vào CV hoặc ghi chú."],
      },
      {
        h: "3. Mục đích xử lý",
        before: [],
        list: [
          "Xem xét hồ sơ cho tin bạn ứng tuyển và liên hệ với bạn về tin đó.",
          "Tư vấn việc làm khi bạn gửi yêu cầu tư vấn.",
          "Sắp xếp lịch phỏng vấn với nhà tuyển dụng của tin bạn ứng tuyển.",
        ],
        after: ["Hồ sơ chỉ được gửi cho nhà tuyển dụng của tin bạn ứng tuyển sau khi đã trao đổi với bạn. Chúng tôi không bán dữ liệu cá nhân và không dùng dữ liệu của bạn cho quảng cáo."],
      },
      {
        h: "4. Nơi lưu trữ và chuyển dữ liệu ra nước ngoài",
        before: ["Dữ liệu và CV được lưu trên dịch vụ đám mây đặt ngoài Việt Nam: máy chủ cơ sở dữ liệu tại Ấn Độ (Supabase, khu vực Mumbai) và máy chủ web của Vercel (mặc định tại Hoa Kỳ). Theo quy định, việc lưu trữ này được coi là chuyển dữ liệu cá nhân ra nước ngoài. CV nằm trong kho lưu trữ riêng tư: người ngoài không truy cập được, quản trị viên chỉ mở được qua liên kết tạm thời có hiệu lực 60 giây."],
        list: [],
        after: [],
      },
      {
        h: "5. Khi hồ sơ được gửi sang Nhật Bản",
        before: ["Trước khi gửi hồ sơ cho một nhà tuyển dụng tại Nhật Bản, chúng tôi cho bạn biết tên nhà tuyển dụng và chỉ gửi khi bạn đồng ý. Tại Nhật Bản, nhà tuyển dụng xử lý dữ liệu của bạn theo Luật Bảo vệ thông tin cá nhân của Nhật Bản (APPI, 個人情報保護法), do Ủy ban Bảo vệ thông tin cá nhân (PPC) giám sát. Theo APPI:"],
        list: [
          "nhà tuyển dụng phải công bố hoặc thông báo cho bạn mục đích sử dụng và chỉ dùng dữ liệu trong phạm vi đó;",
          "không được cung cấp dữ liệu của bạn cho bên thứ ba khi chưa có sự đồng ý của bạn, trừ trường hợp luật cho phép;",
          "nếu chuyển tiếp dữ liệu ra nước khác, phải cho bạn biết tên nước, chế độ bảo vệ dữ liệu của nước đó và biện pháp bảo vệ của bên nhận trước khi xin đồng ý;",
          "khi xảy ra sự cố rò rỉ thuộc diện phải báo cáo, phải báo cáo PPC và thông báo cho bạn;",
          "bạn có quyền yêu cầu họ công khai, chỉnh sửa, ngừng sử dụng hoặc xóa dữ liệu của bạn theo thủ tục của APPI.",
        ],
        after: ["Nếu cần hỗ trợ khi làm việc với nhà tuyển dụng tại Nhật về dữ liệu của mình, bạn có thể liên hệ chúng tôi qua các kênh ở mục 1."],
      },
      {
        h: "6. Thời hạn lưu và xóa",
        before: [],
        list: [
          "Hồ sơ được lưu tối đa {months} tháng kể từ ngày gửi, sau đó bị xóa cùng CV.",
          "Nếu bạn không trúng tuyển hoặc rút hồ sơ, hồ sơ và CV sẽ bị xóa, trừ khi bạn đồng ý để chúng tôi lưu lại.",
          "Hồ sơ gửi dở (chưa tải xong CV) bị xóa sau 24 giờ.",
          "Bạn có thể yêu cầu xóa bất cứ lúc nào (xem mục 7).",
        ],
        after: [],
      },
      {
        h: "7. Quyền của bạn",
        before: ["Theo Luật Bảo vệ dữ liệu cá nhân, bạn có quyền:"],
        list: [
          "được biết về việc xử lý dữ liệu cá nhân của mình;",
          "đồng ý hoặc không đồng ý, và rút lại sự đồng ý bất cứ lúc nào;",
          "xem, chỉnh sửa hoặc yêu cầu chỉnh sửa dữ liệu của mình;",
          "yêu cầu cung cấp, yêu cầu xóa, yêu cầu hạn chế xử lý dữ liệu;",
          "phản đối việc xử lý dữ liệu;",
          "khiếu nại, tố cáo, khởi kiện theo quy định của pháp luật.",
        ],
        after: ["Để thực hiện các quyền này, hãy liên hệ qua các kênh ở mục 1 và ghi mã hồ sơ (dạng HS-XXXXXX) bạn nhận được khi gửi. Chúng tôi sẽ xác minh bạn là người gửi hồ sơ và xử lý yêu cầu trong thời hạn pháp luật quy định. Rút lại sự đồng ý không ảnh hưởng đến việc xử lý đã thực hiện trước đó; sau khi bạn rút lại, hồ sơ sẽ bị xóa."],
      },
      {
        h: "8. Bảo vệ dữ liệu và sự cố",
        before: ["Chỉ quản trị viên đã đăng nhập mới xem được hồ sơ; quyền truy cập được kiểm tra ở máy chủ và trong cơ sở dữ liệu. Khi phát hiện sự cố lộ, mất dữ liệu cá nhân, chúng tôi sẽ thông báo cho cơ quan chuyên trách bảo vệ dữ liệu cá nhân và cho bạn theo quy định."],
        list: [],
        after: [],
      },
      {
        h: "9. Thay đổi chính sách",
        before: ["Khi chính sách thay đổi, phiên bản mới được đăng trên trang này. Mỗi hồ sơ lưu lại phiên bản nội dung mà người gửi đã đồng ý."],
        list: [],
        after: [],
      },
    ] as Section[],
  },
};

export default pages;
