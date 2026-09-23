'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bus,
  Route as RouteIcon,
  Calendar,
  CreditCard,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  Clock,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const navigation = [
    { name: 'Tổng quan điều hành', href: '/admin', icon: BarChart3, current: pathname === '/admin' },
    {
      name: 'Tuyến đường & Giá vé',
      href: '/admin/routes',
      icon: RouteIcon,
      current: pathname.startsWith('/admin/routes'),
      badge: 'Core',
    },
    { name: 'Lịch trình xuất bến', href: '#', icon: Calendar, current: false },
    { name: 'Sơ đồ ghế & Đặt vé', href: '#', icon: Bus, current: false },
    { name: 'Quản lý vé & Thanh toán', href: '#', icon: CreditCard, current: false },
    { name: 'Đội xe & Tài xế', href: '#', icon: Users, current: false },
    { name: 'Thời gian thực & GPS', href: '#', icon: Clock, current: false },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
      {/* Brand logo & name */}
      <div className="flex items-center gap-3 h-16 px-6 border-b border-slate-800/80 bg-slate-950/40">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
          <Bus className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
            TRANSIT<span className="text-brand-400">PRO</span>
          </span>
          <span className="text-[11px] block text-slate-400 font-medium">Xe Khách Liên Tỉnh</span>
        </div>
      </div>

      {/* Main navigation */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Quản trị nghiệp vụ
        </div>
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                item.current
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    item.current ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.current ? 'bg-brand-700/80 text-white' : 'bg-slate-800 text-brand-400 border border-brand-500/20'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* System Footer info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/20 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-slate-400" /> Cấu hình hệ thống
          </span>
          <span className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer">
            <HelpCircle className="w-3.5 h-3.5 inline" />
          </span>
        </div>
        <div className="text-[11px] text-slate-400 pt-1">
          Phiên bản core v1.2.4 (Enterprise)
        </div>
      </div>
    </aside>
  );
};
