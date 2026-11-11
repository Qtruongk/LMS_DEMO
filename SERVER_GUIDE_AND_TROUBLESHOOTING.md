# NHẬT KÝ HỆ THỐNG & HƯỚNG DẪN TRÁNH LỖI KẾT NỐI (SERVER LOG & TROUBLESHOOTING)

> **Mục đích**: Ghi nhớ và phân tích chi tiết nguyên nhân gốc rễ của lỗi `ERR_EMPTY_RESPONSE` ("localhost didn't send any data"), cung cấp giải pháp khắc phục triệt để và cơ chế tự phục hồi (auto-recovery) để hệ thống Frontend & Backend luôn hoạt động ổn định.

---

## 1. PHÂN TÍCH NGUYÊN NHÂN GỐC RỄ LỖI `ERR_EMPTY_RESPONSE`

Hệ thống VAT LMS chạy trên máy chủ ảo Linux (LXC Container) có địa chỉ mạng nội bộ LAN:
**`192.168.1.248`**

Khi bạn mở trình duyệt Google Chrome trên máy tính cá nhân (Laptop/PC Windows hoặc Mac) và gõ `localhost`, lỗi `ERR_EMPTY_RESPONSE` xảy ra do các nguyên nhân chính sau:

```
[Máy tính cá nhân (Laptop)]                               [Máy chủ Linux Container]
Trình duyệt Chrome                                        IP LAN: 192.168.1.248
       │                                                            │
       ├── gõ "localhost" (không có port) ──> Gửi vào Port 80 của Laptop (Không có dữ liệu => ERR_EMPTY_RESPONSE)
       │                                                            │
       └── gõ "http://192.168.1.248" ────────(Mạng LAN WiFi)───────> Port 80 (NGINX -> Vite 5173) => 200 OK ✅
       │                                                            │
       └── gõ "http://192.168.1.248:5173" ───(Mạng LAN WiFi)───────> Port 5173 (Vite Server) => 200 OK ✅
```

### Chi tiết các yếu tố gây lỗi:

