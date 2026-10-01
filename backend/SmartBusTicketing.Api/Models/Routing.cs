namespace SmartBusTicketing.Api.Models;

public class BusRoute
{
    public long Id { get; set; }
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string StartPoint { get; set; } = null!;
    public string EndPoint { get; set; } = null!;
    public decimal DistanceKm { get; set; }
    public bool Active { get; set; } = true;

    public ICollection<RouteStop> RouteStops { get; set; } = new List<RouteStop>();
    public ICollection<Fare> Fares { get; set; } = new List<Fare>();
    public ICollection<Schedule> Schedules { get; set; } = new List<Schedule>();
    public ICollection<Trip> Trips { get; set; } = new List<Trip>();
}

public class Stop
{
    public long Id { get; set; }
    public string Name { get; set; } = null!;
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }

    public ICollection<RouteStop> RouteStops { get; set; } = new List<RouteStop>();
}

public class RouteStop
{
    public long RouteId { get; set; }
    public BusRoute BusRoute { get; set; } = null!;
    public long StopId { get; set; }
    public Stop Stop { get; set; } = null!;
    public int StopOrder { get; set; }
    public int MinutesFromStart { get; set; }
}

public class Fare
{
    public long Id { get; set; }
    public long RouteId { get; set; }
    public BusRoute BusRoute { get; set; } = null!;
    public TicketType TicketType { get; set; }
    public int PassengerTypeId { get; set; }
    public PassengerType PassengerType { get; set; } = null!;
    public decimal Price { get; set; }
    public DateOnly EffectiveFrom { get; set; }
}

public class Bus
{
    public long Id { get; set; }
    public string PlateNumber { get; set; } = null!;
    public int Capacity { get; set; }
    public BusStatus Status { get; set; } = BusStatus.Active;

    public ICollection<Seat> Seats { get; set; } = new List<Seat>();
    public ICollection<Trip> Trips { get; set; } = new List<Trip>();
    public ICollection<BusLocation> Locations { get; set; } = new List<BusLocation>();
}

public class Seat
{
    public long Id { get; set; }
    public long BusId { get; set; }
    public Bus Bus { get; set; } = null!;
    public string SeatCode { get; set; } = null!;
    public int SeatRow { get; set; }
    public int SeatCol { get; set; }

    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
}

public class Schedule
{
    public long Id { get; set; }
    public long RouteId { get; set; }
    public BusRoute BusRoute { get; set; } = null!;
    public TimeOnly FirstDeparture { get; set; }
    public TimeOnly LastDeparture { get; set; }
    public int FrequencyMinutes { get; set; }
    public string DaysOfWeek { get; set; } = null!;

    public ICollection<Trip> Trips { get; set; } = new List<Trip>();
}

public class Trip
{
    public long Id { get; set; }
    public long RouteId { get; set; }
    public BusRoute BusRoute { get; set; } = null!;
    public long? ScheduleId { get; set; }
    public Schedule? Schedule { get; set; }
    public long? BusId { get; set; }
    public Bus? Bus { get; set; }
    public DateTime DepartureAt { get; set; }
    public TripStatus Status { get; set; } = TripStatus.Scheduled;
    public int DelayMinutes { get; set; }

    public ICollection<TripStaff> TripStaff { get; set; } = new List<TripStaff>();
    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
    public ICollection<BusLocation> Locations { get; set; } = new List<BusLocation>();
    public ICollection<Incident> Incidents { get; set; } = new List<Incident>();
}

public class TripStaff
{
    public long TripId { get; set; }
    public Trip Trip { get; set; } = null!;
    public long AccountId { get; set; }
    public Account Account { get; set; } = null!;
    public StaffDuty Duty { get; set; }
}
