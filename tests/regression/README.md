# Kiểm thử hồi quy luồng chính

## Chạy tất cả bằng một lệnh

```bash
CONFIRM_TEST_DB=1 npm test                 # chạy trên CSDL hiện tại
CONFIRM_TEST_DB=1 npm run test:reset-demo  # nạp lại dữ liệu demo rồi chạy (xóa và tạo lại CSDL, chỉ dùng trên CSDL dev/thử)
```

`tests/run-all.mjs` tự dựng backend (Development) với đúng cấu hình từng nhóm kiểm cần, chờ `/api/health`, chạy lần lượt các kịch bản rồi in bảng tổng kết
và dừng backend; mã thoát khác 0 nếu có phép kiểm lỗi. Cần `dotnet`, Node 18 trở lên, công cụ `mysql` (tự tìm trong PATH hoặc thư mục cài mặc định, hoặc đặt `MYSQL_BIN`)
và CSDL MySQL đang chạy. Nhật ký từng kịch bản nằm ở `tests/results/*.log` (không đưa vào git).

| Giai đoạn | Cấu hình backend | Kịch bản |
|---|---|---|
| 1 | Giả lập thanh toán bật, bảng phí hoàn để trống (luôn hoàn 100%) | `seat-lock`, `refund-flow`, `permissions`, `invoices` |
| 2 | Như trên nhưng thêm khóa VNPay thử, SMTP và API hoàn tiền giả, tài khoản ngân hàng giả, bảng phí hoàn 24h=100%, 2h=50% | `regress` (đủ nhóm G2-G6) |

Giai đoạn đầu còn có ba kiểm thử tĩnh không cần CSDL: `config/no-mock-data` (frontend không dùng dữ liệu giả hay `localStorage` cho dữ liệu nghiệp vụ), `config/frontend-role-mapping` (vai trò frontend khớp enum backend) và hai kiểm thử cấu hình triển khai.

Tùy chọn: `--only seat-lock,permissions` chỉ chạy vài kịch bản, `--no-backend` dùng backend đang chạy sẵn ở `API_URL` (tự lo cấu hình). Mặc định `npm test` áp các migration EF còn thiếu vào CSDL trước khi chạy (cần `dotnet tool install --global dotnet-ef`; thêm `--no-migrate` để bỏ qua). Kịch bản
`tests/payments/vnpay-ipn-e2e.mjs` cần VNPay sandbox thật và địa chỉ công khai nên không nằm trong lệnh này (xem tài liệu SCRUM-105).

Các kịch bản chạy được trên cả dữ liệu seed (`seed_sprint2.sql`) lẫn dữ liệu demo (`backend/database/demo`) vào bất kỳ ngày nào: ngày chuyến tính từ hôm nay,
xe lấy từ CSDL, giá vé đo từ máy chủ (giá cố định của seed hay bảng giá theo km của demo đều được), chuyến tương lai tự dựng thêm khi bộ demo đã hết chuyến, và nhóm giá theo km
cất bảng giá có sẵn rồi khôi phục khi xong. Mỗi kịch bản dọn mọi dòng nó tạo ra.

## `permissions.mjs` – ma trận phân quyền vai x endpoint (SCRUM-95)

Đọc `[Authorize]` / `[AllowAnonymous]` của mọi controller (khoảng 114 endpoint) rồi gọi từng endpoint bằng Admin, Quản lý, Tài xế, Phụ xe, Hành khách và khi chưa đăng nhập
(khoảng 680 ô). Không được phép thì phải trả 401 (chưa đăng nhập) hoặc 403 (sai vai); được phép thì không được trả 401/403. Dữ liệu gửi lên là id không tồn tại và thân rỗng nên
không tạo dữ liệu thật; endpoint được phép mà trả 5xx với dữ liệu rỗng cũng tính là lỗi. Kết quả ghi thành bảng ma trận ở `tests/results/ma-tran-phan-quyen.md` (bản chụp đã commit: `docs/MA-TRAN-PHAN-QUYEN.md`, sinh lại bằng `MATRIX_OUT=docs/MA-TRAN-PHAN-QUYEN.md CONFIRM_TEST_DB=1 node tests/regression/permissions.mjs`). Ngoài đối chiếu với attribute còn có hai lớp độc lập để bắt trường hợp ai đó lỡ xóa attribute:
endpoint ghi dữ liệu không được công khai (trừ đăng nhập, cổng thanh toán, webhook ngân hàng có khóa riêng) và 13 tài nguyên nhạy cảm (tài khoản, nhật ký, báo cáo, hoàn tiền, voucher, tạo tuyến/xe,
phân công, quét vé, đặt vé, thanh toán) phải đúng vai; cuối cùng là token rác, bị sửa chữ ký, thiếu `Bearer` và hành khách tự sửa claim vai trò thành Admin đều bị 401.

