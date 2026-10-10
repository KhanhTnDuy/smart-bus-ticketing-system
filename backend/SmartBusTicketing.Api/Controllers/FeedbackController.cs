using System.Linq.Expressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartBusTicketing.Api.Data;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// US4 - Phản ánh và đánh giá chuyến đi.
/// Hành khách gửi phản ánh của chính mình; Admin và Quản lý xem danh sách và xử lý.
/// </summary>
[ApiController]
[Route("api/feedback")]
[Authorize]
public class FeedbackController(AppDbContext db, AuditLogService audit) : ControllerBase
{
    /// <summary>
    /// Danh sách phản ánh cho trang quản lý, lọc theo trạng thái, loại và từ khóa.
    /// Chiếu sang FeedbackDto nên không còn trả kèm PasswordHash của người gửi.
    /// </summary>
    [HttpGet, Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> GetAll(
        [FromQuery] FeedbackStatus? status,
        [FromQuery] FeedbackType? type,
        [FromQuery] string? search,
        CancellationToken ct)
    {
        var q = db.Feedbacks.AsNoTracking().AsQueryable();
        if (status.HasValue) q = q.Where(f => f.Status == status.Value);
        if (type.HasValue) q = q.Where(f => f.Type == type.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var value = search.Trim();
            q = q.Where(f => f.Subject.Contains(value)
                || f.Content.Contains(value)
                || f.Passenger.FullName.Contains(value));
        }

        return Ok(await q.OrderByDescending(f => f.CreatedAt).ThenByDescending(f => f.Id)
            .Select(ToDto).ToListAsync(ct));
    }

    /// <summary>Dùng trong Select nên phải là Expression để EF dịch được sang SQL.</summary>
    private static readonly Expression<Func<Feedback, FeedbackDto>> ToDto = f => new FeedbackDto
    {
        Id = f.Id,
        PassengerId = f.PassengerId,
        PassengerName = f.Passenger.FullName,
        PassengerEmail = f.Passenger.Email,
        PassengerPhone = f.Passenger.Phone,
        RouteId = f.RouteId,
        RouteCode = f.BusRoute != null ? f.BusRoute.Code : null,
        RouteName = f.BusRoute != null ? f.BusRoute.Name : null,
        TripId = f.TripId,
        Type = f.Type,
        Subject = f.Subject,
        Content = f.Content,
        Rating = f.Rating,
        ImagePath = f.ImagePath,
        Status = f.Status,
        ProcessedBy = f.ProcessedBy,
        ProcessedByName = f.Processor != null ? f.Processor.FullName : null,
        CreatedAt = f.CreatedAt,
    };

    /// <summary>Phản ánh và đánh giá do chính người đăng nhập gửi, mới nhất trước.</summary>
    [HttpGet("my")]
    public async Task<IActionResult> GetMine([FromQuery] FeedbackType? type, CancellationToken ct)
    {
        var passengerId = User.AccountId();
        if (passengerId is null) return Unauthorized();

        var q = db.Feedbacks.AsNoTracking().Where(f => f.PassengerId == passengerId.Value);
        if (type.HasValue) q = q.Where(f => f.Type == type.Value);

        return Ok(await q.OrderByDescending(f => f.CreatedAt).ThenByDescending(f => f.Id)
            .Select(ToDto).ToListAsync(ct));
    }

    /// <summary>Hành khách chỉ xem được phản ánh của chính mình; Admin và Quản lý xem được tất cả.</summary>
    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id, CancellationToken ct)
    {
        var f = await db.Feedbacks.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new FeedbackDetailDto
            {
                Id = x.Id,
                PassengerId = x.PassengerId,
                PassengerName = x.Passenger.FullName,
                PassengerEmail = x.Passenger.Email,
                PassengerPhone = x.Passenger.Phone,
                RouteId = x.RouteId,
                RouteCode = x.BusRoute != null ? x.BusRoute.Code : null,
                RouteName = x.BusRoute != null ? x.BusRoute.Name : null,
                TripId = x.TripId,
                Type = x.Type,
                Subject = x.Subject,
                Content = x.Content,
                Rating = x.Rating,
                ImagePath = x.ImagePath,
                Status = x.Status,
                ProcessedBy = x.ProcessedBy,
                ProcessedByName = x.Processor != null ? x.Processor.FullName : null,
                CreatedAt = x.CreatedAt,
                History = x.History.OrderBy(h => h.ChangedAt).Select(h => new FeedbackHistoryDto
                {
                    Id = h.Id,
                    OldStatus = h.OldStatus,
                    NewStatus = h.NewStatus,
                    ChangedBy = h.ChangedBy,
                    ChangedByName = h.Changer.FullName,
                    ChangedAt = h.ChangedAt,
                }).ToList(),
            })
            .FirstOrDefaultAsync(ct);
        if (f is null) return NotFound();

        var isStaff = User.IsInAppRole(AccountRole.Admin) || User.IsInAppRole(AccountRole.Manager);
        if (!isStaff && f.PassengerId != User.AccountId()) return Forbid();

