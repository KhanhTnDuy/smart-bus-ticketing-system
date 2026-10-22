using System.Collections;
using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace SmartBusTicketing.Api.Services;

/// <summary>
/// System.Text.Json nhận mọi số nguyên cho kiểu enum, kể cả giá trị không có thật (ví dụ vai trò 99 hay trạng thái xe 99), và EF
/// ghi nguyên chuỗi "99" xuống CSDL: tài khoản mang vai trò lạ không đăng nhập vào được trang nào. Bộ lọc này kiểm mọi đối số của
/// action (và các thuộc tính lồng nhau của DTO) trước khi controller chạy, nên không phải gắn thuộc tính kiểm tra cho từng DTO.
/// </summary>
public sealed class UndefinedEnumFilter : IActionFilter
{
    private const int MaxDepth = 3;

    public void OnActionExecuting(ActionExecutingContext context)
    {
        var added = false;
        foreach (var (name, value) in context.ActionArguments)
        {
            added |= Validate(value, name, 0, context.ModelState);
        }
        if (added) context.Result = new BadRequestObjectResult(new ValidationProblemDetails(context.ModelState));
    }

    public void OnActionExecuted(ActionExecutedContext context) { }

    private static bool Validate(object? value, string path, int depth, Microsoft.AspNetCore.Mvc.ModelBinding.ModelStateDictionary state)
    {
        if (value is null || depth > MaxDepth) return false;
        var type = value.GetType();

        if (type.IsEnum)
        {
            if (type.IsDefined(typeof(FlagsAttribute), false) || Enum.IsDefined(type, value)) return false;
            state.AddModelError(path, $"Giá trị '{Convert.ToInt64(value)}' không hợp lệ cho {path}.");
            return true;
        }

        if (value is string || type.IsPrimitive || type.IsValueType && type.Namespace == "System") return false;

        var added = false;
        if (value is IEnumerable items)
        {
            var i = 0;
            foreach (var item in items)
            {
                if (i++ >= 1000) break;
                added |= Validate(item, $"{path}[{i - 1}]", depth + 1, state);
            }
            return added;
        }

        // Chỉ đi vào các kiểu của chính dự án (DTO); bỏ qua CancellationToken, IFormFile...
        if (type.Namespace?.StartsWith("SmartBusTicketing", StringComparison.Ordinal) != true) return false;
        foreach (var prop in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (!prop.CanRead || prop.GetIndexParameters().Length > 0) continue;
            added |= Validate(prop.GetValue(value), $"{path}.{prop.Name}", depth + 1, state);
        }
        return added;
    }
}
