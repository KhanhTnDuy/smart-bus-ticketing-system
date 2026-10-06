import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  ShieldCheck,
  FileText,
  MapPin,
  Compass,
  CreditCard,
  MessageSquareWarning,
  Star,
  Calendar,
  Bus,
  ChevronDown,
  Menu,
  X,
  Layers,
  Ticket,
  QrCode,
  Radio,
  AlertTriangle,
  Receipt,
  UserCheck,
  RotateCcw,
  Search,
  LifeBuoy,
  TrendingUp,
  FileCheck2,
  TicketPercent,
  BarChart3,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const { currentUser, role } = useAuth();
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile menu and dropdowns on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location.pathname]);

  const toggleDropdown = (name: string) => {
    setActiveDropdown((prev) => (prev === name ? null : name));
  };

  // Active state checkers for dropdowns
  const isManagerInfraActive =
    location.pathname.startsWith('/manager/routes') ||
    location.pathname.startsWith('/manager/stops') ||
    location.pathname.startsWith('/manager/fares');

  const isManagerScheduleActive =
    location.pathname.startsWith('/manager/buses') ||
    location.pathname.startsWith('/manager/schedules') ||
    location.pathname.startsWith('/manager/assignments');


  const isManagerOpsActive =
    location.pathname.startsWith('/manager/refunds') ||
    location.pathname.startsWith('/manager/incidents') ||
    location.pathname.startsWith('/manager/complaints') ||
    location.pathname.startsWith('/manager/verifications') ||
    location.pathname.startsWith('/manager/vouchers');

  const isManagerReportActive =
    location.pathname.startsWith('/manager/revenue') ||
    location.pathname.startsWith('/manager/occupancy');

  const isPassengerPaymentActive =
    location.pathname.startsWith('/passenger/payments') ||
    location.pathname.startsWith('/passenger/invoices');

  const isPassengerSupportActive =
    location.pathname.startsWith('/passenger/complaints') ||
    location.pathname.startsWith('/passenger/rating') ||
    location.pathname === '/incident/report';

  return (
    <nav
      ref={navRef}
      className="bg-[#0c356a] dark:bg-[#071939] text-white border-b-2 border-amber-500 shadow-md sticky top-0 z-30 transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          
          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-1.5 flex-wrap">
            
            {/* Common: Trang chủ */}
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'bg-institutional-800 text-amber-300 shadow-inner'
                    : 'text-slate-100 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Home className="w-3.5 h-3.5" />
              <span>Trang chủ</span>
            </NavLink>

            {/* ============================================================== */}
            {/* ADMIN ROUTES */}
            {/* ============================================================== */}
            {role === 'ADMIN' && (
              <>
                <NavLink
                  to="/admin/accounts"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Tài khoản</span>
                </NavLink>

                <NavLink
                  to="/admin/roles"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Phân quyền</span>
                </NavLink>

                <NavLink
                  to="/admin/audit-logs"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Nhật ký</span>
                </NavLink>

                {/* Admin Ops Quick Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleDropdown('adminOps')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      activeDropdown === 'adminOps' || location.pathname.startsWith('/manager/') || location.pathname === '/tracking'
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Điều hành & Giám sát</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${
                        activeDropdown === 'adminOps' ? 'rotate-180 text-amber-300' : ''
                      }`}
                    />
                  </button>

                  {activeDropdown === 'adminOps' && (
                    <div className="absolute left-0 mt-1 w-56 bg-[#09254d] dark:bg-[#061530] text-white rounded-md shadow-2xl border border-blue-900/60 py-1.5 z-50 animate-fadeIn">
                      <NavLink
                        to="/tracking"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-blue-800/50 hover:text-white"
                      >
                        <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                        <span>Theo dõi xe GPS</span>
                      </NavLink>
                      <NavLink
                        to="/manager/refunds"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-blue-800/50 hover:text-white"
                      >
                        <RotateCcw className="w-4 h-4 text-amber-400" />
                        <span>Xử lý hoàn tiền</span>
                      </NavLink>
                      <NavLink
                        to="/manager/incidents"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-blue-800/50 hover:text-white"
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Quản lý sự cố xe</span>
                      </NavLink>
                      <NavLink
                        to="/manager/buses"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-blue-800/50 hover:text-white"
                      >
                        <Bus className="w-4 h-4 text-emerald-400" />
                        <span>Quản lý xe buýt</span>
                      </NavLink>
                      <NavLink
                        to="/manager/schedules"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-blue-800/50 hover:text-white"
                      >
                        <Calendar className="w-4 h-4 text-sky-400" />
                        <span>Lịch trình chuyến xe</span>
                      </NavLink>
                      <NavLink
                        to="/manager/revenue"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-blue-800/50 hover:text-white"
                      >
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                        <span>Báo cáo doanh thu vé</span>
                      </NavLink>
                      <NavLink
                        to="/manager/occupancy"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-blue-800/50 hover:text-white"
                      >
                        <BarChart3 className="w-4 h-4 text-sky-400" />
                        <span>Tỷ lệ lấp đầy & Quy mô xe</span>
                      </NavLink>
                      <NavLink
                        to="/manager/verifications"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-blue-800/50 hover:text-white"
                      >
                        <FileCheck2 className="w-4 h-4 text-emerald-400" />
                        <span>Duyệt hồ sơ ưu đãi</span>
                      </NavLink>
                      <NavLink
                        to="/manager/vouchers"
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-blue-800/50 hover:text-white"
                      >
                        <TicketPercent className="w-4 h-4 text-purple-400" />
                        <span>Mã giảm giá (Vouchers)</span>
                      </NavLink>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ============================================================== */}
            {/* MANAGER ROUTES */}
            {/* ============================================================== */}
            {role === 'MANAGER' && (
              <>
                {/* 1. Hạ tầng & Tuyến xe Dropdown (Sprint 1) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleDropdown('mgrInfra')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isManagerInfraActive || activeDropdown === 'mgrInfra'
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Hạ tầng & Tuyến</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${
                        activeDropdown === 'mgrInfra' ? 'rotate-180 text-amber-300' : ''
                      }`}
                    />
                  </button>

                  {activeDropdown === 'mgrInfra' && (
                    <div className="absolute left-0 mt-1 w-52 bg-[#09254d] dark:bg-[#061530] text-white rounded-md shadow-2xl border border-blue-900/60 py-1.5 z-50 animate-fadeIn">
                      <NavLink
                        to="/manager/routes"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <Compass className="w-4 h-4 text-sky-400" />
                        <span>Tuyến đường</span>
                      </NavLink>

                      <NavLink
                        to="/manager/stops"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <MapPin className="w-4 h-4 text-amber-400" />
                        <span>Trạm dừng</span>
                      </NavLink>

                      <NavLink
                        to="/manager/fares"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <CreditCard className="w-4 h-4 text-emerald-400" />
                        <span>Giá vé</span>
                      </NavLink>
                    </div>
                  )}
                </div>

                {/* 2. Lịch xe & Phân công Dropdown (Sprint 2) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleDropdown('mgrSchedule')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isManagerScheduleActive || activeDropdown === 'mgrSchedule'
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Lịch & Phân công</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${
                        activeDropdown === 'mgrSchedule' ? 'rotate-180 text-amber-300' : ''
                      }`}
                    />
                  </button>

                  {activeDropdown === 'mgrSchedule' && (
                    <div className="absolute left-0 mt-1 w-56 bg-[#09254d] dark:bg-[#061530] text-white rounded-md shadow-2xl border border-blue-900/60 py-1.5 z-50 animate-fadeIn">
                      <NavLink
                        to="/manager/buses"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <Bus className="w-4 h-4 text-emerald-400" />
                        <span>Quản lý xe buýt</span>
                      </NavLink>
                      <NavLink
                        to="/manager/schedules"
                        onClick={() => setActiveDropdown(null)}

                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <Calendar className="w-4 h-4 text-sky-400" />
                        <span>Lịch chuyến xe</span>
                      </NavLink>

                      <NavLink
                        to="/manager/assignments"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <UserCheck className="w-4 h-4 text-amber-400" />
                        <span>Phân công tài xế / phụ xe</span>
                      </NavLink>
                    </div>
                  )}
                </div>

                {/* 3. Nghiệp vụ & Hỗ trợ Dropdown (Sprint 1 & Sprint 2) */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleDropdown('mgrOps')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isManagerOpsActive || activeDropdown === 'mgrOps'
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Nghiệp vụ & Hỗ trợ</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${
                        activeDropdown === 'mgrOps' ? 'rotate-180 text-amber-300' : ''
                      }`}
                    />
                  </button>

                  {activeDropdown === 'mgrOps' && (
                    <div className="absolute left-0 mt-1 w-56 bg-[#09254d] dark:bg-[#061530] text-white rounded-md shadow-2xl border border-blue-900/60 py-1.5 z-50 animate-fadeIn">
                      <NavLink
                        to="/manager/refunds"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <RotateCcw className="w-4 h-4 text-amber-400" />
                        <span>Xử lý hoàn tiền vé</span>
                      </NavLink>

                      <NavLink
                        to="/manager/incidents"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Quản lý sự cố xe</span>
                      </NavLink>

                      <NavLink
                        to="/manager/complaints"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <MessageSquareWarning className="w-4 h-4 text-amber-400" />
                        <span>Khiếu nại & đánh giá</span>
                      </NavLink>

                      <NavLink
                        to="/manager/verifications"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <FileCheck2 className="w-4 h-4 text-emerald-400" />
                        <span>Duyệt hồ sơ ưu đãi</span>
                      </NavLink>

                      <NavLink
                        to="/manager/vouchers"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <TicketPercent className="w-4 h-4 text-purple-400" />
                        <span>Mã giảm giá (Vouchers)</span>
                      </NavLink>
                    </div>
                  )}
                </div>

                {/* 4. Theo dõi GPS trực tuyến */}
                <NavLink
                  to="/tracking"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Theo dõi GPS</span>
                </NavLink>

                {/* 5. Báo cáo & Thống kê Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleDropdown('mgrReport')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isManagerReportActive || activeDropdown === 'mgrReport'
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Báo cáo & Thống kê</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${
                        activeDropdown === 'mgrReport' ? 'rotate-180 text-amber-300' : ''
                      }`}
                    />
                  </button>

                  {activeDropdown === 'mgrReport' && (
                    <div className="absolute left-0 mt-1 w-56 bg-[#09254d] dark:bg-[#061530] text-white rounded-md shadow-2xl border border-blue-900/60 py-1.5 z-50 animate-fadeIn">
                      <NavLink
                        to="/manager/revenue"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <TrendingUp className="w-4 h-4 text-amber-400" />
                        <span>Báo cáo doanh thu vé</span>
                      </NavLink>
                      <NavLink
                        to="/manager/occupancy"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <BarChart3 className="w-4 h-4 text-sky-400" />
                        <span>Tỷ lệ lấp đầy & Quy mô xe</span>
                      </NavLink>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ============================================================== */}
            {/* DRIVER ROUTES */}
            {/* ============================================================== */}
            {role === 'DRIVER' && (
              <>
                <NavLink
                  to="/driver/schedule"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Lịch trình</span>
                </NavLink>

                <NavLink
                  to="/driver/qr-scanner"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <QrCode className="w-3.5 h-3.5 text-amber-300" />
                  <span>Quét QR vé</span>
                </NavLink>

                <NavLink
                  to="/tracking"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Theo dõi GPS</span>
                </NavLink>

                <NavLink
                  to="/incident/report"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Báo sự cố</span>
                </NavLink>
              </>
            )}

            {/* ============================================================== */}
            {/* PASSENGER ROUTES */}
            {/* ============================================================== */}
            {role === 'PASSENGER' && (
              <>
                {/* 1. Tìm & Đặt vé */}
                <NavLink
                  to="/passenger/booking"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Search className="w-3.5 h-3.5 text-sky-300" />
                  <span>Tìm & Đặt vé</span>
                </NavLink>

                {/* 2. Vé điện tử */}
                <NavLink
                  to="/passenger/tickets"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Ticket className="w-3.5 h-3.5 text-amber-300" />
                  <span>Vé điện tử</span>
                </NavLink>

                {/* 3. Thanh toán & Hóa đơn Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleDropdown('passengerFin')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isPassengerPaymentActive || activeDropdown === 'passengerFin'
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                    <span>Thanh toán & Hóa đơn</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${
                        activeDropdown === 'passengerFin' ? 'rotate-180 text-amber-300' : ''
                      }`}
                    />
                  </button>

                  {activeDropdown === 'passengerFin' && (
                    <div className="absolute left-0 mt-1 w-52 bg-[#09254d] dark:bg-[#061530] text-white rounded-md shadow-2xl border border-blue-900/60 py-1.5 z-50 animate-fadeIn">
                      <NavLink
                        to="/passenger/payments"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <CreditCard className="w-4 h-4 text-emerald-400" />
                        <span>Lịch sử thanh toán</span>
                      </NavLink>

                      <NavLink
                        to="/passenger/invoices"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <Receipt className="w-4 h-4 text-sky-400" />
                        <span>Hóa đơn VAT điện tử</span>
                      </NavLink>
                    </div>
                  )}
                </div>

                {/* 4. Theo dõi GPS */}
                <NavLink
                  to="/tracking"
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isActive
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Theo dõi GPS</span>
                </NavLink>

                {/* 5. Hỗ trợ & Đóng góp Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleDropdown('passengerSupport')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isPassengerSupportActive || activeDropdown === 'passengerSupport'
                        ? 'bg-institutional-800 text-amber-300 shadow-inner'
                        : 'text-slate-100 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <LifeBuoy className="w-3.5 h-3.5" />
                    <span>Hỗ trợ & Đóng góp</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${
                        activeDropdown === 'passengerSupport' ? 'rotate-180 text-amber-300' : ''
                      }`}
                    />
                  </button>

                  {activeDropdown === 'passengerSupport' && (
                    <div className="absolute right-0 mt-1 w-52 bg-[#09254d] dark:bg-[#061530] text-white rounded-md shadow-2xl border border-blue-900/60 py-1.5 z-50 animate-fadeIn">
                      <NavLink
                        to="/incident/report"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                        <span>Báo cáo sự cố xe</span>
                      </NavLink>

                      <NavLink
                        to="/passenger/complaints"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <MessageSquareWarning className="w-4 h-4 text-amber-400" />
                        <span>Gửi khiếu nại</span>
                      </NavLink>

                      <NavLink
                        to="/passenger/rating"
                        onClick={() => setActiveDropdown(null)}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 px-4 py-2 text-xs font-medium transition-colors ${
                            isActive
                              ? 'bg-blue-800/80 text-amber-300 font-semibold'
                              : 'text-slate-200 hover:bg-blue-800/50 hover:text-white'
                          }`
                        }
                      >
                        <Star className="w-4 h-4 text-amber-300" />
                        <span>Đánh giá chuyến đi</span>
                      </NavLink>
                    </div>
                  )}
                </div>
              </>
            )}

          </div>

          {/* Right badge: Current Role Indicator */}
          <div className="hidden md:flex items-center gap-2 text-xs shrink-0">
            <span className="text-blue-200">Đang hoạt động với quyền:</span>
            <span className="bg-amber-400 text-institutional-950 font-bold px-2 py-0.5 rounded shadow-sm">
              {role === 'ADMIN'
                ? 'QUẢN TRỊ VIÊN'
                : role === 'MANAGER'
                ? 'ĐIỀU HÀNH TUYẾN'
                : role === 'DRIVER'
                ? 'TÀI XẾ VẬN HÀNH'
                : 'HÀNH KHÁCH'}
            </span>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center justify-between w-full py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              {role === 'ADMIN'
                ? 'QUẢN TRỊ VIÊN'
                : role === 'MANAGER'
                ? 'QUẢN LÝ TUYẾN'
                : role === 'DRIVER'
                ? 'TÀI XẾ'
                : 'HÀNH KHÁCH'}
            </span>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-md text-white hover:bg-white/10 focus:outline-none"
              aria-label="Mở danh mục điều hướng"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* Mobile Drawer Menu */}
      {/* ============================================================== */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#09254d] border-t border-blue-900/80 px-4 pt-2 pb-5 space-y-1.5 max-h-[85vh] overflow-y-auto">
          <NavLink
            to="/"
            className="flex items-center gap-3 px-3 py-2 rounded text-xs font-semibold uppercase text-slate-100 hover:bg-blue-800"
          >
            <Home className="w-4 h-4 text-sky-400" />
            <span>Trang chủ</span>
          </NavLink>

          {/* Mobile ADMIN */}
          {role === 'ADMIN' && (
            <>
              <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Quản trị hệ thống
              </div>
              <NavLink
                to="/admin/accounts"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <Users className="w-4 h-4 text-blue-400" />
                <span>Quản lý tài khoản</span>
              </NavLink>
              <NavLink
                to="/admin/roles"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                <span>Phân quyền</span>
              </NavLink>
              <NavLink
                to="/admin/audit-logs"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Nhật ký hệ thống</span>
              </NavLink>

              <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Vận hành & Giám sát
              </div>
              <NavLink
                to="/tracking"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Theo dõi xe GPS</span>
              </NavLink>
              <NavLink
                to="/manager/refunds"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Xử lý hoàn tiền</span>
              </NavLink>
              <NavLink
                to="/manager/incidents"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Quản lý sự cố xe</span>
              </NavLink>
              <NavLink
                to="/manager/revenue"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>Báo cáo doanh thu vé</span>
              </NavLink>
              <NavLink
                to="/manager/occupancy"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <BarChart3 className="w-4 h-4 text-sky-400" />
                <span>Tỷ lệ lấp đầy & Quy mô xe</span>
              </NavLink>
              <NavLink
                to="/manager/verifications"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <span>Duyệt hồ sơ ưu đãi</span>
              </NavLink>
              <NavLink
                to="/manager/vouchers"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <TicketPercent className="w-4 h-4 text-purple-400" />
                <span>Mã giảm giá (Vouchers)</span>
              </NavLink>
            </>
          )}

          {/* Mobile MANAGER */}
          {role === 'MANAGER' && (
            <>
              <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Hạ tầng & Tuyến
              </div>
              <NavLink
                to="/manager/routes"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <Compass className="w-4 h-4 text-sky-400" />
                <span>Tuyến đường</span>
              </NavLink>
              <NavLink
                to="/manager/stops"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Trạm dừng</span>
              </NavLink>
              <NavLink
                to="/manager/fares"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Giá vé</span>
              </NavLink>

              <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Lịch & Phân công
              </div>
              <NavLink
                to="/manager/buses"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <Bus className="w-4 h-4 text-emerald-400" />
                <span>Quản lý xe buýt</span>
              </NavLink>
              <NavLink
                to="/manager/schedules"

                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>Lịch chuyến xe buýt</span>
              </NavLink>
              <NavLink
                to="/manager/assignments"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span>Phân công tài xế / phụ xe</span>
              </NavLink>

              <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Nghiệp vụ & Báo cáo tài chính
              </div>
              <NavLink
                to="/manager/revenue"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-amber-300 bg-blue-800/60 font-semibold"
              >
                <TrendingUp className="w-4 h-4 text-amber-400" />
                <span>Báo cáo doanh thu bán vé</span>
              </NavLink>
              <NavLink
                to="/manager/occupancy"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <BarChart3 className="w-4 h-4 text-sky-400" />
                <span>Tỷ lệ lấp đầy & Quy mô xe</span>
              </NavLink>
              <NavLink
                to="/manager/verifications"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <span>Duyệt hồ sơ ưu đãi</span>
              </NavLink>
              <NavLink
                to="/manager/vouchers"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <TicketPercent className="w-4 h-4 text-purple-400" />
                <span>Mã giảm giá (Vouchers)</span>
              </NavLink>
              <NavLink
                to="/manager/refunds"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Xử lý hoàn tiền vé</span>
              </NavLink>
              <NavLink
                to="/manager/incidents"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Quản lý sự cố xe</span>
              </NavLink>
              <NavLink
                to="/manager/complaints"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <MessageSquareWarning className="w-4 h-4 text-amber-400" />
                <span>Khiếu nại & đánh giá</span>
              </NavLink>
              <NavLink
                to="/tracking"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Theo dõi GPS trực tuyến</span>
              </NavLink>
            </>
          )}

          {/* Mobile DRIVER */}
          {role === 'DRIVER' && (
            <>
              <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Nhiệm vụ vận hành
              </div>
              <NavLink
                to="/driver/schedule"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-semibold uppercase text-slate-100 hover:bg-blue-800"
              >
                <Calendar className="w-4 h-4 text-sky-400" />
                <span>Lịch trình & Lộ trình trạm</span>
              </NavLink>
              <NavLink
                to="/driver/qr-scanner"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-semibold uppercase text-slate-100 hover:bg-blue-800"
              >
                <QrCode className="w-4 h-4 text-amber-400" />
                <span>Quét mã QR vé xe</span>
              </NavLink>
              <NavLink
                to="/tracking"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-semibold uppercase text-slate-100 hover:bg-blue-800"
              >
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Theo dõi GPS xe</span>
              </NavLink>
              <NavLink
                to="/incident/report"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-semibold uppercase text-slate-100 hover:bg-blue-800"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Báo cáo sự cố khẩn cấp</span>
              </NavLink>
            </>
          )}

          {/* Mobile PASSENGER */}
          {role === 'PASSENGER' && (
            <>
              <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Dịch vụ vé xe buýt
              </div>
              <NavLink
                to="/passenger/booking"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <Search className="w-4 h-4 text-sky-400" />
                <span>Tìm & Đặt vé xe buýt</span>
              </NavLink>
              <NavLink
                to="/passenger/tickets"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <Ticket className="w-4 h-4 text-amber-400" />
                <span>Vé xe điện tử của tôi</span>
              </NavLink>
              <NavLink
                to="/tracking"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>Theo dõi xe buýt GPS</span>
              </NavLink>

              <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Thanh toán & Hóa đơn
              </div>
              <NavLink
                to="/passenger/payments"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Lịch sử thanh toán</span>
              </NavLink>
              <NavLink
                to="/passenger/invoices"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <Receipt className="w-4 h-4 text-sky-400" />
                <span>Hóa đơn điện tử VAT</span>
              </NavLink>

              <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                Hỗ trợ & Đóng góp
              </div>
              <NavLink
                to="/incident/report"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Báo cáo sự cố xe buýt</span>
              </NavLink>
              <NavLink
                to="/passenger/complaints"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <MessageSquareWarning className="w-4 h-4 text-amber-400" />
                <span>Gửi khiếu nại dịch vụ</span>
              </NavLink>
              <NavLink
                to="/passenger/rating"
                className="flex items-center gap-3 px-4 py-2 rounded text-xs font-medium text-slate-200 hover:bg-blue-800"
              >
                <Star className="w-4 h-4 text-amber-300" />
                <span>Đánh giá chất lượng</span>
              </NavLink>
            </>
          )}
        </div>
      )}
    </nav>
  );
};
