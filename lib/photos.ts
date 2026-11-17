// Ảnh minh họa từ Wikimedia Commons (giấy phép CC, ghi công ở footer). Chủ site thay bằng ảnh của mình: giữ tên tệp trong public/anh/ hoặc sửa `src`.
export type Photo = { src: string; alt: string; w: number; h: number; author: string; license: string; page: string };

export const PHOTOS = {
  "cop-pha": { src: "/anh/cop-pha.jpg", alt: "Thợ đội mũ bảo hộ đóng khung cốp pha gỗ trên công trường, nhìn từ trên cao", w: 960, h: 720, author: "Reinhold Möller Ermell", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Zimmermann_nagelt_Verschalung-20160531-RM-110839.jpg" },
  "bo-mach": { src: "/anh/bo-mach.jpg", alt: "Tay kỹ thuật viên dùng nhíp đặt linh kiện lên bo mạch điện tử màu xanh", w: 960, h: 639, author: "Aisart", license: "CC BY-SA 3.0", page: "https://commons.wikimedia.org/wiki/File:Soldering_a_0805.jpg" },
  "may-xuc": { src: "/anh/may-xuc.jpg", alt: "Máy xúc màu vàng đang phá khối bê tông trên công trường", w: 960, h: 720, author: "Ermell", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Hallstadt_Bahnhof_ABS_N%C3%BCrnberg-Ebensfeld-20210328-RM-111554.jpg" },
  "trung-tam-du-lieu": { src: "/anh/trung-tam-du-lieu.jpg", alt: "Hai kỹ thuật viên mặc áo xanh làm việc bên tủ mạng trong trung tâm dữ liệu", w: 960, h: 639, author: "Daoducquan", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Data_Center_c%E1%BB%A7a_CMC_Telecom_(2).jpg" },
  "tokyo": { src: "/anh/tokyo.jpg", alt: "Đại lộ Omotesando ở Tokyo lúc hoàng hôn, hai hàng cây và dòng xe", w: 1280, h: 853, author: "gog.creator", license: "CC BY 4.0", page: "https://commons.wikimedia.org/wiki/File:Omotesando_Avenue_at_sunset_from_pedestrian_bridge,_Jingumae,_Shibuya,_Tokyo.jpg" },
  "bao-go": { src: "/anh/bao-go.jpg", alt: "Chiếc bào gỗ kiểu Nhật (kanna) giữa những vụn gỗ cuộn", w: 1280, h: 1280, author: "Terasaface", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Japanese_handplane_(kanna)_with_wood_shavings.jpg" },
  "kyoto": { src: "/anh/kyoto.jpg", alt: "Cổng gỗ mở vào sân chùa ở Kyoto", w: 1280, h: 960, author: "Basile Morin", license: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Wooden_gate_with_open_double_door_leading_to_the_garden_of_Isshinin_Buddhist_temple_in_the_compounds_of_Chion-in_Kyoto_Japan.jpg" },
} satisfies Record<string, Photo>;
