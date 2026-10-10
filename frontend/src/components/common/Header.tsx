import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bus,
  Sun,
  Moon,

  LogOut,
  UserCheck,
  ShieldAlert,
  ChevronDown,
  Building2,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Badge } from './Badge';
import { NotificationBell } from './NotificationBell';
import { Role } from '../../types';

export const Header: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);


  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
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
            
            {/* Đã bỏ chức năng "Chuyển vai trò nhanh": nó mạo danh tài khoản khác từ dữ liệu
                giả. Sau khi đăng nhập bằng JWT thật, vai trò lấy từ claim trong token nên
                muốn đổi vai trò thì đăng xuất và đăng nhập bằng tài khoản tương ứng. */}

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

            <NotificationBell />

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
