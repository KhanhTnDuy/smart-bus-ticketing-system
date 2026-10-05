-- Du lieu mau cho Sprint 2 (chay 1 lan tren database da migrate: dotnet ef database update).
-- Chay lai se loi trung ma route T02 va bien so xe 51B-555.66.
-- Yeu cau: da co tuyen T01 (Id=1) va 4 loai hanh khach mac dinh.
-- Cach chay: mysql -uroot --default-character-set=utf8mb4 smart_bus_ticketing < backend/database/seed_sprint2.sql
SET NAMES utf8mb4;
START TRANSACTION;

-- Giá vé tuyến T01 (1=STANDARD, 2=STUDENT, 3=ELDERLY, 4=WORKER)
INSERT INTO fares (RouteId, TicketType, PassengerTypeId, Price, EffectiveFrom) VALUES
 (1,'Single',1,7000,'2026-10-01'),
 (1,'Single',2,3500,'2026-10-01'),
 (1,'Single',3,3500,'2026-10-01'),
 (1,'Monthly',4,112000,'2026-10-01');

-- Tuyến T02 + 3 trạm mới
INSERT INTO stops (Name, Latitude, Longitude) VALUES
 ('Bến xe Miền Đông', 10.814800, 106.711600),
 ('Ngã tư Hàng Xanh', 10.801700, 106.711100),
 ('Sân bay Tân Sơn Nhất', 10.818800, 106.651900);
SET @s1 = LAST_INSERT_ID();

INSERT INTO routes (Code, Name, StartPoint, EndPoint, DistanceKm, Active) VALUES
 ('T02','Bến xe Miền Đông — Sân bay Tân Sơn Nhất','Bến xe Miền Đông','Sân bay Tân Sơn Nhất',12.00,1);
SET @r2 = LAST_INSERT_ID();

INSERT INTO route_stops (RouteId, StopId, StopOrder, MinutesFromStart) VALUES
 (@r2,@s1,1,0),(@r2,@s1+1,2,8),(@r2,@s1+2,3,30);

INSERT INTO fares (RouteId, TicketType, PassengerTypeId, Price, EffectiveFrom) VALUES
 (@r2,'Single',1,6000,'2026-10-01'),
 (@r2,'Single',2,3000,'2026-10-01');

-- Xe mới 24 ghế (6 hàng x 4 cột, mã ghế giống các xe cũ)
INSERT INTO buses (PlateNumber, Capacity, Status) VALUES ('51B-555.66',24,'Active');
SET @b = LAST_INSERT_ID();
INSERT INTO seats (BusId, SeatCode, SeatRow, SeatCol)
SELECT @b, CONCAT(ELT(c.n,'A','B','C','D'), r.n), r.n, c.n
FROM (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6) r
CROSS JOIN (SELECT 1 n UNION SELECT 2 UNION SELECT 3 UNION SELECT 4) c
ORDER BY r.n, c.n;

-- Lịch chạy + 2 chuyến cho T02
INSERT INTO schedules (RouteId, FirstDeparture, LastDeparture, FrequencyMinutes, DaysOfWeek) VALUES
 (@r2,'06:00:00','20:00:00',30,'MON,TUE,WED,THU,FRI,SAT,SUN');
SET @sc = LAST_INSERT_ID();
INSERT INTO trips (RouteId, ScheduleId, BusId, DepartureAt, Status, DelayMinutes) VALUES
 (@r2,@sc,@b,'2026-10-08 06:00:00','Scheduled',0),
 (@r2,@sc,@b,'2026-10-08 06:30:00','Scheduled',0);

COMMIT;
