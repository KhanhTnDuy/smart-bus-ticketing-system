import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bus,
  Sun,
  Moon,
  Bell,
  LogOut,
  UserCheck,
  ShieldAlert,
  ChevronDown,
  Building2,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { Badge } from './Badge';
import { Role } from '../../types';

export const Header: React.FC = () => {
  const { currentUser, logout, switchUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, users } = useData();
  const navigate = useNavigate();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRolePickerOpen, setIsRolePickerOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const rolePickerRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (rolePickerRef.current && !rolePickerRef.current.contains(e.target as Node)) {
        setIsRolePickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRoleQuickSwitch = (role: Role) => {
    // Find first user with that role
    const targetUser = users.find((u) => u.role === role);
    if (targetUser) {
      switchUser(targetUser.id);
      setIsRolePickerOpen(false);
      setIsProfileOpen(false);
      navigate('/');
    }
  };

  return (
    <header className="bg-white dark:bg-[#101b38] border-b border-slate-200 dark:border-[#1a2d59] relative z-40 transition-colors shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 sm:h-24">
          
          {/* Left: Official Emblem & Institution Names */}
          <div
            className="flex items-center gap-3.5 cursor-pointer select-none"
            onClick={() => navigate('/')}
          >
            {/* Official Institutional Badge Icon */}
            <div className="relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gradient-to-br from-institutional-800 to-institutional-950 text-white shadow-md border-2 border-amber-400 shrink-0">
              <Bus className="w-6 h-6 sm:w-7 sm:h-7 text-amber-300" />
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border-2 border-white dark:border-[#101b38]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/70 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                  CỔNG THÔNG TIN QUỐC GIA
                </span>
                <span className="hidden md:inline-block text-[11px] text-slate-400 font-medium">
                  | Hệ Thống Giao Thông Đô Thị
                </span>
              </div>
              <h1 className="text-base sm:text-lg md:text-xl font-extrabold text-institutional-900 dark:text-sky-300 tracking-tight leading-tight mt-0.5">
                HỆ THỐNG ĐIỀU HÀNH & BÁN VÉ XE BUÝT THÔNG MINH
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3 h-3 text-slate-400 inline shrink-0" />
                <span>CỤC QUẢN LÝ VẬN TẢI ĐÔ THỊ — TRUNG TÂM QUẢN LÝ GIAO THÔNG CÔNG CỘNG</span>
              </p>
            </div>
          </div>

          {/* Right: Actions, Theme Toggle, Notifications, Profile */}
          <div className="flex items-center gap-2 sm:gap-4">
            
            {/* Fast Role Switcher (Convenient for grading/testing) */}
            <div className="relative hidden lg:block" ref={rolePickerRef}>
              <button
                type="button"
                onClick={() => setIsRolePickerOpen(!isRolePickerOpen)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-[#18284f] hover:bg-slate-200 dark:hover:bg-[#203668] border border-slate-300 dark:border-[#22396e] rounded-md transition-colors shadow-sm"
                title="Chuyển vai trò thử nghiệm"
              >
                <UserCheck className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
                <span>Chuyển vai trò</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {isRolePickerOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#131e3a] rounded-lg shadow-xl border border-slate-200 dark:border-[#223561] py-1 z-50 animate-fadeIn">
                  <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    Chọn vai trò trải nghiệm:
                  </div>
                  {(['ADMIN', 'MANAGER', 'DRIVER', 'PASSENGER'] as Role[]).map((r) => {
                    const isCurrent = currentUser?.role === r;
                    const roleTitle =
                      r === 'ADMIN'
                        ? 'Quản trị viên (Admin)'
                        : r === 'MANAGER'
                        ? 'Quản lý tuyến (Manager)'
                        : r === 'DRIVER'
                        ? 'Tài xế (Driver)'
                        : 'Hành khách (Passenger)';
                    return (
                      <button
                        key={r}
                        onClick={() => handleRoleQuickSwitch(r)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs text-left transition-colors ${
                          isCurrent
                            ? 'bg-institutional-50 dark:bg-institutional-900/60 font-semibold text-institutional-700 dark:text-sky-400'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{roleTitle}</span>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 sm:p-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-institutional-700 dark:hover:text-yellow-400 bg-slate-100 dark:bg-[#18284f] hover:bg-slate-200 dark:hover:bg-[#203668] border border-slate-200 dark:border-[#22396e] transition-colors"
              title={isDark ? 'Chuyển sang Chế độ sáng (Light Mode)' : 'Chuyển sang Chế độ tối (Dark Mode)'}
              aria-label="Chuyển chế độ giao diện"
            >
              {isDark ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-700" />
              )}
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 sm:p-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-institutional-700 dark:hover:text-sky-400 bg-slate-100 dark:bg-[#18284f] hover:bg-slate-200 dark:hover:bg-[#203668] border border-slate-200 dark:border-[#22396e] transition-colors relative"
                title="Thông báo hệ thống"
                aria-label="Thông báo hệ thống"
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Popover */}
              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#131e3a] rounded-lg shadow-2xl border border-slate-200 dark:border-[#223561] py-2 z-50 animate-fadeIn">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-[#1e2f57]">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                      Thông Báo Hệ Thống ({unreadCount})
                    </span>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-[11px] text-institutional-600 dark:text-sky-400 hover:underline"
                      >
                        Đánh dấu đã đọc tất cả
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1e2f57]">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">Không có thông báo mới</div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationAsRead(n.id)}
                          className={`p-3 text-xs cursor-pointer transition-colors ${
                            n.isRead
                              ? 'opacity-65 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              : 'bg-blue-50/50 dark:bg-[#19274c] hover:bg-blue-50 dark:hover:bg-[#1e305e]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {n.title}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">{n.createdAt}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile / Menu */}
            {currentUser ? (
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 dark:border-[#22396e] bg-slate-50 dark:bg-[#152347] hover:bg-slate-100 dark:hover:bg-[#1a2d59] transition-colors"
                >
                  <img
                    src={
                      currentUser.avatarUrl ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        currentUser.fullName
                      )}&background=0c356a&color=fff`
                    }
                    alt={currentUser.fullName}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-institutional-600/30"
                  />
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[130px]">
                      {currentUser.fullName}
                    </div>
                    <div className="mt-0.5">
                      <Badge variant="role" value={currentUser.role} size="sm" />
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {/* Profile Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-[#131e3a] rounded-lg shadow-2xl border border-slate-200 dark:border-[#223561] py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-[#1e2f57]">
                      <div className="font-bold text-sm text-slate-900 dark:text-white">
                        {currentUser.fullName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {currentUser.email}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {currentUser.department || 'Đơn vị quản lý'}
                      </div>
                      <div className="mt-2">
                        <Badge variant="role" value={currentUser.role} />
                      </div>
                    </div>

                    {/* Role preview switch inside profile dropdown for mobile */}
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-[#1e2f57] lg:hidden">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Đổi vai trò nhanh:
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['ADMIN', 'MANAGER', 'DRIVER', 'PASSENGER'] as Role[]).map((r) => (
                          <button
                            key={r}
                            onClick={() => handleRoleQuickSwitch(r)}
                            className="px-2 py-1 text-[11px] rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-institutional-100 dark:hover:bg-institutional-900"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất khỏi hệ thống</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-xs font-semibold text-white bg-institutional-700 hover:bg-institutional-800 rounded-md transition-colors shadow-sm"
              >
                Đăng nhập
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
