# Smart Bus Ticketing - Backend

This backend keeps the original SmartBusTicketing backend structure and adds the API endpoints required for US1-US4.

## US1 - Account Management
- POST `/api/auth/login`
- POST `/api/auth/logout`
- GET/POST/PUT/PATCH/DELETE `/api/accounts...`

## US2 - Audit Logs
- GET `/api/audit-logs`
- GET `/api/audit-logs/{id}`

## US3 - Routes, Stops, Fares
- GET/POST/PUT/DELETE `/api/routes...`
- PUT `/api/routes/{id}/stops`
- GET/POST/PUT/DELETE `/api/stops...`
- GET/POST/PUT/DELETE `/api/fares...`

## US4 - Feedback
- GET/POST `/api/feedback`
- GET `/api/feedback/{id}`
- PATCH `/api/feedback/{id}/status`

## Run
1. Create the MySQL database using `database/schema.sql`.
2. Set `ConnectionStrings:Default` in `SmartBusTicketing.Api/appsettings.json`.
3. Open `SmartBusTicketing.slnx` in Visual Studio 2026 with .NET 10 SDK.
4. Run `SmartBusTicketing.Api`.

## GitHub
Upload the **contents of this backend folder as source files**, not the ZIP itself. The repository should contain:

smart-bus-ticketing-system/
- frontend/
- backend/
  - database/
  - SmartBusTicketing.Api/