## Ma trận kiểm thử thanh toán (SCRUM-94)

| Tình huống | Nhóm / phép kiểm trong `regress.mjs` | Kết quả mong đợi |
|---|---|---|
| IPN trùng | G2: "IPN lặp lại sau khi đã chốt", "return lặp lại", "lặp lại không sinh thêm hóa đơn", "IPN và ReturnUrl về cùng lúc", "IPN lặp lại cho giao dịch trễ" | `RspCode 02`, đúng một hóa đơn, không hoàn tiền thêm |
| Sai chữ ký | G2: "chữ ký sai", "thiếu chữ ký", "sửa số tiền sau khi ký", "return chữ ký sai"; G4: phản hồi hoàn tiền sai chữ ký | `RspCode 97` / HTTP 400, giao dịch không đổi |
| Sai số tiền | G2: "số tiền khác giao dịch"; G5: webhook lệch số tiền | `RspCode 04`, giao dịch vẫn Pending, quản lý được báo |
| Trả hai lần | G2: "thanh toán lượt đặt đã trả", "gọi đồng thời chỉ một lần chốt"; G1: "thanh toán lần hai" | 409, một hóa đơn |
| Hết hạn giữ chỗ | G1: "thanh toán sau hết hạn giữ chỗ"; G2: "tiền về sau khi hết hạn giữ chỗ", job `HoldExpiry`; G5: chuyển khoản quá hạn | 409 hoặc không xuất vé và tự mở yêu cầu hoàn tiền, ghế được nhả |


`regress.mjs` gọi API thật của backend và kiểm tra các luồng chính của hệ thống, kèm ma trận quyền cho 5 vai trò
(Admin, Quản lý, Tài xế, Phụ xe, Hành khách). Gồm khoảng 180 phép kiểm, chia thành các nhóm:

| Nhóm | Nội dung |
|---|---|
| A | Đăng nhập, sai mật khẩu, thiếu hoặc sai token |
| B | Tài khoản và phân quyền (tạo, trùng, khóa, đổi vai trò lưu vào CSDL) |
| C, D | Tuyến, trạm, xe buýt |
| E | Lịch trình định kỳ và sinh chuyến (xem trước, trùng giờ, giới hạn 31 ngày) |
| F | Chuyến xe và phân công (trùng xe hoặc nhân sự, tên bịa, tài xế chỉ thấy chuyến của mình) |
| G | Đặt vé và thanh toán (trùng ghế, hết hạn giữ chỗ, trả hai lần, hóa đơn, cô lập giữa hành khách) |
| H | Hủy, đổi vé, hoàn tiền |
| I | Quét QR (hợp lệ, đã dùng, sai chuyến, quét đồng thời) |
| J, K, L | Báo sự cố, thông báo, khiếu nại |
| M | Hồ sơ ưu đãi, tải giấy tờ, giá ưu đãi khi đặt vé |
| N | Hủy chuyến kéo theo hoàn tiền |
| O | Báo cáo doanh thu và lấp đầy khớp CSDL |
| P | Nhật ký hệ thống |
| R | Thống kê lấp đầy theo chuyến (SCRUM-79: phân quyền, lọc tuyến, khoảng rỗng, khoảng ngược) |
| Q | Quản lý và kiểm tra voucher (SCRUM-66, SCRUM-67: tạo, trùng mã, phân quyền, hết hạn, hết lượt, áp dụng khi đặt vé, an toàn cập nhật và xóa) |

## Cách chạy

1. Dựng CSDL dev (`dotnet ef database update`, nạp `backend/database/seed_sprint2.sql`) và chạy backend ở chế độ Development.
2. Chạy từ thư mục gốc repo (cần Node 18 trở lên và công cụ dòng lệnh `mysql` trong PATH):

```bash
CONFIRM_TEST_DB=1 node tests/regression/regress.mjs
```

