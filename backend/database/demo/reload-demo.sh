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

# SCRUM-87: Dời ngày chuyến theo hôm nay để luôn có ít nhất 4 chuyến tương lai
SHIFT_SQL="SET @ref_date = (SELECT DATE(DepartureAt) FROM trips WHERE Id = 4); SET @day_diff = DATEDIFF(CURRENT_DATE(), @ref_date); UPDATE trips SET DepartureAt = DATE_ADD(DepartureAt, INTERVAL @day_diff DAY);"
"${MYSQL_CMD[@]}" -D "${DATABASE}" -e "${SHIFT_SQL}"

# Kiểm tra và đảm bảo có ít nhất 4 chuyến tương lai (> UTC_TIMESTAMP + 30 phút)
CHECK_SQL="SELECT COUNT(*) FROM trips WHERE Status='Scheduled' AND BusId IS NOT NULL AND DepartureAt > DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE);"
FUTURE_COUNT=$("${MYSQL_CMD[@]}" -N -D "${DATABASE}" -e "${CHECK_SQL}")

while [ "${FUTURE_COUNT:-0}" -lt 4 ]; do
  "${MYSQL_CMD[@]}" -D "${DATABASE}" -e "UPDATE trips SET DepartureAt = DATE_ADD(DepartureAt, INTERVAL 1 DAY);"
  FUTURE_COUNT=$("${MYSQL_CMD[@]}" -N -D "${DATABASE}" -e "${CHECK_SQL}")
done

echo "🚍 Số chuyến tương lai sẵn sàng đặt vé: ${FUTURE_COUNT}"

echo ""
echo "👤 7 tài khoản demo sẵn sàng (Mật khẩu: Admin@12345):"
echo "   - admin (Admin): Hoạt động"
echo "   - manager (Manager): Hoạt động"
echo "   - driver1, driver2 (Driver): Hoạt động"
echo "   - conductor1, conductor2 (Conductor): Hoạt động"
echo "   - passenger1 (Passenger): Hoạt động"
echo "===================================================================="
