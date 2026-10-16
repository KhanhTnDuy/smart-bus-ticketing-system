#!/usr/bin/env bash
# ===================================================================
# Script nạp lại dữ liệu demo Smart Bus Ticketing (Bash / Linux / macOS / WSL)
# ===================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/smart-bus-demo-data.sql"

HOST="${MYSQL_HOST:-127.0.0.1}"
PORT="${MYSQL_PORT:-3306}"
USER="${MYSQL_USER:-root}"
PASSWORD="${MYSQL_PASSWORD:-}"
DATABASE="${MYSQL_DB:-smart_bus_ticketing}"

echo "===================================================================="
echo "🔄 NẠP LẠI DỮ LIỆU DEMO SMART BUS TICKETING (BASH)"
echo "===================================================================="
echo "📌 Máy chủ      : ${HOST}:${PORT}"
echo "📌 Tài khoản    : ${USER}"
echo "📌 Cơ sở dữ liệu: ${DATABASE}"
echo "📌 File SQL     : ${SQL_FILE}"
echo "--------------------------------------------------------------------"

if [ ! -f "${SQL_FILE}" ]; then
  echo "❌ Không tìm thấy file dữ liệu: ${SQL_FILE}"
  exit 1
fi

MYSQL_CMD=(mysql -h "${HOST}" -P "${PORT}" -u "${USER}" --default-character-set=utf8mb4)
if [ -n "${PASSWORD}" ]; then
  MYSQL_CMD+=("-p${PASSWORD}")
fi

echo "⏳ Đang nạp dữ liệu vào MySQL..."
"${MYSQL_CMD[@]}" < "${SQL_FILE}"

echo "✅ Nạp dữ liệu thành công!"
echo "--------------------------------------------------------------------"

# Kiểm tra số chuyến tương lai
FUTURE_COUNT=$("${MYSQL_CMD[@]}" -N -D "${DATABASE}" -e "SELECT COUNT(*) FROM trips WHERE Status='Scheduled' AND BusId IS NOT NULL AND DepartureAt > DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE);")
echo "🚍 Số chuyến tương lai sẵn sàng đặt vé: ${FUTURE_COUNT}"

echo "👤 7 tài khoản demo sẵn sàng (Mật khẩu: Admin@12345):"
echo "   - admin (Admin)"
echo "   - manager (Manager)"
echo "   - driver1, driver2 (Driver)"
echo "   - conductor1, conductor2 (Conductor)"
echo "   - passenger1 (Passenger)"
echo "===================================================================="
