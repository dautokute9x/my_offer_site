-- Sinh tự động bởi `npm run db:gen-seed` (scripts/gen-seed.mts). Không sửa tay.
-- Chạy một lần trên DB mới; chạy lại sẽ lỗi unique (an toàn, không ghi gì).
begin;
insert into prefectures (id, code, name_ja, name_vi, romaji, region, aliases) values
  (1, '01', '北海道', 'Hokkaido', 'Hokkaido', 'Hokkaido', array['北海道', '北海', 'Hokkaido']),
  (2, '02', '青森県', 'Aomori', 'Aomori', 'Tohoku', array['青森県', '青森', 'Aomori']),
  (3, '03', '岩手県', 'Iwate', 'Iwate', 'Tohoku', array['岩手県', '岩手', 'Iwate']),
  (4, '04', '宮城県', 'Miyagi', 'Miyagi', 'Tohoku', array['宮城県', '宮城', 'Miyagi']),
  (5, '05', '秋田県', 'Akita', 'Akita', 'Tohoku', array['秋田県', '秋田', 'Akita']),
  (6, '06', '山形県', 'Yamagata', 'Yamagata', 'Tohoku', array['山形県', '山形', 'Yamagata']),
  (7, '07', '福島県', 'Fukushima', 'Fukushima', 'Tohoku', array['福島県', '福島', 'Fukushima']),
  (8, '08', '茨城県', 'Ibaraki', 'Ibaraki', 'Kanto', array['茨城県', '茨城', 'Ibaraki']),
  (9, '09', '栃木県', 'Tochigi', 'Tochigi', 'Kanto', array['栃木県', '栃木', 'Tochigi']),
  (10, '10', '群馬県', 'Gunma', 'Gunma', 'Kanto', array['群馬県', '群馬', 'Gunma']),
  (11, '11', '埼玉県', 'Saitama', 'Saitama', 'Kanto', array['埼玉県', '埼玉', 'Saitama']),
  (12, '12', '千葉県', 'Chiba', 'Chiba', 'Kanto', array['千葉県', '千葉', 'Chiba']),
  (13, '13', '東京都', 'Tokyo', 'Tokyo', 'Kanto', array['東京都', '東京', 'Tokyo']),
  (14, '14', '神奈川県', 'Kanagawa', 'Kanagawa', 'Kanto', array['神奈川県', '神奈川', 'Kanagawa']),
  (15, '15', '新潟県', 'Niigata', 'Niigata', 'Chubu', array['新潟県', '新潟', 'Niigata']),
  (16, '16', '富山県', 'Toyama', 'Toyama', 'Chubu', array['富山県', '富山', 'Toyama']),
  (17, '17', '石川県', 'Ishikawa', 'Ishikawa', 'Chubu', array['石川県', '石川', 'Ishikawa']),
  (18, '18', '福井県', 'Fukui', 'Fukui', 'Chubu', array['福井県', '福井', 'Fukui']),
  (19, '19', '山梨県', 'Yamanashi', 'Yamanashi', 'Chubu', array['山梨県', '山梨', 'Yamanashi']),
  (20, '20', '長野県', 'Nagano', 'Nagano', 'Chubu', array['長野県', '長野', 'Nagano']),
  (21, '21', '岐阜県', 'Gifu', 'Gifu', 'Chubu', array['岐阜県', '岐阜', 'Gifu']),
  (22, '22', '静岡県', 'Shizuoka', 'Shizuoka', 'Chubu', array['静岡県', '静岡', 'Shizuoka']),
  (23, '23', '愛知県', 'Aichi', 'Aichi', 'Chubu', array['愛知県', '愛知', 'Aichi']),
  (24, '24', '三重県', 'Mie', 'Mie', 'Kansai', array['三重県', '三重', 'Mie']),
  (25, '25', '滋賀県', 'Shiga', 'Shiga', 'Kansai', array['滋賀県', '滋賀', 'Shiga']),
  (26, '26', '京都府', 'Kyoto', 'Kyoto', 'Kansai', array['京都府', '京都', 'Kyoto']),
  (27, '27', '大阪府', 'Osaka', 'Osaka', 'Kansai', array['大阪府', '大阪', 'Osaka']),
  (28, '28', '兵庫県', 'Hyogo', 'Hyogo', 'Kansai', array['兵庫県', '兵庫', 'Hyogo']),
  (29, '29', '奈良県', 'Nara', 'Nara', 'Kansai', array['奈良県', '奈良', 'Nara']),
  (30, '30', '和歌山県', 'Wakayama', 'Wakayama', 'Kansai', array['和歌山県', '和歌山', 'Wakayama']),
  (31, '31', '鳥取県', 'Tottori', 'Tottori', 'Chugoku', array['鳥取県', '鳥取', 'Tottori']),
  (32, '32', '島根県', 'Shimane', 'Shimane', 'Chugoku', array['島根県', '島根', 'Shimane']),
  (33, '33', '岡山県', 'Okayama', 'Okayama', 'Chugoku', array['岡山県', '岡山', 'Okayama']),
  (34, '34', '広島県', 'Hiroshima', 'Hiroshima', 'Chugoku', array['広島県', '広島', 'Hiroshima']),
  (35, '35', '山口県', 'Yamaguchi', 'Yamaguchi', 'Chugoku', array['山口県', '山口', 'Yamaguchi']),
  (36, '36', '徳島県', 'Tokushima', 'Tokushima', 'Shikoku', array['徳島県', '徳島', 'Tokushima']),
  (37, '37', '香川県', 'Kagawa', 'Kagawa', 'Shikoku', array['香川県', '香川', 'Kagawa']),
  (38, '38', '愛媛県', 'Ehime', 'Ehime', 'Shikoku', array['愛媛県', '愛媛', 'Ehime']),
  (39, '39', '高知県', 'Kochi', 'Kochi', 'Shikoku', array['高知県', '高知', 'Kochi']),
  (40, '40', '福岡県', 'Fukuoka', 'Fukuoka', 'Kyushu-Okinawa', array['福岡県', '福岡', 'Fukuoka']),
  (41, '41', '佐賀県', 'Saga', 'Saga', 'Kyushu-Okinawa', array['佐賀県', '佐賀', 'Saga']),
  (42, '42', '長崎県', 'Nagasaki', 'Nagasaki', 'Kyushu-Okinawa', array['長崎県', '長崎', 'Nagasaki']),
  (43, '43', '熊本県', 'Kumamoto', 'Kumamoto', 'Kyushu-Okinawa', array['熊本県', '熊本', 'Kumamoto']),
  (44, '44', '大分県', 'Oita', 'Oita', 'Kyushu-Okinawa', array['大分県', '大分', 'Oita']),
  (45, '45', '宮崎県', 'Miyazaki', 'Miyazaki', 'Kyushu-Okinawa', array['宮崎県', '宮崎', 'Miyazaki']),
  (46, '46', '鹿児島県', 'Kagoshima', 'Kagoshima', 'Kyushu-Okinawa', array['鹿児島県', '鹿児島', 'Kagoshima']),
  (47, '47', '沖縄県', 'Okinawa', 'Okinawa', 'Kyushu-Okinawa', array['沖縄県', '沖縄', 'Okinawa']);
