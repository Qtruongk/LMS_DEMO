#!/usr/bin/env bash
set -e

echo "=== KHỞI ĐỘNG HỆ THỐNG VAT LMS (BACKEND + FRONTEND + NGINX) ==="

# 1. Dọn dẹp tiến trình cũ
echo "[1/4] Dọn dẹp tiến trình cũ trên các cổng 80, 443, 3000, 5173, 34381..."
fuser -k 3000/tcp 5173/tcp 34381/tcp 2>/dev/null || true
sleep 1

# 2. Khởi động Backend (Express API trên cổng 3000)
echo "[2/4] Khởi động Backend API (Port 3000)..."
cd /root/lms_demo/backend
nohup npm run dev > /root/lms_demo/backend_server.log 2>&1 &
echo "Backend PID: $!"

# 3. Khởi động Frontend (Vite trên cổng 5173)
echo "[3/4] Khởi động Frontend Vite (Port 5173, Dual-Stack)..."
cd /root/lms_demo/frontend
nohup npm run dev > /root/lms_demo/frontend_server.log 2>&1 &
echo "Frontend PID: $!"

# 4. Khởi động Forwarder cổng 34381
echo "[4/4] Khởi động Forwarder cổng 34381 -> 5173..."
cd /root/lms_demo
nohup node forwarder_34381.cjs > /root/lms_demo/forwarder_server.log 2>&1 &
echo "Forwarder PID: $!"

# 5. Đảm bảo Nginx đang chạy và cấu hình đúng
if command -v nginx >/dev/null 2>&1; then
    echo "Reloading Nginx (Port 80 & 443)..."
    nginx -t && nginx -s reload 2>/dev/null || systemctl restart nginx 2>/dev/null || nginx
fi

sleep 3
echo "=== KIỂM TRA TRẠNG THÁI CÁC CỔNG ==="
ss -tlpn | grep -E ':(80|443|3000|5173|34381) ' || true

echo "=== HOÀN TẤT KHỞI ĐỘNG ==="
echo "Địa chỉ truy cập:"
echo "  1. Trực tiếp LAN:  http://192.168.1.248 (Cổng 80 - không cần gõ port)"
echo "  2. Trực tiếp LAN:  http://192.168.1.248:5173"
echo "  3. Localhost:      http://localhost:5173"
echo "  4. Localhost:      http://127.0.0.1:5173"
echo "  5. Localhost:      http://localhost"
