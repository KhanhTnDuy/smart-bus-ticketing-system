#!/usr/bin/env bash
# SCRUM-106: phục hồi CSDL từ file sao lưu do backup.sh tạo ra.
#   CONFIRM_RESTORE=1 ./restore.sh <file.sql>
# GHI ĐÈ toàn bộ CSDL đích, nên bắt buộc đặt CONFIRM_RESTORE=1.
# Biến môi trường: MYSQL_BIN_DIR, MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD
set -euo pipefail

file="${1:-}"
if [ -z "$file" ] || [ ! -f "$file" ]; then
  echo "Thiếu file sao lưu. Dùng: CONFIRM_RESTORE=1 $0 <file.sql>" >&2
  exit 2
fi
if [ "${CONFIRM_RESTORE:-}" != "1" ]; then
  echo "Lệnh này ghi đè CSDL trong file sao lưu. Đặt CONFIRM_RESTORE=1 để xác nhận." >&2
  exit 2
fi

bin_dir="${MYSQL_BIN_DIR:-}"
host="${MYSQL_HOST:-localhost}"
port="${MYSQL_PORT:-3306}"
user="${MYSQL_USER:-root}"
client="${bin_dir:+$bin_dir/}mysql"

# File do backup.sh tạo có sẵn CREATE DATABASE/USE nên không cần chỉ định tên CSDL.
"$client" -h "$host" -P "$port" -u "$user" ${MYSQL_PASSWORD:+-p"$MYSQL_PASSWORD"} < "$file"

echo "Đã phục hồi từ: $file"