alter table prefectures alter column id restart with 48;

insert into occupation_groups (id, slug, name_vi, name_ja, sort) values
  (1, 'dien', 'Điện và thiết kế điện', '電気・電気設計', 1),
  (2, 'xay-dung', 'Xây dựng, dân dụng, cầu đường', '建築・土木', 2),
  (3, 'quan-ly-thi-cong', 'Quản lý thi công', '施工管理', 3),
  (4, 'cad-co-khi', 'CAD/BIM, cơ khí và thiết kế', 'CAD/BIM・機械・設計', 4),
  (5, 'san-xuat', 'Sản xuất, bảo trì, vận hành máy', '製造・保全・機械オペレーター', 5);
alter table occupation_groups alter column id restart with 6;

insert into occupations (id, group_id, slug, name_vi, name_ja, aliases) values
  (1, 1, 'dien-cong-trinh', 'Thi công điện', '電気工事', array['electrical work']),
  (2, 1, 'thiet-ke-dien', 'Thiết kế hệ thống điện', '電気設備設計', array['electrical design']),
  (3, 1, 'plc-mach-dien', 'PLC, thiết kế mạch', 'PLC/回路設計', array['plc', 'circuit design']),
  (4, 1, 'dien-bao-tri', 'Bảo trì điện', '電気保全', array['electrical maintenance']),
  (5, 2, 'thi-cong-dan-dung', 'Thi công dân dụng', '土木施工', array['civil engineering']),
  (6, 2, 'lat-duong', 'Thi công trải mặt đường', '舗装工', array['paving']),
  (7, 2, 'thi-cong-kien-truc', 'Thi công kiến trúc', '建築施工', array['building construction']),
  (8, 2, 'thi-cong-cau', 'Thi công cầu', '橋梁工事', array['bridge work']),
  (9, 3, 'quan-ly-thi-cong-kien-truc', 'Quản lý thi công kiến trúc', '建築施工管理', array['building site management']),
  (10, 3, 'quan-ly-thi-cong-dan-dung', 'Quản lý thi công dân dụng', '土木施工管理', array['civil site management']),
  (11, 3, 'quan-ly-thi-cong-ong', 'Quản lý thi công đường ống', '管工事施工管理', array['piping site management']),
  (12, 3, 'quan-ly-thi-cong-dien', 'Quản lý thi công điện', '電気工事施工管理', array['electrical site management']),
  (13, 4, 'cad-operator', 'CAD operator', 'CADオペレーター', array['cad', 'cad operator']),
  (14, 4, 'bim', 'BIM', 'BIM', array['bim modeler']),
  (15, 4, 'thiet-ke-co-khi', 'Thiết kế cơ khí', '機械設計', array['mechanical design']),
  (16, 4, 'thiet-ke-ket-cau', 'Thiết kế kết cấu', '構造設計', array['structural design']),
  (17, 5, 'bao-tri-thiet-bi', 'Bảo trì thiết bị', '設備保全', array['equipment maintenance']),
  (18, 5, 'van-hanh-may', 'Vận hành máy', '機械オペレーター', array['machine operator']),
  (19, 5, 'gia-cong-co-khi', 'Gia công cơ khí', '機械加工', array['machining']),
  (20, 5, 'kiem-tra-san-pham', 'Kiểm tra sản phẩm', '検査', array['inspection']);
