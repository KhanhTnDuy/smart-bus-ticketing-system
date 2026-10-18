-- ===================================================================
-- DỮ LIỆU DEMO SMART BUS TICKETING (đã gồm cấu trúc bảng + dữ liệu + bảng giá theo km + 4 chuyến sáng 12/10/2026)
-- Xuất ngày 11/10/2026 từ MySQL 8.4 của máy dev.
--
-- CÁCH DỰNG TRÊN LAPTOP DEMO (cần MySQL 8.x):
--   1. Mở terminal, chạy:  mysql -uroot -p --default-character-set=utf8mb4 < smart-bus-demo-data.sql
--      (hoặc trong MySQL Workbench: File > Open SQL Script > chạy cả file)
--      File tự tạo database `smart_bus_ticketing` (xóa bản cũ nếu có).
--   2. Trong backend/SmartBusTicketing.Api/appsettings.Development.json (hoặc user-secrets) đặt ConnectionStrings:Default
--      trỏ tới MySQL trên laptop, ví dụ: Server=127.0.0.1;Port=3306;Database=smart_bus_ticketing;User=root;Password=<mật khẩu>
--   3. Chạy backend (dotnet run) và frontend (npm run dev). Không cần chạy dotnet ef database update vì bảng đã đủ.
--   4. Thông tin QR chuyển khoản: đặt user-secrets theo bank-transfer-demo.md cùng thư mục (số tài khoản không nằm trong repo).
--
-- LƯU Ý: dữ liệu demo của dự án. Xóa thư mục backend/database/demo khi kết thúc dự án. Xem README.md cùng thư mục.
-- ===================================================================

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

