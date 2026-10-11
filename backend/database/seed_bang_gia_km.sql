-- Bảng giá vé niêm yết theo số km hành trình (số liệu mẫu cho demo, chỉnh theo bảng giá thật của đơn vị).
-- Chạy trên database đã migrate (dotnet ef database update). Chạy lại nhiều lần an toàn: chỉ chèn khi bảng còn trống.
--
-- Cách tính: km chặng = km của trạm xuống trừ km của trạm lên (route_stops.DistanceFromStartKm, hệ thống tự tính từ tọa độ trạm
-- và độ dài tuyến). Mỗi bậc là (FromKm, ToKm]: hành trình trên FromKm và không quá ToKm thì giá là Price; ToKm rỗng là bậc cuối.
-- Giá cho học sinh/sinh viên, người cao tuổi... được giảm theo passenger_types.DiscountPercent.
--
-- Cách chạy: mysql -uroot --default-character-set=utf8mb4 smart_bus_ticketing < backend/database/seed_bang_gia_km.sql
SET NAMES utf8mb4;

INSERT INTO distance_fares (FromKm, ToKm, Price)
SELECT t.FromKm, t.ToKm, t.Price
FROM (
    SELECT 0.00  AS FromKm, 3.00  AS ToKm, 5000.00  AS Price
    UNION ALL SELECT 3.00,  8.00,  7000.00
    UNION ALL SELECT 8.00,  12.00, 9000.00
    UNION ALL SELECT 12.00, 16.00, 11000.00
    UNION ALL SELECT 16.00, 20.00, 13000.00
    UNION ALL SELECT 20.00, NULL,  16000.00
) t
WHERE NOT EXISTS (SELECT 1 FROM distance_fares);

SELECT FromKm, ToKm, Price FROM distance_fares ORDER BY FromKm;
