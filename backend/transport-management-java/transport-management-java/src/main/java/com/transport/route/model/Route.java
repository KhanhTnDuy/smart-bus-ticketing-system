package com.transport.route.model;

import java.util.ArrayList;
import java.util.List;

public class Route {
    private String id;
    private String name;
    private String startPoint;
    private String endPoint;
    private double fare;
    private final List<Stop> stops = new ArrayList<>();

    public Route(String id, String name, String startPoint, String endPoint, double fare) {
        this.id = id;
        this.name = name;
        this.startPoint = startPoint;
        this.endPoint = endPoint;
        this.fare = fare;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getStartPoint() { return startPoint; }
    public String getEndPoint() { return endPoint; }
    public double getFare() { return fare; }
    public List<Stop> getStops() { return new ArrayList<>(stops); }

    public void setName(String name) { this.name = name; }
    public void setStartPoint(String startPoint) { this.startPoint = startPoint; }
    public void setEndPoint(String endPoint) { this.endPoint = endPoint; }
    public void setFare(double fare) { this.fare = fare; }

    public void addStop(Stop stop) {
        stops.add(stop);
    }

    @Override
    public String toString() {
        return String.format(
                "Route{id='%s', name='%s', %s -> %s, fare=%.0f, stops=%d}",
                id, name, startPoint, endPoint, fare, stops.size()
        );
    }
}
