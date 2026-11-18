# G-Scores — Thiết kế giao diện

Bản thiết kế tương tác cho ứng dụng tra cứu và phân tích điểm thi THPT 2024. Phạm vi bám theo [FEATURES.md](../FEATURES.md) và [kiến trúc](../ARCHITECTURE.md). Giao diện hiển thị hoàn toàn bằng **tiếng Anh**, gồm nhãn môn học, biểu đồ, thông báo lỗi và trạng thái. Số liệu dùng định dạng `en-US` (1,061,605; 6.45). Đây là tài liệu thiết kế tham chiếu; ứng dụng React đã triển khai các màn hình này bằng Tailwind CSS và Chart.js, kết nối API thật.

Dashboard trong ứng dụng React hiện chỉ giữ thống kê tổng quan; biểu đồ chi tiết và bảng môn học nằm ở Reports, còn phân phối tổng điểm và top 10 nằm ở Rankings. Prototype và ảnh bên dưới giữ bố cục tham chiếu trước thay đổi này.

**Mở [index.html](index.html) trực tiếp bằng trình duyệt.** Không cần cài thư viện, chạy server, kết nối mạng hay đăng nhập. Thanh màu vàng cuối trang là công cụ duyệt thiết kế, không thuộc giao diện sản phẩm khi triển khai.

## Các màn hình và chức năng

| Màn hình | Route khi triển khai / hash trong prototype | Nội dung và tương tác |
|---|---|---|
| Tổng quan | `/` / `#/` | Tổng thí sinh, số môn, số có điểm và điểm trung bình theo môn đang chọn; phổ điểm và bảng tóm tắt; biểu đồ 4 khoảng điểm cho 9 môn; thống kê tổ hợp, top 3 dẫn sang top 10, phổ tổng điểm; bảng tổng hợp đủ 9 môn. |
| Tra cứu điểm | `/scores` / `#/scores` | Form SBD 8 chữ số, giữ số 0 đầu; gửi bằng Enter; gợi ý SBD mẫu; hiển thị điểm đủ 9 môn, mã ngoại ngữ nếu có, điểm thiếu và tổng A00 nếu đủ 3 môn. |
| Báo cáo môn học | `/reports` / `#/reports` | Chuyển giữa 9 môn; phổ 20 khoảng 0,5 điểm; số hợp lệ, trung bình, trung vị, độ lệch chuẩn tổng thể, số điểm 0/10; biểu đồ 4 khoảng điểm và bảng tổng hợp toàn bộ môn. |
| Xếp hạng tổ hợp | `/rankings` / `#/rankings` | Chọn A00, A01, B00, C00, D01 hoặc D07; số đủ điều kiện, trung bình và cao nhất; phổ tổng 30 khoảng 1 điểm; top 10 với điểm từng môn, tổng và vị trí; bấm registration number để tra cứu. |

Liên kết sâu có sẵn: `#/reports?subject=ngoai_ngu`, `#/rankings?group=A01`, `#/scores?sbd=01000001`. Thanh điều hướng đánh dấu màn hình hiện tại; các liên kết trong bảng đưa đến nội dung tương ứng. Route không hợp lệ có thông báo và liên kết về Tổng quan. Chỉ hiển thị năm 2024 vì chưa có năm khác.

### Trạng thái cần triển khai

| Phạm vi | Trạng thái trong bản thiết kế | Cách xem |
|---|---|---|
| Tất cả 4 màn hình | Có dữ liệu, đang tải, chưa có dữ liệu, lỗi kết nối, thử lại | Dùng bộ chọn **Preview state** cuối trang. Đang tải có skeleton và `aria-busy`; lỗi có nút Retry. |
| Tra cứu ban đầu | Chưa nhập SBD | Mở `#/scores`. |
| Tra cứu không hợp lệ | Trống, thiếu/thừa chữ số, chứa ký tự khác chữ số | Nhập `123` hoặc `abcdefgh` rồi Tra cứu; lỗi gắn với ô nhập và focus quay lại ô đó. |
| Tra cứu đang tải | Phản hồi trong lúc chờ | Bấm SBD mẫu; nút gửi tạm khóa trong 450 ms mô phỏng. |
| Tra cứu thành công | SBD có số 0 đầu, môn có/thiếu điểm, điểm 0 hợp lệ | Thử `01000001`, `01000002`, `01003254`; hoặc bấm registration number ở top 10. |
| Không tìm thấy | SBD đúng định dạng nhưng không có trong mẫu | Thử `99999999`; nút Edit registration number đưa focus về form. |
| Mobile/tablet | Điều hướng và bố cục theo chiều rộng | Thu nhỏ cửa sổ; mobile chuyển sang điều hướng ngang, form và biểu đồ xếp dọc. |

