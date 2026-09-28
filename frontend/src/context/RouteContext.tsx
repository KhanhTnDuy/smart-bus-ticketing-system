'use client';

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Route, Stop, TicketPrice, VehicleType, RouteStatistics } from '@/types/route';
import { INITIAL_ROUTES, INITIAL_STOPS, INITIAL_PRICES } from '@/data/mockRoutes';

export type TabType = 'routes' | 'stops' | 'pricing';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface RouteContextType {
  // Tabs & Navigation
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  selectedRouteId: string;
  setSelectedRouteId: (routeId: string) => void;
  selectedVehicleType: VehicleType;
  setSelectedVehicleType: (vehicleType: VehicleType) => void;

  // Data
  routes: Route[];
  stops: Stop[];
  prices: TicketPrice[];
  statistics: RouteStatistics;

  // Route Actions
  addRoute: (data: Omit<Route, 'id' | 'stopsCount' | 'createdAt'>) => void;
  updateRoute: (id: string, data: Partial<Route>) => void;
  deleteRoute: (id: string) => void;
  toggleRouteStatus: (id: string) => void;

  // Stop Actions
  getStopsByRoute: (routeId: string) => Stop[];
  addStop: (data: Omit<Stop, 'id' | 'orderIndex'>) => void;
  updateStop: (id: string, data: Partial<Stop>) => void;
  deleteStop: (id: string) => void;
  reorderStop: (stopId: string, direction: 'up' | 'down') => void;

  // Pricing Actions
  getPricesByRoute: (routeId: string, vehicleType?: VehicleType) => TicketPrice[];
  addPrice: (data: Omit<TicketPrice, 'id' | 'updatedAt'>) => void;
  updatePrice: (id: string, data: Partial<TicketPrice>) => void;
  deletePrice: (id: string) => void;
  generateDefaultPrices: (routeId: string) => void;

  // Notifications & State reset
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  removeToast: (id: string) => void;
  resetToMockData: () => void;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ROUTES: 'bus_admin_routes',
  STOPS: 'bus_admin_stops',
  PRICES: 'bus_admin_prices',
};