/*!40000 DROP DATABASE IF EXISTS `smart_bus_ticketing`*/;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `smart_bus_ticketing` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `smart_bus_ticketing`;
DROP TABLE IF EXISTS `__EFMigrationsHistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `__EFMigrationsHistory` (
  `MigrationId` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ProductVersion` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`MigrationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `__EFMigrationsHistory` WRITE;
/*!40000 ALTER TABLE `__EFMigrationsHistory` DISABLE KEYS */;
INSERT INTO `__EFMigrationsHistory` VALUES ('20260929075731_InitialCreate','9.0.0'),('20260930152256_AddFeedbackContent','9.0.0'),('20260930205644_AddFeedbackCreatedAt','9.0.0'),('20261004173615_AddTicketChangeRequestDetails','9.0.0'),('20261009171956_AddIncidentAndScanDetails','9.0.0'),('20261009173057_AddRefundProcessing','9.0.0'),('20261010090610_AddNotificationTitleLink','9.0.0'),('20261010093141_AddDiscountApplicationReview','9.0.0'),('20261011145251_AddPaymentGatewayFields','9.0.0'),('20261011151619_AddInvoiceEmailTracking','9.0.0'),('20261011153456_AddRefundGatewayTracking','9.0.0'),('20261011163013_AddDistanceFares','9.0.0');
/*!40000 ALTER TABLE `__EFMigrationsHistory` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `accounts` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `Username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `PasswordHash` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `FullName` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `Phone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `Role` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Active` tinyint(1) NOT NULL,
  `CreatedAt` datetime(6) NOT NULL,
  `UpdatedAt` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_accounts_Username` (`Username`),
  UNIQUE KEY `IX_accounts_Email` (`Email`),
  UNIQUE KEY `IX_accounts_Phone` (`Phone`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `accounts` WRITE;
/*!40000 ALTER TABLE `accounts` DISABLE KEYS */;
INSERT INTO `accounts` VALUES (1,'admin','PBKDF2-SHA256$100000$bK7NBfy41laV6AkiAZPwoA==$9DJyesfbybuT3vf/LrqZMlfivJR0/9QSg3383N0/vA0=','Quản trị hệ thống',NULL,NULL,'Admin',1,'2026-10-07 03:41:37.260605','2026-10-07 03:41:37.260605'),(2,'manager','PBKDF2-SHA256$100000$OxIQpBSduhwZbZ1+cURlEg==$n1QJSzFZFW96Grc6LyBd8ddvEvdvR/w9bhOip+ZcwY0=','Nguyễn Quản Lý',NULL,'0981112233','Manager',1,'2026-10-07 03:41:37.436245','2026-10-07 03:41:37.436245'),(3,'driver1','PBKDF2-SHA256$100000$xFNq4f6yGP3xGvHXurklkQ==$oZh+9c3pbqUCmCg8x8wD0P2h5PbYL5Txor58wP5JGaI=','Nguyễn Văn Tuấn',NULL,'0901234567','Driver',1,'2026-10-07 03:41:37.436245','2026-10-07 03:41:37.436245'),(4,'driver2','PBKDF2-SHA256$100000$3Vv7jmZRZQJFm9riPRSXkQ==$KbmkJjWtdA08o0BEzVF0H3jNNF4jibv8Spdj4XWN0d8=','Trần Đình Trọng',NULL,'0908765432','Driver',1,'2026-10-07 03:41:37.436245','2026-10-07 03:41:37.436245'),(5,'conductor1','PBKDF2-SHA256$100000$VUCumnd5f7Oe/YP+sRBDyQ==$o4VQkKd8uwytoO1zTFY9wXQcigytUQhWmn2ziltGAA8=','Trần Minh Đức',NULL,'0902234567','Conductor',1,'2026-10-07 03:41:37.436245','2026-10-07 03:41:37.436245'),(6,'conductor2','PBKDF2-SHA256$100000$7NYgzSfVO992ajpsBYu09g==$O07Xud2QHG4IWb7MdPOt+KyuH3dJNArp26pDSqLekeA=','Lê Hoàng Nam',NULL,'0903344556','Conductor',1,'2026-10-07 03:41:37.436245','2026-10-07 03:41:37.436245'),(7,'passenger1','PBKDF2-SHA256$100000$8syqapTEjL0lIMDS6zIT+A==$SJ1pNbnNYVSm5rVbMaKC8EtOsVM4VUlt9c1c7CgZU5A=','Lê Thị Hành Khách','passenger1@example.com','0912345678','Passenger',1,'2026-10-07 03:41:37.436245','2026-10-07 03:41:37.436245');
/*!40000 ALTER TABLE `accounts` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `AccountId` bigint DEFAULT NULL,
  `Username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Action` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ActionType` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `TargetResource` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `IpAddress` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `UserAgent` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `Status` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `CreatedAt` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_audit_logs_AccountId` (`AccountId`),
  KEY `IX_audit_logs_Username_ActionType_CreatedAt` (`Username`,`ActionType`,`CreatedAt`),
  CONSTRAINT `FK_audit_logs_accounts_AccountId` FOREIGN KEY (`AccountId`) REFERENCES `accounts` (`Id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,1,'admin','Login','Login','USR-1',NULL,NULL,'Success',NULL,'2026-10-07 03:50:32.826148'),(2,1,'admin','Logout','Logout','USR-1',NULL,NULL,'Success',NULL,'2026-10-07 03:50:41.692505'),(3,7,'passenger1','Login','Login','USR-7',NULL,NULL,'Success',NULL,'2026-10-07 03:50:45.993240'),(4,7,'passenger1','Login','Login','USR-7',NULL,NULL,'Success',NULL,'2026-10-11 16:24:57.003496'),(5,2,'manager','Login','Login','USR-2',NULL,NULL,'Success',NULL,'2026-10-11 16:24:57.332402');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `BookingCode` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `PassengerId` bigint NOT NULL,
  `TripId` bigint NOT NULL,
  `VoucherId` bigint DEFAULT NULL,
  `Status` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `HoldExpiresAt` datetime(6) NOT NULL,
  `FinalAmount` decimal(12,2) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_bookings_BookingCode` (`BookingCode`),
  KEY `IX_bookings_PassengerId` (`PassengerId`),
  KEY `IX_bookings_TripId` (`TripId`),
  KEY `IX_bookings_VoucherId` (`VoucherId`),
  CONSTRAINT `FK_bookings_accounts_PassengerId` FOREIGN KEY (`PassengerId`) REFERENCES `accounts` (`Id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_bookings_trips_TripId` FOREIGN KEY (`TripId`) REFERENCES `trips` (`Id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_bookings_vouchers_VoucherId` FOREIGN KEY (`VoucherId`) REFERENCES `vouchers` (`Id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `bus_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bus_locations` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `TripId` bigint NOT NULL,
  `BusId` bigint NOT NULL,
  `Latitude` decimal(10,6) NOT NULL,
  `Longitude` decimal(10,6) NOT NULL,
  `RecordedAt` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_bus_locations_BusId` (`BusId`),
  KEY `IX_bus_locations_TripId` (`TripId`),
  CONSTRAINT `FK_bus_locations_buses_BusId` FOREIGN KEY (`BusId`) REFERENCES `buses` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_bus_locations_trips_TripId` FOREIGN KEY (`TripId`) REFERENCES `trips` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `bus_locations` WRITE;
