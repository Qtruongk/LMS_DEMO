#!/bin/bash
# Health Check & Auto-Recovery Script for VAT LMS
# Path: /root/lms_demo/scripts/healthcheck_and_recover.sh

LOG_FILE="/root/lms_demo/logs/system_health.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

mkdir -p /root/lms_demo/logs

check_port() {
    local port=$1
    local name=$2
    if ss -tulpn | grep -q ":$port "; then
        echo "[$TIMESTAMP] [OK] $name listening on port $port" >> "$LOG_FILE"
        return 0
    else
        echo "[$TIMESTAMP] [ERROR] $name is NOT listening on port $port!" >> "$LOG_FILE"
        return 1
    fi
}

echo "--- Health check at $TIMESTAMP ---" >> "$LOG_FILE"

# Check NGINX (80)
check_port 80 "NGINX (Web Portal)"
if [ $? -ne 0 ]; then
    echo "[$TIMESTAMP] Attempting to start NGINX..." >> "$LOG_FILE"
    systemctl restart nginx >> "$LOG_FILE" 2>&1
fi

# Check Frontend (5173)
check_port 5173 "Vite Frontend"

# Check Backend (3000)
check_port 3000 "Express Backend"

# Check Forwarder (34381)
check_port 34381 "Port Forwarder 34381"

# Check HTTP 200 responses
HTTP_80=$(python3 -c "import socket; s=socket.socket(); s.settimeout(2); s.connect(('127.0.0.1', 80)); s.send(b'GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n'); print(s.recv(20).decode('utf-8', 'ignore'))" 2>/dev/null)
HTTP_5173=$(python3 -c "import socket; s=socket.socket(); s.settimeout(2); s.connect(('127.0.0.1', 5173)); s.send(b'GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n'); print(s.recv(20).decode('utf-8', 'ignore'))" 2>/dev/null)

echo "[$TIMESTAMP] HTTP Probe Port 80: $HTTP_80" >> "$LOG_FILE"
echo "[$TIMESTAMP] HTTP Probe Port 5173: $HTTP_5173" >> "$LOG_FILE"

# Keep last 500 lines only to avoid disk filling
if [ $(wc -l < "$LOG_FILE") -gt 500 ]; then
    tail -n 300 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
fi