alter table occupations alter column id restart with 21;

insert into skills (id, name, aliases) values
  (1, 'AutoCAD', '{}'::text[]),
  (2, 'Revit', '{}'::text[]),
  (3, 'Tekla', '{}'::text[]),
  (4, 'SolidWorks', '{}'::text[]),
  (5, 'PLC', '{}'::text[]),
  (6, 'Jw_cad', '{}'::text[]),
  (7, 'Navisworks', '{}'::text[]),
  (8, 'Inventor', '{}'::text[]),
  (9, 'CATIA', '{}'::text[]),
  (10, 'Rebro', '{}'::text[]),
  (11, 'Vectorworks', '{}'::text[]),
  (12, 'MicroStation', '{}'::text[]);
alter table skills alter column id restart with 13;

insert into benefits (id, slug, name_vi, name_ja, featured, sort) values
  (1, 'ky-tuc-xa', 'Ký túc xá', '寮・社宅', true, 1),
  (2, 'ho-tro-nha-o', 'Hỗ trợ nhà ở', '住宅手当', true, 2),
  (3, 'ho-tro-chuyen-nha', 'Hỗ trợ chuyển nhà', '引越し費用補助', true, 3),
  (4, 'dua-gia-dinh', 'Cho phép đưa gia đình sang', '家族帯同可', false, 4),
  (5, 'ho-tro-chung-chi', 'Hỗ trợ lấy chứng chỉ', '資格取得支援', false, 5),
  (6, 'dao-tao', 'Đào tạo', '研修制度', false, 6),
  (7, 'thuong', 'Thưởng', '賞与', false, 7),
  (8, 'phu-cap-di-lai', 'Phụ cấp đi lại', '交通費支給', false, 8);
alter table benefits alter column id restart with 9;

insert into site_settings (id, data) values (1, '{"brandName":"[TÊN THƯƠNG HIỆU]","domain":"[TÊN MIỀN]","email":"[EMAIL LIÊN HỆ]","phone":"[SỐ LIÊN HỆ]","zalo":"[ZALO]","facebookUrl":"[LINK FACEBOOK]","zaloGroupUrl":"[LINK NHÓM ZALO]","aboutText":"[GIỚI THIỆU]","consentVersion":"v0-chua-xac-nhan","retentionMonths":12,"policiesConfirmed":false}'::jsonb);
commit;