/*!40000 ALTER TABLE `bus_locations` DISABLE KEYS */;
/*!40000 ALTER TABLE `bus_locations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `buses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `buses` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `PlateNumber` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Capacity` int NOT NULL,
  `Status` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_buses_PlateNumber` (`PlateNumber`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `buses` WRITE;
/*!40000 ALTER TABLE `buses` DISABLE KEYS */;
INSERT INTO `buses` VALUES (1,'51B-184.22',47,'Active'),(2,'51B-221.78',47,'Active'),(3,'51B-302.15',24,'Active'),(4,'51B-998.01',24,'Active'),(5,'51B-201.55',47,'Maintenance');
/*!40000 ALTER TABLE `buses` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `distance_fares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `distance_fares` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `FromKm` decimal(7,2) NOT NULL,
  `ToKm` decimal(7,2) DEFAULT NULL,
  `Price` decimal(12,2) NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `distance_fares` WRITE;
/*!40000 ALTER TABLE `distance_fares` DISABLE KEYS */;
INSERT INTO `distance_fares` VALUES (1,0.00,3.00,5000.00),(2,3.00,8.00,7000.00),(3,8.00,12.00,9000.00),(4,12.00,16.00,11000.00),(5,16.00,20.00,13000.00),(6,20.00,NULL,16000.00);
/*!40000 ALTER TABLE `distance_fares` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `fares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fares` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `RouteId` bigint NOT NULL,
  `TicketType` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `PassengerTypeId` int NOT NULL,
  `Price` decimal(10,2) NOT NULL,
  `EffectiveFrom` date NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_fares_PassengerTypeId` (`PassengerTypeId`),
  KEY `IX_fares_RouteId` (`RouteId`),
  CONSTRAINT `FK_fares_passenger_types_PassengerTypeId` FOREIGN KEY (`PassengerTypeId`) REFERENCES `passenger_types` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_fares_routes_RouteId` FOREIGN KEY (`RouteId`) REFERENCES `routes` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `fares` WRITE;
/*!40000 ALTER TABLE `fares` DISABLE KEYS */;
/*!40000 ALTER TABLE `fares` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `feedback_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback_history` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `FeedbackId` bigint NOT NULL,
  `OldStatus` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `NewStatus` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ChangedBy` bigint NOT NULL,
  `ChangedAt` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_feedback_history_ChangedBy` (`ChangedBy`),
  KEY `IX_feedback_history_FeedbackId` (`FeedbackId`),
  CONSTRAINT `FK_feedback_history_accounts_ChangedBy` FOREIGN KEY (`ChangedBy`) REFERENCES `accounts` (`Id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_feedback_history_feedbacks_FeedbackId` FOREIGN KEY (`FeedbackId`) REFERENCES `feedbacks` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `feedback_history` WRITE;
/*!40000 ALTER TABLE `feedback_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback_history` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `feedbacks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedbacks` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `PassengerId` bigint NOT NULL,
  `RouteId` bigint DEFAULT NULL,
  `TripId` bigint DEFAULT NULL,
  `Type` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Subject` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Rating` tinyint unsigned NOT NULL,
  `ImagePath` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `Status` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ProcessedBy` bigint DEFAULT NULL,
  `Content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `CreatedAt` datetime(6) NOT NULL DEFAULT '0001-01-01 00:00:00.000000',
  PRIMARY KEY (`Id`),
  KEY `IX_feedbacks_PassengerId` (`PassengerId`),
  KEY `IX_feedbacks_ProcessedBy` (`ProcessedBy`),
  KEY `IX_feedbacks_RouteId` (`RouteId`),
  KEY `IX_feedbacks_TripId` (`TripId`),
  CONSTRAINT `FK_feedbacks_accounts_PassengerId` FOREIGN KEY (`PassengerId`) REFERENCES `accounts` (`Id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_feedbacks_accounts_ProcessedBy` FOREIGN KEY (`ProcessedBy`) REFERENCES `accounts` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_feedbacks_routes_RouteId` FOREIGN KEY (`RouteId`) REFERENCES `routes` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_feedbacks_trips_TripId` FOREIGN KEY (`TripId`) REFERENCES `trips` (`Id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `feedbacks` WRITE;
/*!40000 ALTER TABLE `feedbacks` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedbacks` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `incidents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `incidents` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `TripId` bigint NOT NULL,
  `ReportedBy` bigint NOT NULL,
  `IncidentType` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `DelayMinutes` int NOT NULL,
  `Status` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `CreatedAt` datetime(6) NOT NULL DEFAULT '0001-01-01 00:00:00.000000',
  `Description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Location` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ResolutionNote` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `ResolvedAt` datetime(6) DEFAULT NULL,
  `ResolvedBy` bigint DEFAULT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_incidents_ReportedBy` (`ReportedBy`),
  KEY `IX_incidents_TripId` (`TripId`),
  KEY `IX_incidents_ResolvedBy` (`ResolvedBy`),
  CONSTRAINT `FK_incidents_accounts_ReportedBy` FOREIGN KEY (`ReportedBy`) REFERENCES `accounts` (`Id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_incidents_accounts_ResolvedBy` FOREIGN KEY (`ResolvedBy`) REFERENCES `accounts` (`Id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_incidents_trips_TripId` FOREIGN KEY (`TripId`) REFERENCES `trips` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `incidents` WRITE;
/*!40000 ALTER TABLE `incidents` DISABLE KEYS */;
/*!40000 ALTER TABLE `incidents` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `invoices` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `PaymentId` bigint NOT NULL,
  `InvoiceNo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Email` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Total` decimal(12,2) NOT NULL,
  `SentAt` datetime(6) DEFAULT NULL,
  `EmailAttempts` int NOT NULL DEFAULT '0',
  `EmailError` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_invoices_InvoiceNo` (`InvoiceNo`),
  UNIQUE KEY `IX_invoices_PaymentId` (`PaymentId`),
  CONSTRAINT `FK_invoices_payments_PaymentId` FOREIGN KEY (`PaymentId`) REFERENCES `payments` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `monthly_passes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `monthly_passes` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `PassengerId` bigint NOT NULL,
  `RouteId` bigint DEFAULT NULL,
  `PassengerTypeId` int NOT NULL,
  `PreviousPassId` bigint DEFAULT NULL,
  `ValidFrom` date NOT NULL,
  `ValidTo` date NOT NULL,
  `QrCode` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_monthly_passes_QrCode` (`QrCode`),
  KEY `IX_monthly_passes_PassengerId` (`PassengerId`),
  KEY `IX_monthly_passes_PassengerTypeId` (`PassengerTypeId`),
  KEY `IX_monthly_passes_PreviousPassId` (`PreviousPassId`),
  KEY `IX_monthly_passes_RouteId` (`RouteId`),
  CONSTRAINT `FK_monthly_passes_accounts_PassengerId` FOREIGN KEY (`PassengerId`) REFERENCES `accounts` (`Id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_monthly_passes_monthly_passes_PreviousPassId` FOREIGN KEY (`PreviousPassId`) REFERENCES `monthly_passes` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_monthly_passes_passenger_types_PassengerTypeId` FOREIGN KEY (`PassengerTypeId`) REFERENCES `passenger_types` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_monthly_passes_routes_RouteId` FOREIGN KEY (`RouteId`) REFERENCES `routes` (`Id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `monthly_passes` WRITE;
/*!40000 ALTER TABLE `monthly_passes` DISABLE KEYS */;
/*!40000 ALTER TABLE `monthly_passes` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `AccountId` bigint NOT NULL,
  `TripId` bigint DEFAULT NULL,
  `IncidentId` bigint DEFAULT NULL,
  `Type` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `IsRead` tinyint(1) NOT NULL,
  `CreatedAt` datetime(6) NOT NULL DEFAULT '0001-01-01 00:00:00.000000',
  `Message` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Link` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `Title` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_notifications_AccountId` (`AccountId`),
  KEY `IX_notifications_IncidentId` (`IncidentId`),
  KEY `IX_notifications_TripId` (`TripId`),
  CONSTRAINT `FK_notifications_accounts_AccountId` FOREIGN KEY (`AccountId`) REFERENCES `accounts` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_notifications_incidents_IncidentId` FOREIGN KEY (`IncidentId`) REFERENCES `incidents` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_notifications_trips_TripId` FOREIGN KEY (`TripId`) REFERENCES `trips` (`Id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `passenger_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `passenger_types` (
  `Id` int NOT NULL AUTO_INCREMENT,
  `Code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Name` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `DiscountPercent` decimal(5,2) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_passenger_types_Code` (`Code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `passenger_types` WRITE;
/*!40000 ALTER TABLE `passenger_types` DISABLE KEYS */;
INSERT INTO `passenger_types` VALUES (1,'STANDARD','Hành khách thường',0.00),(2,'STUDENT','Học sinh / Sinh viên',50.00),(3,'ELDERLY','Người cao tuổi',50.00),(4,'WORKER','Người đi làm (vé tháng)',20.00);
/*!40000 ALTER TABLE `passenger_types` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `passenger_verifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `passenger_verifications` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `AccountId` bigint NOT NULL,
  `PassengerTypeId` int NOT NULL,
  `DocumentUrl` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Status` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ReviewedBy` bigint DEFAULT NULL,
  `ValidUntil` date DEFAULT NULL,
  `RejectReason` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `ReviewedAt` datetime(6) DEFAULT NULL,
  `SubmittedAt` datetime(6) NOT NULL DEFAULT '0001-01-01 00:00:00.000000',
  PRIMARY KEY (`Id`),
  KEY `IX_passenger_verifications_AccountId` (`AccountId`),
  KEY `IX_passenger_verifications_PassengerTypeId` (`PassengerTypeId`),
  KEY `IX_passenger_verifications_ReviewedBy` (`ReviewedBy`),
  CONSTRAINT `FK_passenger_verifications_accounts_AccountId` FOREIGN KEY (`AccountId`) REFERENCES `accounts` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_passenger_verifications_accounts_ReviewedBy` FOREIGN KEY (`ReviewedBy`) REFERENCES `accounts` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_passenger_verifications_passenger_types_PassengerTypeId` FOREIGN KEY (`PassengerTypeId`) REFERENCES `passenger_types` (`Id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `passenger_verifications` WRITE;
/*!40000 ALTER TABLE `passenger_verifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `passenger_verifications` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `BookingId` bigint DEFAULT NULL,
  `MonthlyPassId` bigint DEFAULT NULL,
  `Method` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Amount` decimal(12,2) NOT NULL,
  `Status` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ProviderTxnId` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `PaidAt` datetime(6) DEFAULT NULL,
  `FailureReason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `GatewayPayDate` varchar(14) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `TxnRef` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `GatewayCreateDate` varchar(14) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_payments_ProviderTxnId` (`ProviderTxnId`),
  UNIQUE KEY `IX_payments_TxnRef` (`TxnRef`),
  KEY `IX_payments_BookingId` (`BookingId`),
  KEY `IX_payments_MonthlyPassId` (`MonthlyPassId`),
  CONSTRAINT `FK_payments_bookings_BookingId` FOREIGN KEY (`BookingId`) REFERENCES `bookings` (`Id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_payments_monthly_passes_MonthlyPassId` FOREIGN KEY (`MonthlyPassId`) REFERENCES `monthly_passes` (`Id`) ON DELETE RESTRICT,
  CONSTRAINT `CK_payments_target` CHECK ((((`BookingId` is not null) and (`MonthlyPassId` is null)) or ((`BookingId` is null) and (`MonthlyPassId` is not null))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `refunds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refunds` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `PaymentId` bigint NOT NULL,
  `ChangeRequestId` bigint DEFAULT NULL,
  `Amount` decimal(12,2) NOT NULL,
  `Reason` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Status` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `CreatedAt` datetime(6) NOT NULL DEFAULT '0001-01-01 00:00:00.000000',
  `Note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `ProcessedAt` datetime(6) DEFAULT NULL,
  `ProcessedBy` bigint DEFAULT NULL,
  `Attempts` int NOT NULL DEFAULT '0',
  `GatewayRefId` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `LastAttemptAt` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_refunds_ChangeRequestId` (`ChangeRequestId`),
  KEY `IX_refunds_PaymentId` (`PaymentId`),
  KEY `IX_refunds_ProcessedBy` (`ProcessedBy`),
  CONSTRAINT `FK_refunds_accounts_ProcessedBy` FOREIGN KEY (`ProcessedBy`) REFERENCES `accounts` (`Id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_refunds_payments_PaymentId` FOREIGN KEY (`PaymentId`) REFERENCES `payments` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_refunds_ticket_change_requests_ChangeRequestId` FOREIGN KEY (`ChangeRequestId`) REFERENCES `ticket_change_requests` (`Id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `refunds` WRITE;
/*!40000 ALTER TABLE `refunds` DISABLE KEYS */;
/*!40000 ALTER TABLE `refunds` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `route_stops`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `route_stops` (
  `RouteId` bigint NOT NULL,
  `StopId` bigint NOT NULL,
  `StopOrder` int NOT NULL,
  `MinutesFromStart` int NOT NULL,
  `DistanceFromStartKm` decimal(7,2) DEFAULT NULL,
  PRIMARY KEY (`RouteId`,`StopId`),
  UNIQUE KEY `IX_route_stops_RouteId_StopOrder` (`RouteId`,`StopOrder`),
  KEY `IX_route_stops_StopId` (`StopId`),
  CONSTRAINT `FK_route_stops_routes_RouteId` FOREIGN KEY (`RouteId`) REFERENCES `routes` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_route_stops_stops_StopId` FOREIGN KEY (`StopId`) REFERENCES `stops` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `route_stops` WRITE;
/*!40000 ALTER TABLE `route_stops` DISABLE KEYS */;
INSERT INTO `route_stops` VALUES (1,1,1,0,0.00),(1,2,2,10,0.87),(1,3,3,30,7.43),(1,4,4,50,14.50);
/*!40000 ALTER TABLE `route_stops` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `routes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `routes` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `Code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Name` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `StartPoint` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `EndPoint` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `DistanceKm` decimal(8,2) NOT NULL,
  `Active` tinyint(1) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_routes_Code` (`Code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `routes` WRITE;
/*!40000 ALTER TABLE `routes` DISABLE KEYS */;
INSERT INTO `routes` VALUES (1,'T01','Bến Thành — Bến xe Miền Tây','Công viên 23/9 (Bến Thành)','Bến xe Miền Tây',14.50,1);
/*!40000 ALTER TABLE `routes` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schedules` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `RouteId` bigint NOT NULL,
  `FirstDeparture` time(6) NOT NULL,
  `LastDeparture` time(6) NOT NULL,
  `FrequencyMinutes` int NOT NULL,
  `DaysOfWeek` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_schedules_RouteId` (`RouteId`),
  CONSTRAINT `FK_schedules_routes_RouteId` FOREIGN KEY (`RouteId`) REFERENCES `routes` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `schedules` WRITE;
/*!40000 ALTER TABLE `schedules` DISABLE KEYS */;
/*!40000 ALTER TABLE `schedules` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `seats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `seats` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `BusId` bigint NOT NULL,
  `SeatCode` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `SeatRow` int NOT NULL,
  `SeatCol` int NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_seats_BusId_SeatCode` (`BusId`,`SeatCode`),
  CONSTRAINT `FK_seats_buses_BusId` FOREIGN KEY (`BusId`) REFERENCES `buses` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=190 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `seats` WRITE;
/*!40000 ALTER TABLE `seats` DISABLE KEYS */;
INSERT INTO `seats` VALUES (1,1,'A1',1,1),(2,1,'B1',1,2),(3,1,'C1',1,3),(4,1,'D1',1,4),(5,1,'A2',2,1),(6,1,'B2',2,2),(7,1,'C2',2,3),(8,1,'D2',2,4),(9,1,'A3',3,1),(10,1,'B3',3,2),(11,1,'C3',3,3),(12,1,'D3',3,4),(13,1,'A4',4,1),(14,1,'B4',4,2),(15,1,'C4',4,3),(16,1,'D4',4,4),(17,1,'A5',5,1),(18,1,'B5',5,2),(19,1,'C5',5,3),(20,1,'D5',5,4),(21,1,'A6',6,1),(22,1,'B6',6,2),(23,1,'C6',6,3),(24,1,'D6',6,4),(25,1,'A7',7,1),(26,1,'B7',7,2),(27,1,'C7',7,3),(28,1,'D7',7,4),(29,1,'A8',8,1),(30,1,'B8',8,2),(31,1,'C8',8,3),(32,1,'D8',8,4),(33,1,'A9',9,1),(34,1,'B9',9,2),(35,1,'C9',9,3),(36,1,'D9',9,4),(37,1,'A10',10,1),(38,1,'B10',10,2),(39,1,'C10',10,3),(40,1,'D10',10,4),(41,1,'A11',11,1),(42,1,'B11',11,2),(43,1,'C11',11,3),(44,1,'D11',11,4),(45,1,'A12',12,1),(46,1,'B12',12,2),(47,1,'C12',12,3),(48,2,'A1',1,1),(49,2,'B1',1,2),(50,2,'C1',1,3),(51,2,'D1',1,4),(52,2,'A2',2,1),(53,2,'B2',2,2),(54,2,'C2',2,3),(55,2,'D2',2,4),(56,2,'A3',3,1),(57,2,'B3',3,2),(58,2,'C3',3,3),(59,2,'D3',3,4),(60,2,'A4',4,1),(61,2,'B4',4,2),(62,2,'C4',4,3),(63,2,'D4',4,4),(64,2,'A5',5,1),(65,2,'B5',5,2),(66,2,'C5',5,3),(67,2,'D5',5,4),(68,2,'A6',6,1),(69,2,'B6',6,2),(70,2,'C6',6,3),(71,2,'D6',6,4),(72,2,'A7',7,1),(73,2,'B7',7,2),(74,2,'C7',7,3),(75,2,'D7',7,4),(76,2,'A8',8,1),(77,2,'B8',8,2),(78,2,'C8',8,3),(79,2,'D8',8,4),(80,2,'A9',9,1),(81,2,'B9',9,2),(82,2,'C9',9,3),(83,2,'D9',9,4),(84,2,'A10',10,1),(85,2,'B10',10,2),(86,2,'C10',10,3),(87,2,'D10',10,4),(88,2,'A11',11,1),(89,2,'B11',11,2),(90,2,'C11',11,3),(91,2,'D11',11,4),(92,2,'A12',12,1),(93,2,'B12',12,2),(94,2,'C12',12,3),(95,3,'A1',1,1),(96,3,'B1',1,2),(97,3,'C1',1,3),(98,3,'D1',1,4),(99,3,'A2',2,1),(100,3,'B2',2,2),(101,3,'C2',2,3),(102,3,'D2',2,4),(103,3,'A3',3,1),(104,3,'B3',3,2),(105,3,'C3',3,3),(106,3,'D3',3,4),(107,3,'A4',4,1),(108,3,'B4',4,2),(109,3,'C4',4,3),(110,3,'D4',4,4),(111,3,'A5',5,1),(112,3,'B5',5,2),(113,3,'C5',5,3),(114,3,'D5',5,4),(115,3,'A6',6,1),(116,3,'B6',6,2),(117,3,'C6',6,3),(118,3,'D6',6,4),(119,4,'A1',1,1),(120,4,'B1',1,2),(121,4,'C1',1,3),(122,4,'D1',1,4),(123,4,'A2',2,1),(124,4,'B2',2,2),(125,4,'C2',2,3),(126,4,'D2',2,4),(127,4,'A3',3,1),(128,4,'B3',3,2),(129,4,'C3',3,3),(130,4,'D3',3,4),(131,4,'A4',4,1),(132,4,'B4',4,2),(133,4,'C4',4,3),(134,4,'D4',4,4),(135,4,'A5',5,1),(136,4,'B5',5,2),(137,4,'C5',5,3),(138,4,'D5',5,4),(139,4,'A6',6,1),(140,4,'B6',6,2),(141,4,'C6',6,3),(142,4,'D6',6,4),(143,5,'A1',1,1),(144,5,'B1',1,2),(145,5,'C1',1,3),(146,5,'D1',1,4),(147,5,'A2',2,1),(148,5,'B2',2,2),(149,5,'C2',2,3),(150,5,'D2',2,4),(151,5,'A3',3,1),(152,5,'B3',3,2),(153,5,'C3',3,3),(154,5,'D3',3,4),(155,5,'A4',4,1),(156,5,'B4',4,2),(157,5,'C4',4,3),(158,5,'D4',4,4),(159,5,'A5',5,1),(160,5,'B5',5,2),(161,5,'C5',5,3),(162,5,'D5',5,4),(163,5,'A6',6,1),(164,5,'B6',6,2),(165,5,'C6',6,3),(166,5,'D6',6,4),(167,5,'A7',7,1),(168,5,'B7',7,2),(169,5,'C7',7,3),(170,5,'D7',7,4),(171,5,'A8',8,1),(172,5,'B8',8,2),(173,5,'C8',8,3),(174,5,'D8',8,4),(175,5,'A9',9,1),(176,5,'B9',9,2),(177,5,'C9',9,3),(178,5,'D9',9,4),(179,5,'A10',10,1),(180,5,'B10',10,2),(181,5,'C10',10,3),(182,5,'D10',10,4),(183,5,'A11',11,1),(184,5,'B11',11,2),(185,5,'C11',11,3),(186,5,'D11',11,4),(187,5,'A12',12,1),(188,5,'B12',12,2),(189,5,'C12',12,3);
/*!40000 ALTER TABLE `seats` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `stops`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stops` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `Name` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Latitude` decimal(10,6) NOT NULL,
  `Longitude` decimal(10,6) NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `stops` WRITE;
/*!40000 ALTER TABLE `stops` DISABLE KEYS */;
INSERT INTO `stops` VALUES (1,'Công viên 23/9',10.768600,106.694200),(2,'Chợ Bến Thành',10.772500,106.698000),(3,'Bệnh viện Chợ Rẫy',10.757800,106.659600),(4,'Bến xe Miền Tây',10.741100,106.618600);
/*!40000 ALTER TABLE `stops` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `ticket_change_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_change_requests` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `TicketId` bigint NOT NULL,
  `RequestType` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `NewTripId` bigint DEFAULT NULL,
  `Status` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ProcessedBy` bigint DEFAULT NULL,
  `CreatedAt` datetime(6) NOT NULL DEFAULT '0001-01-01 00:00:00.000000',
  `NewSeatId` bigint DEFAULT NULL,
  `ProcessedAt` datetime(6) DEFAULT NULL,
  `Reason` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_ticket_change_requests_NewTripId` (`NewTripId`),
  KEY `IX_ticket_change_requests_ProcessedBy` (`ProcessedBy`),
  KEY `IX_ticket_change_requests_TicketId` (`TicketId`),
  KEY `IX_ticket_change_requests_NewSeatId` (`NewSeatId`),
  CONSTRAINT `FK_ticket_change_requests_accounts_ProcessedBy` FOREIGN KEY (`ProcessedBy`) REFERENCES `accounts` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_ticket_change_requests_seats_NewSeatId` FOREIGN KEY (`NewSeatId`) REFERENCES `seats` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_ticket_change_requests_tickets_TicketId` FOREIGN KEY (`TicketId`) REFERENCES `tickets` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_ticket_change_requests_trips_NewTripId` FOREIGN KEY (`NewTripId`) REFERENCES `trips` (`Id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `ticket_change_requests` WRITE;
/*!40000 ALTER TABLE `ticket_change_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `ticket_change_requests` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `ticket_scans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ticket_scans` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `TicketId` bigint DEFAULT NULL,
  `MonthlyPassId` bigint DEFAULT NULL,
  `TripId` bigint NOT NULL,
  `ScannedBy` bigint NOT NULL,
  `Result` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ScannedAt` datetime(6) NOT NULL DEFAULT '0001-01-01 00:00:00.000000',
  PRIMARY KEY (`Id`),
  KEY `IX_ticket_scans_MonthlyPassId` (`MonthlyPassId`),
  KEY `IX_ticket_scans_ScannedBy` (`ScannedBy`),
  KEY `IX_ticket_scans_TicketId` (`TicketId`),
  KEY `IX_ticket_scans_TripId` (`TripId`),
  CONSTRAINT `FK_ticket_scans_accounts_ScannedBy` FOREIGN KEY (`ScannedBy`) REFERENCES `accounts` (`Id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_ticket_scans_monthly_passes_MonthlyPassId` FOREIGN KEY (`MonthlyPassId`) REFERENCES `monthly_passes` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_ticket_scans_tickets_TicketId` FOREIGN KEY (`TicketId`) REFERENCES `tickets` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_ticket_scans_trips_TripId` FOREIGN KEY (`TripId`) REFERENCES `trips` (`Id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `ticket_scans` WRITE;
/*!40000 ALTER TABLE `ticket_scans` DISABLE KEYS */;
/*!40000 ALTER TABLE `ticket_scans` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tickets` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `BookingId` bigint NOT NULL,
  `TripId` bigint NOT NULL,
  `SeatId` bigint NOT NULL,
  `BoardStopId` bigint NOT NULL,
  `AlightStopId` bigint NOT NULL,
  `QrCode` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `Status` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `ActiveSeatKey` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci GENERATED ALWAYS AS ((case when (`Status` in (_utf8mb4'Held',_utf8mb4'Valid',_utf8mb4'Used')) then concat(`TripId`,_utf8mb4'-',`SeatId`) end)) STORED,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_tickets_QrCode` (`QrCode`),
  UNIQUE KEY `IX_tickets_ActiveSeatKey` (`ActiveSeatKey`),
  KEY `IX_tickets_AlightStopId` (`AlightStopId`),
  KEY `IX_tickets_BoardStopId` (`BoardStopId`),
  KEY `IX_tickets_BookingId` (`BookingId`),
  KEY `IX_tickets_SeatId` (`SeatId`),
  KEY `IX_tickets_TripId` (`TripId`),
  CONSTRAINT `FK_tickets_bookings_BookingId` FOREIGN KEY (`BookingId`) REFERENCES `bookings` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_tickets_seats_SeatId` FOREIGN KEY (`SeatId`) REFERENCES `seats` (`Id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_tickets_stops_AlightStopId` FOREIGN KEY (`AlightStopId`) REFERENCES `stops` (`Id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_tickets_stops_BoardStopId` FOREIGN KEY (`BoardStopId`) REFERENCES `stops` (`Id`) ON DELETE RESTRICT,
  CONSTRAINT `FK_tickets_trips_TripId` FOREIGN KEY (`TripId`) REFERENCES `trips` (`Id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `tickets` WRITE;
/*!40000 ALTER TABLE `tickets` DISABLE KEYS */;
/*!40000 ALTER TABLE `tickets` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `trip_staff`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trip_staff` (
  `TripId` bigint NOT NULL,
  `AccountId` bigint NOT NULL,
  `Duty` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`TripId`,`AccountId`),
  KEY `IX_trip_staff_AccountId` (`AccountId`),
  CONSTRAINT `FK_trip_staff_accounts_AccountId` FOREIGN KEY (`AccountId`) REFERENCES `accounts` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_trip_staff_trips_TripId` FOREIGN KEY (`TripId`) REFERENCES `trips` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `trip_staff` WRITE;
/*!40000 ALTER TABLE `trip_staff` DISABLE KEYS */;
INSERT INTO `trip_staff` VALUES (1,3,'Driver'),(1,5,'Conductor'),(4,3,'Driver'),(4,5,'Conductor'),(5,4,'Driver'),(5,6,'Conductor'),(6,3,'Driver'),(6,5,'Conductor'),(7,4,'Driver'),(7,6,'Conductor');
/*!40000 ALTER TABLE `trip_staff` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `trips`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trips` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `RouteId` bigint NOT NULL,
  `ScheduleId` bigint DEFAULT NULL,
  `BusId` bigint DEFAULT NULL,
  `DepartureAt` datetime(6) NOT NULL,
  `Status` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `DelayMinutes` int NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_trips_BusId_DepartureAt` (`BusId`,`DepartureAt`),
  KEY `IX_trips_RouteId` (`RouteId`),
  KEY `IX_trips_ScheduleId` (`ScheduleId`),
  CONSTRAINT `FK_trips_buses_BusId` FOREIGN KEY (`BusId`) REFERENCES `buses` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_trips_routes_RouteId` FOREIGN KEY (`RouteId`) REFERENCES `routes` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_trips_schedules_ScheduleId` FOREIGN KEY (`ScheduleId`) REFERENCES `schedules` (`Id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `trips` WRITE;
/*!40000 ALTER TABLE `trips` DISABLE KEYS */;
INSERT INTO `trips` VALUES (1,1,NULL,1,'2026-10-07 00:30:00.000000','Scheduled',0),(2,1,NULL,2,'2026-10-07 03:00:00.000000','Scheduled',0),(3,1,NULL,NULL,'2026-10-07 07:30:00.000000','Scheduled',0),(4,1,NULL,1,'2026-10-12 00:30:00.000000','Scheduled',0),(5,1,NULL,2,'2026-10-12 01:30:00.000000','Scheduled',0),(6,1,NULL,3,'2026-10-12 03:00:00.000000','Scheduled',0),(7,1,NULL,4,'2026-10-12 04:00:00.000000','Scheduled',0);
/*!40000 ALTER TABLE `trips` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `vouchers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vouchers` (
  `Id` bigint NOT NULL AUTO_INCREMENT,
  `Code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `DiscountType` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `DiscountValue` decimal(10,2) NOT NULL,
  `StartAt` datetime(6) NOT NULL,
  `EndAt` datetime(6) NOT NULL,
  `UsageLimit` int NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_vouchers_Code` (`Code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `vouchers` WRITE;
/*!40000 ALTER TABLE `vouchers` DISABLE KEYS */;
/*!40000 ALTER TABLE `vouchers` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

