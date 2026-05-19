#  HỆ THỐNG QUẢN LÝ VÀ DỰ TRÙ VẬT TƯ THỰC TẬP - KHOA CƠ KHÍ

Giải pháp phần mềm hỗ trợ số hóa quy trình quản lý, phân công giảng dạy, dự trù phân phối vật tư tiêu hao và công cụ dụng cụ thực tập động theo từng học kỳ - năm học tại Trường Cao đẳng.


## Tính năng
- **Quản lý danh mục vật tư:** Theo dõi chi tiết tên hàng, đơn vị tính, đơn giá, quy cách kỹ thuật và định mức kinh tế kỹ thuật (ĐMKTKT).
- **Phân công giảng viên & Lớp học:** Quản lý danh sách lớp, sĩ số, mức định mức học phí/sinh viên được trích chi cho vật tư.
- **Dự trù & Tổng hợp tự động:** Tự động gom nhóm dữ liệu vật tư trùng lặp theo giảng viên hoặc theo mô-đun cụ thể.
- **Xuất dữ liệu Excel chuẩn hóa:** Hỗ trợ xuất file Excel báo cáo thống kê theo lớp hoặc tổng hợp học kỳ đồng bộ biểu mẫu Quốc hiệu chuẩn của trường, định dạng bảng biểu tự động chỉ với 1 click chuột.

##  Cấu trúc dự án
```text
QUAN_LY_VAT_TU_PRO/
├── Database_Storage/     # Chứa file cấu trúc cơ sở dữ liệu gốc (.sql)
├── Source_App/           # Mã nguồn ứng dụng Web NodeJS
│   ├── config/           # Cấu hình kết nối hệ thống
│   ├── controll/         # Bộ điều khiển xử lý logic nghiệp vụ
│   ├── route/            # Định tuyến hệ thống URL
│   ├── view/             # Giao diện hiển thị (.ejs)
│   ├── Dockerfile        # File đóng gói ứng dụng Node.js thành Docker Image
│   ├── docker-compose.yml# File cấu hình chạy đồng thời Container Node.js và MySQL
│   ├── .dockerignore     # Bỏ qua các file rác khi build Docker
│   ├── server.js         # File khởi chạy server chính
│   └── package.json      # Khai báo thư viện phụ thuộc
├── RUN.bat               # File khởi tạo server 
└── EXIT.bat              # File exit, lưu dữ liệu


## Hướng dẫn cài đặt và sử dụng)

### 1. Chuẩn bị môi trường
Người dùng cài đặt duy nhất phần mềm nền tảng:
* **Docker Desktop** (Tải và cài đặt tại: [Docker Desktop Official](https://www.docker.com/products/docker-desktop/))

> ⚠️ **Lưu ý quan trọng:** Đảm bảo phần mềm **Docker Desktop** đã được kích hoạt và đang chạy ngầm dưới thanh Taskbar trước khi thực hiện bước tiếp theo.

---

### 2. Khởi chạy ứng dụng (Môi trường Windows)
- Chạy ứng dụng docker desktop.
- Chạy file **RUN.bat** ở thư mục gốc.
- Màn hình dòng lệnh (cmd) xuất hiện, truy cập vào địa chỉ hiện ra.
- Việc chạy file **`EXIT.bat`** trước khi tắt máy không bắt buộc, tuy nhiên nó giúp giải phóng bộ nhớ.