Kịch bản **tạo, đổi và xóa dữ liệu thật** nên bắt buộc đặt `CONFIRM_TEST_DB=1`; không chạy trên CSDL có dữ liệu thật.
Trước khi chạy, kịch bản ghi lại id lớn nhất của từng bảng, và sau khi chạy xóa mọi dòng có id lớn hơn mốc đó. Dữ liệu gốc không bị đổi.
Kết thúc in số phép kiểm đạt và danh sách phép kiểm lỗi; mã thoát khác 0 nếu có lỗi hoặc dọn dữ liệu thất bại.

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `API_URL` | `http://localhost:5180` | Địa chỉ backend |
| `MYSQL_BIN` | `mysql` | Đường dẫn công cụ `mysql` (trên Windows thường là `C:/Program Files/MySQL/MySQL Server 8.4/bin/mysql.exe`) |
| `MYSQL_HOST`, `MYSQL_PORT` | `localhost`, `3306` | Máy chủ MySQL |
| `MYSQL_USER`, `MYSQL_PASSWORD` | `root`, (rỗng) | Tài khoản MySQL |
| `MYSQL_DB` | `smart_bus_ticketing` | Tên CSDL |
| `SEED_PASSWORD` | `Admin@12345` | Mật khẩu các tài khoản seed (`admin`, `manager`, `driver1`, `driver2`, `conductor1`, `passenger1`) |

## Giả định về dữ liệu gốc

Kịch bản dùng dữ liệu seed của CSDL dev, nên cần đúng bộ dữ liệu đó:

- Tài khoản `admin`, `manager`, `driver1`, `driver2`, `conductor1`, `passenger1` có chung mật khẩu `SEED_PASSWORD`; id 3 và 4 là tài xế, id 5 là phụ xe, id 7 là hành khách.
- Tuyến id 1 có trạm id 1 và 2; xe id 1, 3, 4, 6, 7 đang hoạt động và có sơ đồ ghế; chuyến id 4 là chuyến đã khởi hành.
- Báo cáo doanh thu và lấp đầy so với CSDL theo toàn bộ giao dịch, nên bảng `payments` nên trống trước khi chạy.

Nếu seed đổi, sửa các id này ở đầu các nhóm F, G, I.

## Khi có phép kiểm lỗi

Dòng `FAIL` kèm giá trị thực tế và giá trị mong đợi. Mỗi phép kiểm đã kiểm tra bằng tay một lần trên bản main hiện tại, nên một lỗi mới thường
là hồi quy do thay đổi gần đây (quyền, trạng thái vé, tính tiền, thông báo).

## Nhóm G2 – thanh toán VNPay

Chạy backend với khóa thử, ví dụ `Payments__VnPay__TmnCode=TESTTMN01 Payments__VnPay__HashSecret=<khóa thử>`, rồi đặt cùng khóa đó ở
`VNPAY_SECRET` khi chạy kịch bản. Kịch bản tự ký các lời gọi IPN/ReturnUrl giống VNPay (viết độc lập với code C#, nên cũng đối chiếu chéo thuật
toán ký). Không đặt `VNPAY_SECRET` thì nhóm này bị bỏ qua. Nhóm chạy cuối cùng vì tạo thêm giao dịch và giữ ghế trên chuyến A, làm lệch các
số liệu báo cáo ở nhóm O nếu chạy trước.

## Nhóm G3 – email hóa đơn

Kịch bản tự mở một máy chủ SMTP giả ở cổng `SMTP_SINK_PORT` (vd. 2525) để nhận email. Chạy backend trỏ vào đó:
`Email__Enabled=true Email__Host=127.0.0.1 Email__Port=2525 Email__UseSsl=false Email__FromAddress=no-reply@smartbus.test`. Nhóm kiểm nội dung thư, SMTP từ chối,
gửi lại, quyền, địa chỉ không hợp lệ, hóa đơn quá số lần thử và tài khoản chưa có email. Không đặt `SMTP_SINK_PORT` thì nhóm bị bỏ qua.

## Nhóm G4 – hoàn tiền tự động qua VNPay

Kịch bản tự mở một máy chủ "API hoàn tiền VNPay" giả ở cổng `REFUND_SINK_PORT` (vd. 2526), kiểm chữ ký yêu cầu theo đặc tả và trả lời có ký. Chạy backend với
`Payments__VnPay__RefundUrl=http://127.0.0.1:2526/refund`. Nhóm kiểm: hoàn toàn bộ và một phần, mã yêu cầu cố định, lỗi tạm thời rồi tự thử lại, cổng từ chối (91) và yêu cầu trùng (94)
chuyển xử lý tay, phản hồi sai chữ ký, quản lý duyệt tay qua cổng và xác nhận hoàn ngoài cổng, từ chối hoàn. Cần cả `VNPAY_SECRET`. Nhóm chạy hơn 1 phút vì chờ vòng thử lại.

Đặt thêm `REFUND_TIERS=1` khi backend chạy với `Refunds__Tiers__0__HoursBefore=24 Refunds__Tiers__0__Percent=100 Refunds__Tiers__1__HoursBefore=2 Refunds__Tiers__1__Percent=50`
để kiểm chính sách hoàn theo giờ (còn 5 giờ hoàn 50%, dưới 2 giờ không hoàn, còn 30 giờ hoàn 100%).