        return Ok(f);
    }

    /// <summary>
    /// Gửi phản ánh hoặc đánh giá. Hành khách được lấy từ JWT, không nhận PassengerId
    /// từ body để một tài khoản không thể gửi phản ánh thay người khác.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create(FeedbackRequest request, CancellationToken ct)
    {
        var passengerId = User.AccountId();
        if (passengerId is null) return Unauthorized();

        if (!await db.Accounts.AnyAsync(a => a.Id == passengerId && a.Role == AccountRole.Passenger, ct))
            return BadRequest(new { message = "Chỉ tài khoản có vai trò Hành khách mới gửi được phản ánh." });

        // Đánh giá chuyến đi thì số sao là bắt buộc (SCRUM-21).
        if (request.Type == FeedbackType.Review && request.Rating is < 1 or > 5)
            return BadRequest(new { message = "Đánh giá chuyến đi phải có số sao từ 1 đến 5." });

        // Khiếu nại thì nội dung là bắt buộc; đánh giá có thể chỉ có số sao.
        if (request.Type == FeedbackType.Complaint && string.IsNullOrWhiteSpace(request.Content))
            return BadRequest(new { message = "Nội dung khiếu nại không được để trống." });

        if (request.RouteId is not null && !await db.BusRoutes.AnyAsync(r => r.Id == request.RouteId, ct))
            return BadRequest(new { message = "Tuyến đường không tồn tại." });

        if (request.TripId is not null && !await db.Trips.AnyAsync(t => t.Id == request.TripId, ct))
            return BadRequest(new { message = "Chuyến xe không tồn tại." });

        var f = new Feedback
        {
            PassengerId = passengerId.Value,
            RouteId = request.RouteId,
            TripId = request.TripId,
            Type = request.Type,
            Subject = request.Subject.Trim(),
            Content = request.Content?.Trim() ?? string.Empty,
            Rating = request.Rating,
            ImagePath = request.ImagePath,
            Status = FeedbackStatus.ChuaXuLy,
            CreatedAt = DateTime.UtcNow,
        };

        db.Feedbacks.Add(f);
        if (request.Type == FeedbackType.Complaint)
            await NotificationRules.NotifyManagementAsync(db, "Khiếu nại mới", $"Có khiếu nại mới: {f.Subject}", "/manager/complaints", passengerId, ct);
        await db.SaveChangesAsync(ct);
        await audit.WriteAsync(passengerId, User.Username() ?? "passenger", "Submit feedback",
            AuditActionType.FeedbackSubmit, $"FEEDBACK-{f.Id}", ct: ct);
        return CreatedAtAction(nameof(Get), new { id = f.Id }, await ProjectAsync(f.Id, ct));
    }

    [HttpPatch("{id:long}/status"), Authorize(Roles = "Admin,Manager")]
    public async Task<IActionResult> UpdateStatus(long id, FeedbackStatusRequest request, CancellationToken ct)
    {
        var f = await db.Feedbacks.FindAsync([id], ct);
        if (f is null) return NotFound();

        var actorId = User.AccountId();
        var old = f.Status;
        if (old == request.Status) return Ok(await ProjectAsync(id, ct));

        f.Status = request.Status;
        f.ProcessedBy = actorId;
        if (actorId.HasValue)
        {
            db.FeedbackHistories.Add(new FeedbackHistory
            {
                FeedbackId = f.Id, OldStatus = old, NewStatus = request.Status,
                ChangedBy = actorId.Value, ChangedAt = DateTime.UtcNow,
            });
        }
        NotificationRules.Notify(db, f.PassengerId, NotificationType.Other, "Phản ánh của bạn đã được cập nhật",
            $"\"{f.Subject}\" chuyển sang trạng thái {request.Status switch { FeedbackStatus.DangXuLy => "đang xử lý", FeedbackStatus.DaXuLy => "đã xử lý", _ => "chưa xử lý" }}.",
            f.Type == FeedbackType.Complaint ? "/passenger/complaints" : "/passenger/rating");
        await db.SaveChangesAsync(ct);

        await audit.WriteAsync(actorId, User.Username() ?? "manager",
            $"Feedback status {old} -> {request.Status}", AuditActionType.StatusChange, $"FEEDBACK-{id}", ct: ct);
        return Ok(await ProjectAsync(id, ct));
    }

    /// <summary>
    /// Đọc lại bản ghi dưới dạng DTO để trả về.
    ///
    /// Không trả thẳng entity đang được theo dõi: sau khi thêm FeedbackHistory,
    /// EF tự nối navigation hai chiều nên Feedback.History[i].Feedback trỏ ngược
    /// lại chính nó, khiến System.Text.Json gặp vòng lặp và trả HTTP 500 dù dữ
    /// liệu đã lưu thành công.
    /// </summary>
    private Task<FeedbackDto?> ProjectAsync(long id, CancellationToken ct) =>
        db.Feedbacks.AsNoTracking().Where(x => x.Id == id).Select(ToDto).FirstOrDefaultAsync(ct);
}
