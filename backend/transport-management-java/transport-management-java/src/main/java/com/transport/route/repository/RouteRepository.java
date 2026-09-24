package com.transport.route.repository;

import com.transport.route.model.Route;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

public class RouteRepository {
    private final List<Route> routes = new ArrayList<>();

    public void save(Route route) {
        routes.add(route);
    }

    public Optional<Route> findById(String id) {
        return routes.stream()
                .filter(r -> r.getId().equalsIgnoreCase(id))
                .findFirst();
    }

    public List<Route> findAll() {
        return new ArrayList<>(routes);
    }

    public boolean deleteById(String id) {
        return routes.removeIf(r -> r.getId().equalsIgnoreCase(id));
    }
}