## Nhóm G5 – chuyển khoản ngân hàng (VietQR)

Đặt `BANK_WEBHOOK_KEY` và chạy backend với `BankTransfer__BankId=MB BankTransfer__BankName="MB Bank" BankTransfer__AccountNumber=0123456789 BankTransfer__AccountName="NGUYEN VAN TEST" BankTransfer__WebhookApiKey=<khóa>`
(tài khoản giả, không dùng tài khoản thật). Nhóm kiểm: mã VietQR và nội dung chuyển khoản, quyền xem và xác nhận, xác nhận tay, chống dùng lại mã giao dịch ngân hàng,
tiền về trễ mở khoản hoàn, webhook (khóa API, lệch số tiền, nội dung bị chèn dấu cách, gửi trùng, gọi đồng thời, giao dịch quá hạn được mở lại) và job nhả giữ chỗ (mất tới ~80 giây).
Dùng chuyến riêng trên xe 4 để không tranh ghế với nhóm khác.

## Nhóm G6 – bảng giá vé theo km hành trình

Không cần cấu hình thêm. Nhóm kiểm: km từng trạm tự tính, phân quyền thêm/sửa/xóa bậc giá, dữ liệu sai (km ngược, giá 0), chống chồng lấn bậc, mốc ranh giới (đúng 12 km thuộc bậc 8-12),
giá mọi chặng và giá đối tượng ưu đãi, tìm chuyến trả `distanceKm` và giá theo km, đặt vé tính tiền theo km của chặng khách chọn, xóa hết bậc thì quay về giá cố định cũ của tuyến, tuyến mới tự tính km.
Nhóm chạy cuối cùng, tự lập rồi xóa bảng giá nên không đổi giá của các nhóm khác.

## Kịch bản trên dữ liệu demo (`seat-lock.mjs`, `refund-flow.mjs`)

Hai kịch bản này chạy riêng, không cần dữ liệu seed của `regress.mjs` mà dùng bộ dữ liệu trong `backend/database/demo` (nạp bằng `smart-bus-demo-data.sql`). Chúng tự chọn chuyến còn ở tương lai
(đã gán xe, trạng thái Scheduled) nên vẫn chạy được khi đổi ngày giờ chuyến, nhưng cần ít nhất 1 chuyến (`seat-lock`) hoặc 2 chuyến (`refund-flow`, chuyến thứ hai phải có tài xế).
Cả hai tự tạo 3 tài khoản hành khách `testpax1..3`, nên cần backend chạy Development với `Payments__Simulator__Enabled=true` (thanh toán MoMo giả lập) và bảng `payments` nên trống để số liệu doanh thu dễ đối chiếu.
Giống `regress.mjs`: bắt buộc `CONFIRM_TEST_DB=1`, ghi mốc id trước khi chạy và xóa mọi dòng mới sau khi chạy (kịch bản hoàn tiền còn trả lại trạng thái chuyến bị hủy).

```bash
CONFIRM_TEST_DB=1 node tests/regression/seat-lock.mjs
CONFIRM_TEST_DB=1 node tests/regression/refund-flow.mjs
```

| Kịch bản | Nội dung |
|---|---|
| `seat-lock.mjs` | Giữ và tranh ghế giữa nhiều khách, đặt nhiều ghế có một ghế đã bị giữ, thanh toán xong ghế đóng hẳn, hủy giữ chỗ nhả ghế ngay, hết hạn giữ chỗ tự nhả (đẩy `HoldExpiresAt` về quá khứ), đặt đồng thời cùng một ghế (chỉ một người thắng), hủy vé đã thanh toán chỉ nhả ghế sau khi quản lý duyệt, đặt chuyến đã khởi hành và đặt quá 4 ghế |
| `refund-flow.mjs` | Hủy một phần rồi hủy hết (giao dịch chuyển Refunded), duyệt, từ chối và xử lý trùng khoản hoàn, thông báo cho khách, phân quyền và cô lập giữa khách, vé đã quét không được hủy, hủy chuyến hoàn cho vé còn hiệu lực và nhả ghế đang giữ, đối chiếu doanh thu sau mỗi bước |

Lưu ý: `Refunds:Tiers` để trống thì hủy vé luôn hoàn 100% (kịch bản dựa vào đó). Hoàn tiền của MoMo/ZaloPay chỉ ghi nhận thủ công, chỉ VNPay gọi API hoàn của cổng.
