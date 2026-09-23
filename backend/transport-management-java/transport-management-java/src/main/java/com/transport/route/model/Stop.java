package com.transport.route.model;

public class Stop {
    private String id;
    private String name;
    private int order;

    public Stop(String id, String name, int order) {
        this.id = id;
        this.name = name;
        this.order = order;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public int getOrder() { return order; }

    @Override
    public String toString() {
        return String.format("Stop{id='%s', name='%s', order=%d}", id, name, order);
    }
}