Trạng thái lỗi và chưa có dữ liệu dùng chung một mẫu bố cục cho 4 màn hình; tiêu đề vẫn cho biết ngữ cảnh. Khi triển khai API, trạng thái phải dựa vào phản hồi thực tế; nếu một khối dashboard lỗi, giữ các khối đã tải và đặt Retry ngay khối lỗi. Trường hợp số hợp lệ bằng 0 phải hiển thị số đếm 0, chỉ số suy ra “No data”; không dựng biểu đồ giả hoặc tính phần trăm với mẫu số 0.

## Hướng thiết kế

Giao diện đọc dữ liệu: nền sáng, chữ xanh mực, thanh điều hướng xanh đậm, dấu hiệu thương hiệu vàng và màu xanh cho thao tác. Biểu đồ và con số là nội dung chính; không dùng ảnh trang trí hay gradient.

| Vai trò | Token / giá trị |
|---|---|
| Nền trang / bề mặt | `--bg: #f3f6fa` / `--surface: #ffffff` |
| Chữ chính / chữ phụ | `--ink: #183153` / `--muted: #52647b` |
| Thanh điều hướng | `--nav: #142c4b` |
| Thao tác / nền nhấn | `--blue: #245edb` / `--blue-soft: #edf3ff` |
| Nhận diện thương hiệu | `--gold: #f0c45a` |
| Viền | `--line: #dce4ef` |
| 4 khoảng điểm tăng dần | `#8a98ac`, `#dfaa43`, `#558fbb`, `#245edb` |
| Thành công / lỗi | `#19724e` / `#b52c3b`; luôn đi cùng chữ mô tả |

- Chữ nội dung: Noto Sans, dự phòng Arial/sans-serif. SBD: Noto Sans Mono, dự phòng DejaVu Sans Mono/monospace. Dùng font hệ thống, không tải font ngoài.
- Chữ tiêu đề 32 px desktop, 27 px mobile; số KPI 28 px; số trong cột dùng tabular numerals.
- Khung chính desktop: sidebar 224 px, khoảng cách 24 px; chuyển bố cục tại 1200/950/640 px; mobile từ 640 px trở xuống dùng thanh điều hướng ngang và KPI 2 cột. Chủ động dùng giao diện sáng để đối chiếu biểu đồ với bảng số liệu.
- Bảng dài cuộn trong vùng riêng. Màu 4 khoảng điểm dùng nhất quán giữa các môn. Mỗi biểu đồ có tên, năm, đơn vị, trục bắt đầu từ 0, số lượng/tỷ lệ khi hover hoặc focus, và bảng thay thế mở được bằng bàn phím.
- Focus hiển thị rõ; form có label, lỗi và thông báo trạng thái; liên kết bỏ qua điều hướng; nút dùng native semantics; hỗ trợ reduced motion. Không có dialog hoặc hiệu ứng chuyển cảnh cần quản lý thêm.

## Dữ liệu và quy tắc hiển thị

Snapshot được tổng hợp từ **toàn bộ** `data/diem_thi_thpt_2024.csv`, không phải dữ liệu minh họa ngẫu nhiên: 1.061.605 thí sinh, 9 môn và 6 tổ hợp. Đã đối chiếu số có điểm từng môn và số đủ điều kiện của 6 tổ hợp với FEATURES.md.

