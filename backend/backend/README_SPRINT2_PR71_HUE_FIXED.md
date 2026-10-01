# Sprint 2 PR #71 - Huệ - fixed integration

This version integrates Sprint 2 operations into the existing `SmartBusTicketing.Api`.
It does NOT create a second `SmartBus.Api` project.

Implemented using existing entities:
- Bus -> `Models.Bus`
- Seat -> `Models.Seat`
- Schedule -> `Models.Schedule`
- Trip -> `Models.Trip`
- Driver/Conductor -> `Models.Account` with `AccountRole.Driver/Conductor`
- Trip assignment -> `Models.TripStaff`
- Audit -> existing `AuditLogService`

No SQLite, no `EnsureCreated`, no duplicate Route/Bus/Trip/Driver/AuditLog models.

New API controllers:
- `api/buses`
- `api/buses/{busId}/seats`
- `api/schedules`
- `api/trips`
- `api/trips/{tripId}/assignments`
- `api/resources`

Authentication uses the existing JWT setup and mutation endpoints require Admin/Manager where appropriate.


## Database and frontend verification

- MySQL remains the only database provider for the API.
- EF Core migrations under `SmartBusTicketing.Api/Data/Migrations` are the authoritative database definition used by `dotnet ef database update`.
- `backend/database/schema.sql` is a reference design and is intentionally not used by application startup; its legacy columns are not the source of truth.
- The existing frontend contains older local-storage/demo flows in `DataContext.tsx`. The Sprint 2 PR itself is implemented in the existing backend project; this PR does not claim that every existing frontend screen has been migrated from mock/local data to the new Sprint 2 endpoints.
- Frontend API configuration now defaults to the backend HTTPS development URL `https://localhost:7053`.

- OpenAPI/JWT ASP.NET packages are pinned to 10.0.12; `Microsoft.AspNetCore.OpenApi` 10.0.12 requires `Microsoft.OpenApi >= 2.12.0`.
