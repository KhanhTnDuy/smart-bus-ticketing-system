'use client';

import React from 'react';
import { useRouteContext } from '@/context/RouteContext';
import { RotateCcw, Bell, ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  const { resetToMockData, statistics } = useRouteContext();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className="font-medium text-slate-700">Hệ thống Điều hành Xe khách</span>
          <span className="text-slate-300">/</span>
          <span>Vận hành & Kế hoạch</span>
          <span className="text-slate-300">/</span>
          <span className="font-semibold text-brand-600">Tuyến đường & Giá vé</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Reset Mock Data Action */}
        <button
          onClick={resetToMockData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-800 rounded-lg border border-slate-200 transition-colors"
          title="Khôi phục 4 tuyến xe thực tế và dữ liệu mẫu ban đầu"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Khôi phục mẫu</span>
        </button>

        {/* System Active Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Hệ thống trực tuyến ({statistics.activeRoutes} tuyến chạy)</span>
        </div>

        {/* Notifications */}
        <button
          className="relative p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          title="Thông báo hệ thống"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full"></span>
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-500 text-white font-semibold flex items-center justify-center text-xs shadow-sm">
            AD
          </div>
          <div className="hidden md:block text-left leading-none">
            <p className="text-xs font-semibold text-slate-800">Admin Điều Hành</p>
            <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Quản trị viên
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
