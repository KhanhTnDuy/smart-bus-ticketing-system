package com.transport.route.service;

import com.transport.audit.service.AuditLogService;
import com.transport.route.model.Route;
import com.transport.route.model.Stop;
import com.transport.route.repository.RouteRepository;

import java.util.List;

public class RouteService {
    private final RouteRepository repository = new RouteRepository();
    private final AuditLogService auditLogService;

    public RouteService(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    public void addRoute(Route route) {
        validateRoute(route);
        if (repository.findById(route.getId()).isPresent()) {
            throw new IllegalArgumentException("Mã tuyến đã tồn tại.");
        }

        repository.save(route);
        auditLogService.log("manager", "THEM_TUYEN");
    }

    public List<Route> getAll() {
        return repository.findAll();
    }

    public Route getById(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy tuyến."));
    }

    public void updateFare(String id, double fare) {
        if (fare <= 0) {
            throw new IllegalArgumentException("Giá vé phải lớn hơn 0.");
        }

        Route route = getById(id);
        route.setFare(fare);
        auditLogService.log("manager", "CAP_NHAT_GIA_VE");
    }

    public void deleteRoute(String id) {
        getById(id);
        repository.deleteById(id);
        auditLogService.log("manager", "XOA_TUYEN");
    }

    public void addStop(String routeId, Stop stop) {
        if (stop.getName() == null || stop.getName().isBlank()) {
            throw new IllegalArgumentException("Tên trạm không được để trống.");
        }

        Route route = getById(routeId);
        route.addStop(stop);
        auditLogService.log("manager", "THEM_TRAM_DUNG");
    }

    private void validateRoute(Route route) {
        if (route == null) {
            throw new IllegalArgumentException("Tuyến không được null.");
        }
        if (route.getId() == null || route.getId().isBlank()) {
            throw new IllegalArgumentException("Mã tuyến không được để trống.");
        }
        if (route.getName() == null || route.getName().isBlank()) {
            throw new IllegalArgumentException("Tên tuyến không được để trống.");
        }
        if (route.getStartPoint() == null || route.getStartPoint().isBlank()
                || route.getEndPoint() == null || route.getEndPoint().isBlank()) {
            throw new IllegalArgumentException("Điểm đầu/cuối không được để trống.");
        }
        if (route.getFare() <= 0) {
            throw new IllegalArgumentException("Giá vé phải lớn hơn 0.");
        }
    }
}
