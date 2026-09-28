import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AccessDeniedPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, role } = useAuth();

  const getRedirectPath = () => {
    switch (role) {
      case 'ADMIN':
        return '/admin/accounts';
      case 'MANAGER':
        return '/manager/routes';
      case 'DRIVER':
        return '/driver/schedule';
      case 'PASSENGER':
        return '/passenger/complaints';
      default:
        return '/';
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white dark:bg-[#131e3a] rounded-xl border border-rose-200 dark:border-rose-900/50 shadow-xl p-8 text-center space-y-5">
        <div className="inline-flex p-4 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400">
          <ShieldX className="w-12 h-12" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950 px-3 py-1 rounded-full border border-rose-200 dark:border-rose-800">
            MÃ LỖI 403 — TRUY CẬP BỊ TỪ CHỐI
          </span>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-3">
            Bạn Không Có Quyền Truy Cập
          </h2>
          <div className="h-0.5 bg-rose-500 w-16 mx-auto my-3 rounded-full" />
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
            Tài khoản hiện tại của bạn là{' '}
            <strong className="text-slate-900 dark:text-white">
              {currentUser?.fullName} ({role})
            </strong>
            . Bạn không được phân quyền để truy cập trang quản trị hoặc tính năng nghiệp vụ này.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang trước</span>
          </button>
          
          <button
            type="button"
            onClick={() => navigate(getRedirectPath())}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-institutional-700 hover:bg-institutional-800 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Về trang được phép</span>
          </button>
        </div>
      </div>
    </div>
  );
};
