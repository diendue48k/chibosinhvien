# TÀI LIỆU HƯỚNG DẪN SỬ DỤNG
## HỆ THỐNG QUẢN LÝ CHI BỘ SINH VIÊN (CBSV)

Chào mừng bạn đến với tài liệu hướng dẫn sử dụng Hệ thống Quản lý Chi bộ Sinh viên (CBSV). Hệ thống được thiết kế để số hóa và tối ưu hóa toàn bộ quy trình nghiệp vụ Đảng trong chi bộ trường học, từ quản lý hồ sơ đảng viên, theo dõi sinh hoạt chi bộ, biểu quyết trực tuyến, đến tự động sinh các biểu mẫu hồ sơ kết nạp và chuyển chính thức.

---

## 1. PHÂN QUYỀN VAI TRÒ TRÊN HỆ THỐNG (RBAC)

Hệ thống hỗ trợ phân quyền chi tiết cho từng vai trò người dùng (Role-Based Access Control) để đảm bảo an toàn thông tin và tính bảo mật cao:

| Vai trò (Role) | Ký hiệu | Quyền hạn chính |
| :--- | :---: | :--- |
| **Quản trị viên** | `ADMIN` | Toàn quyền kiểm soát hệ thống, quản lý tài khoản, cấu hình phân quyền và cơ sở dữ liệu. |
| **Bí thư / Phó Bí thư** | `BITHU` / `PHOBIHU` | Quản lý đảng viên, tạo lịch họp, kiểm soát biểu quyết, duyệt hồ sơ kết nạp/chính thức và kế hoạch tuần. |
| **Chi ủy viên** | `CAPUY` | Hỗ trợ Bí thư quản lý đảng viên, hồ sơ kết nạp/chính thức, lịch họp và biểu quyết chi bộ. |
| **Quản lý Hồ sơ chính thức** | `OFFICIAL_MANAGER` | Quản lý hồ sơ đảng viên dự bị và đảng viên chính thức, tạo biểu mẫu hồ sơ. |
| **Quản lý Hồ sơ kết nạp** | `ADMISSION_MANAGER` | Quản lý danh sách cảm tình Đảng, hồ sơ kết nạp và hồ sơ đã kết nạp. |
| **Kỷ luật / Kiểm tra** | `KIEMTRA` | Có quyền giám sát, xem và chỉnh sửa danh sách đảng viên, kiểm tra hồ sơ và xử lý cài đặt hệ thống. |
| **Truyền thông / Tổ chức** | `TRUYENTHONG` / `TOCHUC`| Đăng tải thông báo, lịch họp, quản lý điểm danh và lập kế hoạch công việc tuần. |
| **Đảng viên** | `DANGVIEN` | Xem thông tin cá nhân, đăng ký 213, đăng ký vắng họp, điểm danh bằng QR/Mã số, tham gia biểu quyết và nhận thông báo. |

---

## 2. HƯỚNG DẪN SỬ DỤNG CÁC TÍNH NĂNG CỐT LÕI

### 2.1. Đăng nhập & Hồ sơ cá nhân
- **Đăng nhập**: Sử dụng mã số sinh viên (MSSV) hoặc tên đăng nhập và mật khẩu được cấp.
- **Hồ sơ cá nhân**: Nơi đảng viên tự kiểm tra thông tin cá nhân (Họ tên, ngày vào Đảng, ngày chính thức, nhóm sinh hoạt, thông tin liên lạc). Đảng viên có thể chỉnh sửa thông tin liên hệ và cập nhật ảnh đại diện.

### 2.2. Quản lý Đảng viên
*Truy cập từ menu: **Quản lý Đảng viên** -> Chọn phân loại.*
- **Đang sinh hoạt**: Danh sách toàn bộ đảng viên đang tham gia sinh hoạt tại chi bộ (hiển thị rõ loại đảng viên: Chính thức hoặc Dự bị).
- **Chuyển sinh hoạt tạm thời**: Quản lý các đảng viên chuyển đến sinh hoạt tạm thời từ nơi khác hoặc đảng viên chi bộ đi sinh hoạt tạm thời nơi khác.
- **Đã chuyển ra**: Quản lý danh sách đảng viên đã tốt nghiệp hoặc chuyển sinh hoạt Đảng chính thức sang chi bộ mới.

### 2.3. Quy trình Quản lý Hồ sơ
Hệ thống quản lý 2 luồng hồ sơ chính theo quy trình chuẩn của Đảng:

#### A. Hồ sơ kết nạp (Từ Cảm tình Đảng lên Đảng viên Dự bị)
1. **Quản lý hồ sơ**: Theo dõi các hồ sơ kết nạp đang làm (nhập thông tin, tình trạng hoàn thành các văn bản như Lý lịch, Nghị quyết, Bản tự kiểm điểm,...).
2. **Hồ sơ đã kết nạp**: Danh sách các đồng chí đã có quyết định kết nạp và chính thức chuyển thành đảng viên dự bị.
3. **Thống kê số lượng**: Biểu đồ trực quan theo dõi số lượng hồ sơ kết nạp theo từng khóa, khoa và tiến độ hoàn thành hồ sơ.

#### B. Hồ sơ chính thức (Từ Đảng viên Dự bị lên Đảng viên Chính thức)
1. **Quản lý hồ sơ**: Theo dõi tiến độ hoàn thành các văn bản phục vụ chuyển chính thức (Bản tự kiểm điểm, Ý kiến nhận xét chi đoàn, Ý kiến nhận xét nơi cư trú 213,...).
2. **Hồ sơ đã chính thức**: Danh sách đảng viên dự bị đã nhận quyết định công nhận Đảng viên chính thức.
3. **Thống kê số lượng**: Thống kê số lượng đảng viên chuyển chính thức thành công.

