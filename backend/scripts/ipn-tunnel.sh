#!/usr/bin/env bash
# SCRUM-105: dựng địa chỉ công khai cho IPN VNPay.
#
# VNPay sandbox không gọi được vào localhost, nên muốn nhận IPN (nguồn chốt giao dịch chính thức) phải có một
# địa chỉ công khai trỏ về backend đang chạy ở máy dev.
#
#   ./ipn-tunnel.sh [cổng backend]        (mặc định 5180)
#
# Cần sẵn `ngrok` hoặc `cloudflared` trong PATH. Script in ra đúng địa chỉ IPN để dán vào trang quản trị
# merchant VNPay, rồi giữ đường hầm chạy cho tới khi bấm Ctrl+C.
set -euo pipefail

port="${1:-5180}"
backend="http://127.0.0.1:${port}"

if ! curl -fsS "${backend}/api/health" > /dev/null 2>&1; then
  echo "Backend chưa chạy ở ${backend}. Khởi động backend trước rồi chạy lại." >&2
  exit 2
fi

if command -v ngrok > /dev/null 2>&1; then
  tool=ngrok
elif command -v cloudflared > /dev/null 2>&1; then
  tool=cloudflared
else
  cat >&2 <<'MSG'
Không tìm thấy ngrok hay cloudflared.
  ngrok:       https://ngrok.com/download  (cần đăng ký tài khoản, rồi `ngrok config add-authtoken <token>`)
  cloudflared: https://developers.cloudflare.com/cloudflare-tunnel/  (chạy thử không cần tài khoản)
MSG
  exit 2
fi

echo "Đang mở đường hầm bằng ${tool} tới ${backend} ..."
log="$(mktemp)"
if [ "$tool" = "ngrok" ]; then
  ngrok http "$port" --log stdout > "$log" 2>&1 &
else
  cloudflared tunnel --url "$backend" > "$log" 2>&1 &
fi
tunnel_pid=$!
trap 'kill "$tunnel_pid" 2>/dev/null || true; rm -f "$log"' EXIT

public=""
for _ in $(seq 1 60); do
  sleep 1
  if [ "$tool" = "ngrok" ]; then
    # ngrok mở sẵn API cục bộ ở cổng 4040, đọc địa chỉ từ đó chắc chắn hơn là bóc từ log.
    public="$(curl -fsS http://127.0.0.1:4040/api/tunnels 2>/dev/null \
      | grep -o 'https://[a-zA-Z0-9.-]*\.ngrok[a-z.-]*' | head -1 || true)"
  else
    # cloudflared in địa chỉ ra log trước khi kết nối được đăng ký; chờ cả hai, nếu không thì gọi thử sẽ lỗi oan.
    if grep -q 'Registered tunnel connection' "$log" 2>/dev/null; then
      public="$(grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' "$log" | head -1 || true)"
    fi
  fi
  [ -n "$public" ] && break
done

if [ -z "$public" ]; then
  echo "Không lấy được địa chỉ công khai. Nhật ký:" >&2
  tail -20 "$log" >&2
  exit 1
fi

# Kiểm tra đường hầm thật sự tới được backend trước khi bảo người dùng dán địa chỉ vào VNPay.
# Tên miền vừa cấp cần vài giây để phân giải được, nên thử lại thay vì kết luận ngay là hỏng.
healthy=""
for _ in $(seq 1 12); do
  if curl -fsS --max-time 10 "${public}/api/health" 2>/dev/null | grep -q '"status":"ok"'; then
    healthy=1
    break
  fi
  sleep 3
done

if [ -n "$healthy" ]; then
  echo "Đường hầm đã thông tới backend."
else
  echo "Mở được đường hầm nhưng ${public}/api/health không trả lời đúng sau 36 giây. Kiểm tra lại backend và mạng." >&2
  exit 1
fi

cat <<MSG

Địa chỉ công khai: ${public}

Dán vào trang quản trị merchant VNPay (mục IPN URL):
  ${public}/api/payments/vnpay/ipn

Đặt luôn cho backend nếu muốn khách quay về qua địa chỉ này:
  Payments__VnPay__ReturnUrl=${public}/passenger/payment-result

Kiểm thử đầu-cuối qua chính đường hầm này (cửa sổ khác):
  CONFIRM_TEST_DB=1 PUBLIC_BASE_URL=${public} node tests/payments/vnpay-ipn-e2e.mjs

Ctrl+C để đóng đường hầm.
MSG

wait "$tunnel_pid"
