using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartBusTicketing.Api.DTOs;
using SmartBusTicketing.Api.Models;
using SmartBusTicketing.Api.Services;

namespace SmartBusTicketing.Api.Controllers;

/// <summary>
/// Tải lên và tải xuống giấy tờ (thẻ sinh viên, giấy tờ tùy thân...).
///
/// Giấy tờ là dữ liệu cá nhân nên KHÔNG đặt trong thư mục tĩnh công khai: tệp nằm ở App_Data/uploads và chỉ
/// đọc được qua endpoint này, bởi chính chủ hoặc Admin, Quản lý. Tên tệp do máy chủ sinh (mã tài khoản + GUID)
/// và kiểm tra theo mẫu cố định, nên không thể dùng tên tệp để đọc ra ngoài thư mục. Loại tệp được xác định
/// bằng nội dung (chữ ký đầu tệp), không tin phần mở rộng hay Content-Type do client gửi.
/// </summary>
[ApiController]
[Route("api/uploads")]
[Authorize]
public class UploadsController(IWebHostEnvironment env) : ControllerBase
{
    public const long MaxBytes = 5 * 1024 * 1024;
    private static readonly Regex NamePattern = new(@"^(?<owner>\d+)-[0-9a-f]{32}\.(jpg|png|pdf)$", RegexOptions.Compiled);

    private string Folder => Path.Combine(env.ContentRootPath, "App_Data", "uploads");

    /// <summary>true nếu url có dạng /api/uploads/{tên tệp} và tệp đó do chính tài khoản này tải lên.</summary>
    public static bool IsOwnedUploadUrl(string url, long accountId)
    {
        const string prefix = "/api/uploads/";
        if (!url.StartsWith(prefix, StringComparison.Ordinal)) return false;
        var m = NamePattern.Match(url[prefix.Length..]);
        return m.Success && m.Groups["owner"].Value == accountId.ToString();
    }

    /// <summary>Trả về phần mở rộng và loại nội dung nếu chữ ký đầu tệp đúng là JPEG, PNG hoặc PDF.</summary>
    private static (string Ext, string ContentType)? Sniff(byte[] head)
    {
        if (head.Length >= 3 && head[0] == 0xFF && head[1] == 0xD8 && head[2] == 0xFF) return ("jpg", "image/jpeg");
        if (head.Length >= 8 && head[0] == 0x89 && head[1] == 0x50 && head[2] == 0x4E && head[3] == 0x47) return ("png", "image/png");
        if (head.Length >= 5 && head[0] == 0x25 && head[1] == 0x50 && head[2] == 0x44 && head[3] == 0x46 && head[4] == 0x2D) return ("pdf", "application/pdf");
        return null;
    }

    [HttpPost]
    [RequestSizeLimit(MaxBytes + 4096)]
    public async Task<ActionResult<UploadResultDto>> Upload(IFormFile? file, CancellationToken ct)
    {
        var me = User.AccountId();
        if (me is null) return Unauthorized();
        if (file is null || file.Length == 0) return BadRequest(new { message = "Vui lòng chọn một tệp." });
        if (file.Length > MaxBytes) return BadRequest(new { message = "Tệp quá lớn, tối đa 5 MB." });

        await using var input = file.OpenReadStream();
        var head = new byte[8];
        var read = await input.ReadAsync(head.AsMemory(0, 8), ct);
        var kind = Sniff(head[..read]);
        if (kind is null) return BadRequest(new { message = "Chỉ nhận ảnh JPG, PNG hoặc tệp PDF." });

        Directory.CreateDirectory(Folder);
        var name = $"{me}-{Guid.NewGuid():N}.{kind.Value.Ext}";
        input.Position = 0;
        await using (var output = System.IO.File.Create(Path.Combine(Folder, name)))
            await input.CopyToAsync(output, ct);

        return Ok(new UploadResultDto { Url = $"/api/uploads/{name}", FileName = name, Size = file.Length });
    }

    [HttpGet("{name}")]
    public IActionResult Download(string name)
    {
        var m = NamePattern.Match(name);
        if (!m.Success) return NotFound();

        var isStaff = User.IsInAppRole(AccountRole.Admin) || User.IsInAppRole(AccountRole.Manager);
        if (!isStaff && m.Groups["owner"].Value != User.AccountId()?.ToString()) return Forbid();

        var path = Path.Combine(Folder, name);
        if (!System.IO.File.Exists(path)) return NotFound();

        var contentType = name.EndsWith(".pdf") ? "application/pdf" : name.EndsWith(".png") ? "image/png" : "image/jpeg";
        Response.Headers.CacheControl = "private, max-age=300";
        return PhysicalFile(path, contentType);
    }
}
