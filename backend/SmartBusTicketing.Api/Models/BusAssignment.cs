namespace SmartBusTicketing.Api.Models;

public class BusAssignment
{
    public long Id { get; set; }

    /// <summary>Mã phân công hiển thị (VD: ASN-001)</summary>
    public string AssignmentCode { get; set; } = string.Empty;

    public long RouteId { get; set; }
    public BusRoute? Route { get; set; }

    /// <summary>Biển số xe buýt vận hành (VD: 51B-184.22)</summary>
    public string BusPlate { get; set; } = string.Empty;

    /// <summary>Mã định danh tài xế chính (USR-003 hoặc ID)</summary>
    public string DriverId { get; set; } = string.Empty;

    /// <summary>Họ tên tài xế chính</summary>
    public string DriverName { get; set; } = string.Empty;

    /// <summary>Mã định danh phụ xe / soát vé (nếu có)</summary>
    public string? AssistantId { get; set; }

    /// <summary>Họ tên nhân viên phụ xe / soát vé</summary>
    public string? AssistantName { get; set; }

    /// <summary>Ngày phân công làm việc (YYYY-MM-DD)</summary>
    public DateOnly Date { get; set; }

    /// <summary>Ca trực: CA_SANG, CA_CHIEU, CA_TOI, TOAN_THOI_GIAN</summary>
    public string Shift { get; set; } = "CA_SANG";

    /// <summary>Khung giờ chạy thực tế (VD: 05:30 — 13:30)</summary>
    public string ShiftHours { get; set; } = "05:30 — 13:30";

    /// <summary>Thời điểm bắt đầu ca (được tính từ Date + ShiftHours)</summary>
    public DateTime StartTime { get; set; }

    /// <summary>Thời điểm kết thúc ca (được tính từ Date + ShiftHours)</summary>
    public DateTime EndTime { get; set; }

    /// <summary>Trạng thái: ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED</summary>
    public string Status { get; set; } = "ASSIGNED";

    /// <summary>Ghi chú điều động</summary>
    public string? Notes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
