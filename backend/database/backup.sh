#!/usr/bin/env bash
# SCRUM-106: sao lưu CSDL ra một file .sql kèm ngày giờ.
#   ./backup.sh [thư mục đích]            (mặc định: backups/ cạnh script này)
# Biến môi trường: MYSQL_BIN_DIR, MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
out_dir="${1:-$here/backups}"
bin_dir="${MYSQL_BIN_DIR:-}"
host="${MYSQL_HOST:-localhost}"
port="${MYSQL_PORT:-3306}"
user="${MYSQL_USER:-root}"
db="${MYSQL_DB:-smart_bus_ticketing}"

dump="${bin_dir:+$bin_dir/}mysqldump"
mkdir -p "$out_dir"
file="$out_dir/${db}_$(date +%Y%m%d_%H%M%S).sql"

# --single-transaction: bản sao nhất quán mà không khóa bảng (InnoDB).
# --routines --events --triggers: giữ cả thủ tục, lịch và trigger, không chỉ dữ liệu.
"$dump" -h "$host" -P "$port" -u "$user" ${MYSQL_PASSWORD:+-p"$MYSQL_PASSWORD"} \
  --single-transaction --routines --events --triggers --databases "$db" > "$file"

echo "Đã sao lưu: $file ($(wc -c < "$file") byte)"