- SHA-256 của CSV nguồn: `2ed0acf11ee55316c660055baf28e0d2c0acc8b4a209114fcd77839e73ff2cdf`.
- Snapshot được đóng trong HTML; **không nhúng hoặc công khai toàn bộ CSV**. Tra cứu dùng 58 bản ghi mẫu gồm 3 trường hợp tra cứu và các thí sinh trong top 10. Thông báo không tìm thấy chỉ áp dụng cho tập mẫu này.
- Điểm trống hiển thị “Not taken / unavailable”, không thay bằng 0. SBD luôn là chuỗi 8 chữ số.
- Bốn khoảng: `[0; 4)`, `[4; 6)`, `[6; 8)`, `[8; 10]`. Phần trăm chia cho số điểm hợp lệ của từng môn.
- Phổ môn: 20 khoảng 0,5 điểm. Phổ tổ hợp: 30 khoảng 1 điểm. Khoảng cuối bao gồm điểm 10 hoặc 30; khoảng không có thí sinh vẫn được giữ lại trong bảng.
- Thống kê trung bình/trung vị/độ lệch chuẩn dùng cùng tập hợp với biểu đồ; hiển thị hai chữ số thập phân. Môn Toán thực tế không có điểm 10, cao nhất 9,80.
- Ngoại ngữ là tổng hợp mọi mã; A01/D01/D07 chỉ dùng Tiếng Anh N1. Không tự suy diễn tên ngoại ngữ cho các mã chưa xác minh.
- Tổng tổ hợp không nhân hệ số, không cộng ưu tiên. Chỉ dùng đủ 3 điểm; 0 hợp lệ. Xếp tổng giảm dần, cùng tổng thì SBD tăng dần; luôn ghi rõ đây không phải kết quả tuyển sinh.

## Ảnh màn hình

Ảnh toàn trang để xem bố cục; dùng HTML để xem chữ đúng kích thước và thử tương tác.

| Màn hình | Desktop 1440 px | Mobile 390 px |
|---|---|---|
| Tổng quan | [Xem ảnh](screenshots/desktop-overview.png) | [Xem ảnh](screenshots/mobile-overview.png) |
| Tra cứu có kết quả | [Xem ảnh](screenshots/desktop-score-lookup.png) | [Xem ảnh](screenshots/mobile-score-lookup.png) |
| Báo cáo môn học | [Xem ảnh](screenshots/desktop-subject-reports.png) | [Xem ảnh](screenshots/mobile-subject-reports.png) |
| Xếp hạng tổ hợp | [Xem ảnh](screenshots/desktop-combination-rankings.png) | [Xem ảnh](screenshots/mobile-combination-rankings.png) |

## Kiểm tra lại

```sh
node docs/design/check.mjs
```

Yêu cầu Node.js 24 và Chrome có sẵn (`google-chrome`, hoặc biến `CHROME_BIN` trỏ đến executable). Không cài thêm dependency. Lệnh mở Chrome headless bằng profile tạm, kiểm tra rồi xuất lại 8 PNG ở trên; đóng Chrome và xóa profile sau khi hoàn tất.

Kiểm tra bao gồm tổng band/bin, thứ tự top 10 và điểm tổng, điều kiện N1, chuyển 4 màn hình ở 1440/768/390 px, tràn ngang, 9 lựa chọn môn, 6 tổ hợp, liên kết top 10 sang tra cứu, SBD có 0 đầu, điểm thiếu/0, validation/không tìm thấy, trạng thái tải/rỗng/lỗi/thử lại, Tab/Shift+Tab/Enter, reduced motion và lỗi JavaScript. Kiểm tra cũng xác nhận `lang="en"` và không còn nội dung tiếng Việt trong HTML giao diện. Đã xem trực quan các ảnh desktop/mobile. Chưa kiểm tra bằng trình đọc màn hình hoặc trên thiết bị thật.

## Ranh giới bàn giao

Khi hiện thực hóa, chuyển các khối sang React Hooks và Tailwind trong `apps/web`, dùng API NestJS theo kiến trúc dự án; giữ quy tắc dữ liệu, nhãn và trạng thái ở trên. Loại bỏ bộ chọn trạng thái thiết kế và thay snapshot/độ trễ mô phỏng bằng dữ liệu và trạng thái request thật. Snapshot không tự cập nhật khi CSV thay đổi.

Không thêm màn hình đăng nhập, Settings, sửa/xóa thí sinh, import CSV trên web, tạo tổ hợp tùy ý, xuất file hoặc chọn năm chưa có dữ liệu; những mục này nằm ngoài phạm vi hiện tại. Chưa kết nối API, thay đổi React, triển khai công khai hoặc kiểm thử nghiệp vụ backend trong hạng mục thiết kế này.
