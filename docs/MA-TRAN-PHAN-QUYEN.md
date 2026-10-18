# Ma trận phân quyền vai x endpoint (SCRUM-95)

Sinh tự động bởi `tests/regression/permissions.mjs`: 117 endpoint x 6 (5 vai và chưa đăng nhập) = 702 ô, mỗi ô là một lời gọi thật.

`✓` được phép (không bị 401/403) · `✗ 401` chưa đăng nhập bị chặn · `✗ 403` sai vai bị chặn · `🔑` webhook tự xác thực bằng khóa riêng (thiếu khóa thì 401 với mọi vai) · `⚠` lệch so với attribute.

| Endpoint | Ẩn danh | Admin | Manager | Driver | Conductor | Passenger |
|---|---|---|---|---|---|---|
| `GET api/accounts` | ✗ 401 | ✓ | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/accounts/{id:long}` | ✗ 401 | ✓ | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 |
| `POST api/accounts` | ✗ 401 | ✓ | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 |
| `PUT api/accounts/{id:long}` | ✗ 401 | ✓ | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 |
| `PATCH api/accounts/{id:long}/role` | ✗ 401 | ✓ | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 |
| `DELETE api/accounts/{id:long}` | ✗ 401 | ✓ | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/audit-logs` | ✗ 401 | ✓ | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/audit-logs/{id:long}` | ✗ 401 | ✓ | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 |
| `POST api/auth/login` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST api/auth/logout` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/auth/me` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/bookings/my` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST api/bookings/{id:long}/cancel` | ✗ 401 | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 | ✓ |
| `POST api/bookings` | ✗ 401 | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 | ✓ |
| `GET api/buses` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/buses/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `POST api/buses` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `PUT api/buses/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `DELETE api/buses/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/discount-applications` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/discount-applications/my` | ✗ 401 | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 | ✓ |
| `POST api/discount-applications` | ✗ 401 | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 | ✓ |
| `POST api/discount-applications/{id:long}/review` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/distance-fares` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/distance-fares/routes/{routeId:long}` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST api/distance-fares` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `PUT api/distance-fares/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `DELETE api/distance-fares/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/feedback` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/feedback/my` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/feedback/{id:long}` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST api/feedback` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `PATCH api/feedback/{id:long}/status` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/health` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/incidents` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/incidents/{id:long}` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST api/incidents` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `PATCH api/incidents/{id:long}/resolve` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/notifications/my` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `PATCH api/notifications/{id:long}/read` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST api/notifications/read-all` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/reports/occupancy` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `POST api/payments` | ✗ 401 | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 | ✓ |
| `POST api/payments/{id:long}/confirm-transfer` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `POST api/payments/bank-transfer/webhook` | 🔑 khóa API | 🔑 khóa API | 🔑 khóa API | 🔑 khóa API | 🔑 khóa API | 🔑 khóa API |
| `GET api/payments/vnpay/ipn` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/payments/vnpay/return` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/payments/my` | ✗ 401 | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 | ✓ |
| `GET api/payments` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/payments/{id:long}` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST api/invoices/{id:long}/send` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✓ |
| `GET api/invoices/my` | ✗ 401 | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 | ✓ |
| `GET api/invoices` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/invoices/summary` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/invoices/{id:long}` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/refunds` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/refunds/my` | ✗ 401 | ✗ 403 | ✗ 403 | ✗ 403 | ✗ 403 | ✓ |
| `PATCH api/refunds/{id:long}/process` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/refunds/tiers` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `PUT api/refunds/tiers` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/reports/revenue` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/routes` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/routes/{id:long}` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST api/routes` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `PUT api/routes/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `DELETE api/routes/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/routes/{id:long}/stops` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `PUT api/routes/{id:long}/stops` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/stops` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/stops/{id:long}` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST api/stops` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `PUT api/stops/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `DELETE api/stops/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/fares` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST api/fares` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `PUT api/fares/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `DELETE api/fares/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/passenger-types` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/schedules` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/schedules/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `POST api/schedules` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `PUT api/schedules/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `DELETE api/schedules/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/schedules/{id:long}/trips` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `POST api/schedules/{id:long}/generate-trips` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/ticket-change-requests/my` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/ticket-change-requests` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `POST api/ticket-change-requests/{id:long}/approve` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `POST api/ticket-change-requests/{id:long}/reject` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `POST api/ticket-scans` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✗ 403 |
| `GET api/ticket-scans` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✗ 403 |
| `POST api/tickets/{id:long}/cancel` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `POST api/tickets/{id:long}/exchange` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/assignments` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✗ 403 |
| `GET api/assignments/{id}` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✗ 403 |
| `POST api/assignments` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `PUT api/assignments/{id}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `PUT api/assignments/{id}/trip` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `DELETE api/assignments/{id}/trip` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `DELETE api/assignments/{id}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `POST api/assignments/batch` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `POST api/assignments/check-conflict` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/assignments/available-buses` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/assignments/available-staff` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/assignments/my-schedule` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✗ 403 |
| `GET api/trips/search` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/trips/{tripId:long}/seats` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/statistics/trips/occupancy` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `POST api/uploads` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/uploads/{name}` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET api/vouchers` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/vouchers/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `POST api/vouchers` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `PUT api/vouchers/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `DELETE api/vouchers/{id:long}` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `GET api/vouchers/check-code` | ✗ 401 | ✓ | ✓ | ✗ 403 | ✗ 403 | ✗ 403 |
| `POST api/vouchers/validate` | ✗ 401 | ✓ | ✓ | ✓ | ✓ | ✓ |

Không có ô lệch, không có endpoint nào trả 5xx.
