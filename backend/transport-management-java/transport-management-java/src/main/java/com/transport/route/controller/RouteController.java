package com.transport.route.controller;

import com.transport.route.model.Route;
import com.transport.route.model.Stop;
import com.transport.route.service.RouteService;

public class RouteController {
    private final RouteService service;

    public RouteController(RouteService service) {
        this.service = service;
    }

    public void addRoute(Route route) {
        service.addRoute(route);
        System.out.println("[OK] Đã thêm tuyến: " + route.getName());
    }

    public void addStop(String routeId, Stop stop) {
        service.addStop(routeId, stop);
        System.out.println("[OK] Đã thêm trạm: " + stop.getName());
    }

    public void updateFare(String routeId, double fare) {
        service.updateFare(routeId, fare);
        System.out.println("[OK] Đã cập nhật giá vé tuyến " + routeId);
    }

    public void deleteRoute(String routeId) {
        service.deleteRoute(routeId);
        System.out.println("[OK] Đã xóa tuyến: " + routeId);
    }

    public void listRoutes() {
        System.out.println("Danh sách tuyến:");
        service.getAll().forEach(route -> System.out.println("  " + route));
    }

    public void showRoute(String routeId) {
        Route route = service.getById(routeId);
        System.out.println("Chi tiết tuyến: " + route);
        route.getStops().forEach(stop -> System.out.println("    - " + stop));
    }
}