export const RouteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabType>('routes');
  const [selectedRouteId, setSelectedRouteId] = useState<string>('route-sg-dl');
  const [selectedVehicleType, setSelectedVehicleType] = useState<VehicleType>('sleeper');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Initialize data with localStorage or mock fallback
  const [routes, setRoutes] = useState<Route[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.ROUTES);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* ignore */ }
      }
    }
    return INITIAL_ROUTES;
  });

  const [stops, setStops] = useState<Stop[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.STOPS);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* ignore */ }
      }
    }
    return INITIAL_STOPS;
  });

  const [prices, setPrices] = useState<TicketPrice[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEYS.PRICES);
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { /* ignore */ }
      }
    }
    return INITIAL_PRICES;
  });

  // Save to localStorage when state changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(routes));
    }
  }, [routes]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.STOPS, JSON.stringify(stops));
    }
  }, [stops]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(prices));
    }
  }, [prices]);

  // Toast notification management
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  // Reset to mock data
  const resetToMockData = useCallback(() => {
    setRoutes(INITIAL_ROUTES);
    setStops(INITIAL_STOPS);
    setPrices(INITIAL_PRICES);
    setSelectedRouteId('route-sg-dl');
    showToast('Đã khôi phục dữ liệu mẫu ban đầu thành công!', 'info');
  }, [showToast]);

  // Derived statistics
  const statistics = useMemo<RouteStatistics>(() => {
    const totalRoutes = routes.length;
    const activeRoutes = routes.filter((r) => r.status === 'active').length;
    const inactiveRoutes = totalRoutes - activeRoutes;
    const totalStops = stops.length;
    const totalPricingRules = prices.length;

    return {
      totalRoutes,
      activeRoutes,
      inactiveRoutes,
      totalStops,
      totalPricingRules,
    };
  }, [routes, stops, prices]);

  // Route CRUD
  const addRoute = useCallback((data: Omit<Route, 'id' | 'stopsCount' | 'createdAt'>) => {
    const newId = `route-${Date.now().toString(36)}`;
    const newRoute: Route = {
      ...data,
      id: newId,
      stopsCount: 0,
      createdAt: new Date().toISOString(),
    };

    setRoutes((prev) => [newRoute, ...prev]);
    showToast(`Đã thêm tuyến đường "${newRoute.name}" thành công!`, 'success');
  }, [showToast]);

  const updateRoute = useCallback((id: string, data: Partial<Route>) => {
    setRoutes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...data } : r))
    );
    showToast('Đã cập nhật thông tin tuyến đường!', 'success');
  }, [showToast]);

  const deleteRoute = useCallback((id: string) => {
    const target = routes.find((r) => r.id === id);
    setRoutes((prev) => prev.filter((r) => r.id !== id));
    // Also remove related stops & prices
    setStops((prev) => prev.filter((s) => s.routeId !== id));
    setPrices((prev) => prev.filter((p) => p.routeId !== id));

    // Update selectedRouteId if deleted
    if (selectedRouteId === id) {
      const remaining = routes.filter((r) => r.id !== id);
      if (remaining.length > 0) {
        setSelectedRouteId(remaining[0].id);
      }
    }
    showToast(`Đã xóa tuyến "${target?.name || id}" và các dữ liệu liên quan.`, 'info');
  }, [routes, selectedRouteId, showToast]);

  const toggleRouteStatus = useCallback((id: string) => {
    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const newStatus = r.status === 'active' ? 'inactive' : 'active';
          return { ...r, status: newStatus };
        }
        return r;
      })
    );
    showToast('Đã chuyển đổi trạng thái tuyến đường.', 'success');
  }, [showToast]);

  // Stop CRUD
  const getStopsByRoute = useCallback((routeId: string) => {
    return stops
      .filter((s) => s.routeId === routeId)
      .sort((a, b) => a.orderIndex - b.orderIndex);
  }, [stops]);

  const addStop = useCallback((data: Omit<Stop, 'id' | 'orderIndex'>) => {
    const routeStops = stops.filter((s) => s.routeId === data.routeId);
    const nextOrderIndex = routeStops.length + 1;
    const newStop: Stop = {
      ...data,
      id: `stop-${Date.now().toString(36)}`,
      orderIndex: nextOrderIndex,
    };

    setStops((prev) => [...prev, newStop]);

    // Update stopsCount in route
    setRoutes((prev) =>
      prev.map((r) => (r.id === data.routeId ? { ...r, stopsCount: (r.stopsCount || 0) + 1 } : r))
    );

    showToast(`Đã thêm trạm dừng "${newStop.name}" vào vị trí số ${nextOrderIndex}!`, 'success');
  }, [stops, showToast]);

  const updateStop = useCallback((id: string, data: Partial<Stop>) => {
    setStops((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data } : s))
    );

    // Update stop name in prices if stop name changed
    if (data.name) {
      setPrices((prev) =>
        prev.map((p) => {
          let updated = { ...p };
          if (p.fromStopId === id) updated.fromStopName = data.name!;
          if (p.toStopId === id) updated.toStopName = data.name!;
          return updated;
        })
      );
    }

    showToast('Đã cập nhật thông tin trạm dừng!', 'success');
  }, [showToast]);

  const deleteStop = useCallback((id: string) => {
    const stopToDelete = stops.find((s) => s.id === id);
    if (!stopToDelete) return;

    const routeId = stopToDelete.routeId;

    // Remove stop and reorder remaining stops
    setStops((prev) => {
      const remainingInRoute = prev
        .filter((s) => s.routeId === routeId && s.id !== id)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const reindexed = remainingInRoute.map((s, idx) => ({
        ...s,
        orderIndex: idx + 1,
      }));

      const otherStops = prev.filter((s) => s.routeId !== routeId);
      return [...otherStops, ...reindexed];
    });

    // Remove related prices involving this stop
    setPrices((prev) => prev.filter((p) => p.fromStopId !== id && p.toStopId !== id));

    // Update route stopsCount
    setRoutes((prev) =>
      prev.map((r) => (r.id === routeId ? { ...r, stopsCount: Math.max(0, (r.stopsCount || 1) - 1) } : r))
    );

    showToast(`Đã xóa trạm dừng "${stopToDelete.name}".`, 'info');
  }, [stops, showToast]);

  const reorderStop = useCallback((stopId: string, direction: 'up' | 'down') => {
    setStops((prev) => {
      const currentStop = prev.find((s) => s.id === stopId);
      if (!currentStop) return prev;

      const routeStops = prev
        .filter((s) => s.routeId === currentStop.routeId)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      const currentIndex = routeStops.findIndex((s) => s.id === stopId);
      if (currentIndex === -1) return prev;

      if (direction === 'up' && currentIndex === 0) return prev; // Cannot move up
      if (direction === 'down' && currentIndex === routeStops.length - 1) return prev; // Cannot move down

      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      const targetStop = routeStops[targetIndex];

      // Swap orderIndex
      const tempOrder = currentStop.orderIndex;
      const newCurrentOrder = targetStop.orderIndex;
      const newTargetOrder = tempOrder;

      return prev.map((s) => {
        if (s.id === currentStop.id) return { ...s, orderIndex: newCurrentOrder };
        if (s.id === targetStop.id) return { ...s, orderIndex: newTargetOrder };
        return s;
      });
    });

    showToast('Đã sắp xếp lại thứ tự trạm dừng thành công.', 'success');
  }, [showToast]);

  // Pricing CRUD
  const getPricesByRoute = useCallback((routeId: string, vehicleType?: VehicleType) => {
    return prices.filter((p) => {
      const matchRoute = p.routeId === routeId;
      if (!vehicleType) return matchRoute;
      return matchRoute && p.vehicleType === vehicleType;
    });
  }, [prices]);

  const addPrice = useCallback((data: Omit<TicketPrice, 'id' | 'updatedAt'>) => {
    const newPrice: TicketPrice = {
      ...data,
      id: `price-${Date.now().toString(36)}`,
      updatedAt: new Date().toISOString(),
    };

    setPrices((prev) => [newPrice, ...prev]);
    showToast('Đã thêm mức giá vé mới thành công!', 'success');
  }, [showToast]);

  const updatePrice = useCallback((id: string, data: Partial<TicketPrice>) => {
    setPrices((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, ...data, updatedAt: new Date().toISOString() }
          : p
      )
    );
    showToast('Đã cập nhật giá vé thành công!', 'success');
  }, [showToast]);

  const deletePrice = useCallback((id: string) => {
    setPrices((prev) => prev.filter((p) => p.id !== id));
    showToast('Đã xóa cấu hình giá vé.', 'info');
  }, [showToast]);

  // Tự động sinh giá vé mặc định cho tất cả các cặp chặng
  const generateDefaultPrices = useCallback((routeId: string) => {
    const route = routes.find((r) => r.id === routeId);
    if (!route) return;

    const routeStops = stops
      .filter((s) => s.routeId === routeId)
      .sort((a, b) => a.orderIndex - b.orderIndex);

    if (routeStops.length < 2) {
      showToast('Tuyến này cần ít nhất 2 trạm dừng để tạo bảng giá!', 'warning');
      return;
    }

    const newPrices: TicketPrice[] = [];
    const vehicleTypes: VehicleType[] = ['seat', 'sleeper', 'limousine'];

    // Rate multiplier per km: seat ~ 600d/km, sleeper ~ 900d/km, limousine ~ 1250d/km
    const baseRates: Record<VehicleType, number> = {
      seat: 600,
      sleeper: 900,
      limousine: 1250,
    };

    for (let i = 0; i < routeStops.length - 1; i++) {
      for (let j = i + 1; j < routeStops.length; j++) {
        const from = routeStops[i];
        const to = routeStops[j];
        const deltaKm = Math.max(15, Math.abs(to.distanceFromStartKm - from.distanceFromStartKm));

        for (const vt of vehicleTypes) {
          // Check if already exists
          const existing = prices.find(
            (p) =>
              p.routeId === routeId &&
              p.fromStopId === from.id &&
              p.toStopId === to.id &&
              p.vehicleType === vt
          );

          if (!existing) {
            // Round to nearest 5.000 or 10.000 VND
            const rawPrice = deltaKm * baseRates[vt];
            const roundedPrice = Math.round(rawPrice / 10000) * 10000 || 50000;

            newPrices.push({
              id: `price-gen-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
              routeId,
              fromStopId: from.id,
              toStopId: to.id,
              fromStopName: from.name,
              toStopName: to.name,
              vehicleType: vt,
              price: roundedPrice,
              isActive: true,
              updatedAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    if (newPrices.length === 0) {
      showToast('Tất cả các chặng của tuyến này đã có đầy đủ mức giá!', 'info');
      return;
    }

    setPrices((prev) => [...newPrices, ...prev]);
    showToast(`Đã tự động khởi tạo thêm ${newPrices.length} cấu hình giá vé!`, 'success');
  }, [routes, stops, prices, showToast]);

  return (
    <RouteContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedRouteId,
        setSelectedRouteId,
        selectedVehicleType,
        setSelectedVehicleType,
        routes,
        stops,
        prices,
        statistics,
        addRoute,
        updateRoute,
        deleteRoute,
        toggleRouteStatus,
        getStopsByRoute,
        addStop,
        updateStop,
        deleteStop,
        reorderStop,
        getPricesByRoute,
        addPrice,
        updatePrice,
        deletePrice,
        generateDefaultPrices,
        toasts,
        showToast,
        removeToast,
        resetToMockData,
      }}
    >
      {children}
    </RouteContext.Provider>
  );
};

export const useRouteContext = () => {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error('useRouteContext must be used within a RouteProvider');
  }
  return context;
};