1. **Gõ `localhost` mà không có số cổng `:5173`**:
   - Trình duyệt Chrome tự động gửi request đến cổng mặc định **80 (HTTP)** hoặc **443 (HTTPS)** của *chính máy tính cá nhân của bạn* (Host PC), không phải máy chủ Linux container.
   - Trên máy tính cá nhân (Windows), cổng 80 thường do dịch vụ IIS hoặc HTTP.sys chiếm giữ nhưng không có website nào chạy, nên nó lập tức ngắt kết nối và Chrome báo: `ERR_EMPTY_RESPONSE` (localhost didn't send any data).

2. **Cơ chế chuyển tiếp cổng (Port Forwarding) của VS Code SSH**:
   - Khi bạn kết nối vào máy chủ qua Remote SSH, VS Code tự động chuyển tiếp một số cổng (như 5173 hoặc 3000).
   - Tuy nhiên, VS Code **không bao giờ tự động chuyển tiếp cổng 80** (vì cổng 80 trên Windows/Mac yêu cầu quyền Administrator). Do đó, gõ `localhost` (cổng 80) trên laptop sẽ không bao giờ tới được máy chủ nếu không dùng địa chỉ IP `192.168.1.248`.

3. **IPv6 vs IPv4 (`::1` vs `127.0.0.1`)**:
   - Google Chrome trên máy tính có xu hướng ưu tiên phân giải `localhost` sang IPv6 `::1`.
   - Nếu dịch vụ chỉ lắng nghe trên IPv4 `0.0.0.0`, request IPv6 gửi tới sẽ bị từ chối kết nối. Hiện tại, chúng tôi đã cấu hình **Dual-Stack (`::`)** cho cả Vite, Express và Nginx để hỗ trợ cả IPv4 lẫn IPv6.

4. **Kiểm duyệt Host Header của Vite**:
   - Vite 5/6 có cơ chế bảo mật chặn request nếu Host header không khớp (`Blocked request. This host is not allowed`).
   - Đã được khắc phục triệt để bằng cấu hình `allowedHosts: true` và `cors: true` trong `frontend/vite.config.ts`.

---

## 2. CÁC ĐỊA CHỈ TRUY CẬP ĐẢM BẢO 100% THÀNH CÔNG

### 🟢 Cách 1: Truy cập trực tiếp qua IP LAN (KHUYÊN DÙNG NHẤT - 100% HOẠT ĐỘNG)
Mở Chrome trên máy tính hoặc điện thoại (chung mạng WiFi/LAN) và bấm vào:
- **`http://192.168.1.248`** *(Cổng 80 chuẩn - không cần gõ số cổng, NGINX tự động mở giao diện LMS)*
- **`http://192.168.1.248:5173`** *(Truy cập trực tiếp máy chủ Vite)*

### 🟢 Cách 2: Truy cập qua Localhost (Khi dùng tính năng Port Forwarding trong VS Code)
Nếu bạn muốn dùng từ khóa `localhost`:
1. Mở cửa sổ VS Code / Antigravity IDE.
2. Ở thanh công cụ bên dưới (cạnh Terminal, Output), chọn tab **PORTS** (Cổng).
3. Đảm bảo cổng **5173** có trong danh sách (nếu chưa có, bấm **Add Port** và nhập `5173`).
4. Truy cập đúng đường dẫn có số cổng:
   - **`http://localhost:5173`**
   - Hoặc **`http://127.0.0.1:5173`** *(khuyên dùng vì không bị lỗi phân giải IPv6)*

> ⚠️ **Lưu ý quan trọng**: Không gõ mỗi chữ `localhost` đơn độc vì trình duyệt sẽ hiểu là `localhost:80` trên máy tính cá nhân của bạn.

---

## 3. CƠ CHẾ TỰ BẢO VỆ & AUTO-RECOVERY ĐÃ THIẾT LẬP

Để đảm bảo hệ thống không bao giờ bị tắt hoặc mất kết nối, các cơ chế sau đã được kích hoạt:

1. **Auto-Recovery Cron Job (`/root/lms_demo/scripts/healthcheck_and_recover.sh`)**:
   - Tự động chạy mỗi 2 phút trong Crontab hệ thống.
   - Kiểm tra liên tục 4 cổng: **80 (NGINX)**, **5173 (Vite)**, **3000 (Backend)**, **34381 (Forwarder)**.
   - Tự động thăm dò HTTP Probe 200 OK. Nếu phát hiện dịch vụ bị rơi, lập tức khôi phục.
   - Ghi nhật ký vào file: `/root/lms_demo/logs/system_health.log`.

2. **Kịch bản khởi động 1 chạm (`/root/lms_demo/scripts/start_all.sh`)**:
   - Nếu bạn cần khởi động lại toàn bộ từ đầu, chỉ cần chạy 1 lệnh:
     ```bash
     bash /root/lms_demo/scripts/start_all.sh
     ```

3. **Cấu hình Dual-Stack & Allowed Hosts**:
   - [frontend/vite.config.ts](file:///root/lms_demo/frontend/vite.config.ts):
     `host: '::'`, `port: 5173`, `strictPort: true`, `allowedHosts: true`, `cors: true`.
   - [backend/src/index.ts](file:///root/lms_demo/backend/src/index.ts):
     `app.listen(port, '::')`.

---

## 4. TÀI KHOẢN ĐĂNG NHẬP THỬ NGHIỆM TÍNH NĂNG MỚI

- **Tài khoản học sinh**: `lenguyenminhthytienganh01`
- **Mật khẩu**: `TA9@01`
- **Tính năng mới**: Biểu đồ chuỗi 6 bài kiểm tra (từ 6.0 → 9.4 điểm, tăng trưởng +3.4đ) với đầy đủ 4 thẻ thống kê, đường trung bình, điểm mục tiêu 8.0, phân tích nhận xét của giáo viên tại:
  - Trang chủ học sinh (Student Dashboard)
  - Tab Bảng điểm trong Chi tiết lớp học (Gradebook Tab)

---

## 5. FILE LOG HỆ THỐNG ĐỂ THEO DÕI TRẠNG THÁI

| File Log | Vị trí | Mục đích |
| :--- | :--- | :--- |
| **Nhật ký sức khỏe tự động** | `/root/lms_demo/logs/system_health.log` | Ghi nhận kết quả kiểm tra định kỳ mỗi 2 phút |
| **Frontend Log** | `/root/lms_demo/frontend_server.log` | Nhật ký hoạt động của Vite server |
| **Backend Log** | `/root/lms_demo/backend_server.log` | Nhật ký hoạt động của Express API |
| **Forwarder Log** | `/root/lms_demo/forwarder_server.log` | Nhật ký chuyển tiếp cổng 34381 |
