#!/usr/bin/env bash
set -e

echo "=== KHỞI ĐỘNG HỆ THỐNG VAT LMS (SYSTEMD + NGINX) ==="

echo "[1/4] Khởi động lại LMS Backend (Port 3000)..."
systemctl restart lms-backend

echo "[2/4] Khởi động lại LMS Frontend (Port 5173)..."
systemctl restart lms-frontend

echo "[3/4] Khởi động lại LMS Port Forwarder (Port 34381)..."
systemctl restart lms-forwarder

echo "[4/4] Kiểm tra và reload NGINX (Port 80 & 443)..."
nginx -t && systemctl reload nginx 2>/dev/null || systemctl restart nginx

sleep 3
echo "=== KIỂM TRA TRẠNG THÁI CÁC DỊCH VỤ ==="
systemctl status lms-backend lms-frontend lms-forwarder nginx --no-pager

echo ""
echo "=== KIỂM TRA TRẠNG THÁI CÁC CỔNG ==="
ss -tlpn | grep -E ':(80|443|3000|5173|34381) ' || true

echo "=== HOÀN TẤT KHỞI ĐỘNG ==="
echo "Dịch vụ đã được cấu hình tự khởi động cùng hệ thống qua Systemd."