---

### 2.4. Sinh hoạt Chi bộ & Điểm danh
*Truy cập từ menu: **Sinh hoạt Chi bộ**.*

- **Lịch họp & Thông báo**: Bí thư/Chi ủy tạo lịch họp chi bộ định kỳ hoặc đột xuất, đính kèm tài liệu sinh hoạt. Hệ thống gửi thông báo tự động cho đảng viên.
- **Đăng ký xin vắng**: Đảng viên nếu bận lịch học/lịch thi trùng giờ họp có thể nộp đơn xin vắng kèm lý do trực tiếp trên hệ thống để Quản trị viên hệ thống xét duyệt.
- **Điểm danh sinh hoạt**: 
  - **Dành cho Quản trị viên hệ thống**: Quản lý và thực hiện điểm danh cho đảng viên bằng cách bật nhận diện khuôn mặt tự động (Face ID), quét mã vạch trên thẻ đảng viên hoặc điểm danh thủ công nhanh.
  - **Dành cho Đảng viên**: Tra cứu trực tuyến lịch sử chuyên cần cá nhân (số buổi tham gia, vắng phép, vắng không phép) và biểu đồ tỷ lệ chuyên cần trực quan.

### 2.5. Biểu quyết Chi bộ (Voting)
*Truy cập từ menu: **Biểu quyết Chi bộ**.*
- Quản trị viên hệ thống tạo các nội dung biểu quyết (ví dụ: Biểu quyết kết nạp quần chúng, biểu quyết công nhận đảng viên chính thức, biểu quyết xếp loại cuối năm).
- Thiết lập thông số: Điểm học tập tối thiểu, điểm rèn luyện tối thiểu của học kỳ gần nhất và học kỳ trước đó để làm cơ sở đối chiếu.
- Đảng viên tham gia bỏ phiếu trực tuyến công khai hoặc bỏ phiếu kín. Hệ thống tự động tổng hợp kết quả bầu chọn theo tỷ lệ % đạt yêu cầu.

### 2.6. Quản lý 213 (Sinh hoạt nơi cư trú)
*Truy cập từ menu: **Đăng ký 213**.*
- Giúp đảng viên dễ dàng kê khai thông tin nơi cư trú, tải lên file scan Phiếu giới thiệu 213 và Bản nhận xét đảng viên sinh hoạt nơi cư trú định kỳ hàng năm.
- Quản trị viên hệ thống dễ dàng thống kê, xuất file Excel danh sách gửi về các Đảng ủy phường/xã để quản lý.

---

## 3. TÍNH NĂNG TỰ ĐỘNG HÓA - TẠO BIỂU MẪU HỒ SƠ (DOCUMENT GENERATOR)

Hệ thống tích hợp công cụ tự động điền thông tin đảng viên vào các mẫu văn bản Đảng chuẩn quy định, giúp tiết kiệm thời gian viết tay và tránh sai sót thông tin:

### 3.1. Các biểu mẫu hỗ trợ tự động sinh
- **Mẫu hồ sơ kết nạp**: Lý lịch đảng viên, Đơn xin vào Đảng, Giới thiệu quần chúng ưu tú,...
- **Mẫu chuyển chính thức**: Bản tự kiểm điểm của đảng viên dự bị, Nhận xét đảng viên dự bị của đảng viên hướng dẫn, Nghị quyết đề nghị công nhận đảng viên chính thức,...
- **Mẫu chuyển sinh hoạt Đảng**: Bản tự kiểm điểm chuyển sinh hoạt Đảng, Phiếu chuyển sinh hoạt Đảng,...

### 3.2. Các bước thực hiện tạo biểu mẫu
1. Truy cập menu **Tạo biểu mẫu hồ sơ** (nằm trong mục *Hồ sơ chính thức* hoặc *Hồ sơ chuyển ra*).
2. Tìm kiếm và chọn đảng viên cần tạo biểu mẫu.
3. Lựa chọn loại biểu mẫu muốn xuất.
4. Kiểm tra các thông tin hiển thị trước trên màn hình (Hệ thống tự động lấy dữ liệu từ hồ sơ của đảng viên đó trên cơ sở dữ liệu Firestore).
5. Nhấp nút **Tải xuống văn bản (Tải file Word)**. Hệ thống sẽ sinh file `.docx` định dạng chuẩn để người dùng tải về chỉnh sửa hoặc in trực tiếp.

---

## 4. HƯỚNG DẪN XỬ LÝ SỰ CỐ THƯỜNG GẶP

1. **Không đăng nhập được**:
   - Kiểm tra xem mật khẩu có bật Caps Lock không.
   - Liên hệ Quản trị viên (`ADMIN`) để đặt lại mật khẩu nếu bị quên.
2. **Không thấy nút "Tải biểu mẫu"**:
   - Bạn cần liên hệ Bí thư/Phó Bí thư để được cấp quyền hoặc kiểm tra xem tài khoản của bạn đã được gắn cờ "Yêu cầu làm hồ sơ" (`yeu_cau_lam_ho_so`) chưa.
3. **Lỗi khi xuất file Word (.docx)**:
   - Hãy chắc chắn rằng bạn đã điền đầy đủ các thông tin cá nhân bắt buộc trong trang **Hồ sơ cá nhân** (đặc biệt là Ngày vào Đảng, Ngày chính thức, Số quyết định). Các trường trống có thể khiến biểu mẫu bị khuyết thông tin.

---
*Tài liệu được cập nhật mới nhất vào tháng 06/2026 bởi Ban Chỉ bộ Sinh viên.*
