namespace SmartBus.Api.DTOs;

public record ScheduleRequest(
    string RouteName,
    string StartPoint,
    string EndPoint,
    TimeSpan StartTime,
    TimeSpan EndTime,
    int FrequencyMinutes,
    string DaysOfWeek,
    decimal Fare,
    bool Active = true,
    int? RouteId = null
);

public record GenerateTripsRequest(DateTime Date);

public record ScheduleResponse(
    int Id,
    int? RouteId,
    string RouteName,
    string StartPoint,
    string EndPoint,
    TimeSpan StartTime,
    TimeSpan EndTime,
    int FrequencyMinutes,
    string DaysOfWeek,
    decimal Fare,
    bool Active
);
