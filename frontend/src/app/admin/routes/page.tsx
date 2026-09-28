'use client';

import React from 'react';
import { useRouteContext, TabType } from '@/context/RouteContext';
import { RouteTab } from '@/components/routes/RouteTab';
import { StopTab } from '@/components/routes/StopTab';
import { PricingTab } from '@/components/routes/PricingTab';
import { Route as RouteIcon, MapPin, DollarSign, Sparkles } from 'lucide-react';

export default function AdminRoutesPage() {
  const { activeTab, setActiveTab, routes, stops, prices } = useRouteContext();

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ className?: string }>; count: number }[] = [
    {
      id: 'routes',
      label: 'Quản lý Tuyến đường',
      icon: RouteIcon,
      count: routes.length,
    },
    {
      id: 'stops',
      label: 'Quản lý Trạm dừng theo tuyến',
      icon: MapPin,
      count: stops.length,
    },
    {
      id: 'pricing',
      label: 'Thiết lập & Cập nhật Giá vé',
      icon: DollarSign,
      count: prices.length,
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>Quản lý Tuyến đường, Trạm dừng & Giá vé</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-700 border border-brand-200">
              <Sparkles className="w-3 h-3" /> Core System
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Điều hành cấu hình mạng lưới giao thông liên tỉnh, sắp xếp thứ tự trạm đón trả và thiết lập ma trận giá vé theo chặng.
          </p>
        </div>
      </div>

      {/* Modern 3-Tab Bar */}
      <div className="border-b border-slate-200/90">
        <nav className="flex space-x-2 sm:space-x-4" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group inline-flex items-center gap-2 py-3 px-3 sm:px-5 font-semibold text-sm border-b-2 transition-all relative ${
                  isActive
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span>{tab.label}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${
                    isActive
                      ? 'bg-brand-100 text-brand-700'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Panels */}
      <div className="transition-all">
        {activeTab === 'routes' && <RouteTab />}
        {activeTab === 'stops' && <StopTab />}
        {activeTab === 'pricing' && <PricingTab />}
      </div>
    </div>
  );
}
