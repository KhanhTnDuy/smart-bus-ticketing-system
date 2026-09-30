import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Bus,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Building2,
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';

export const LoginPage: React.FC = () => {
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const { addAuditLog } = useData();
  const { success, error } = useToast();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!identity.trim()) {
      setErrorMessage('Vui lòng nhập Email hoặc Tên đăng nhập.');
      return;
    }

    if (!password) {
      setErrorMessage('Vui lòng nhập Mật khẩu truy cập.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await login(identity, password);
      if (res.success) {
        success('Đăng nhập hệ thống điều hành thành công!');
        addAuditLog({
          user: identity,
          action: 'Đăng nhập hệ thống',
          module: 'AUTH',
          description: `Đăng nhập thành công vào tài khoản [${identity}]`,
          status: 'SUCCESS',
        });
        navigate(from, { replace: true });
      } else {
        setErrorMessage(res.message || 'Đăng nhập không thành công.');
        error(res.message || 'Đăng nhập thất bại.');
        addAuditLog({
          user: identity || 'Khách vãng lai',
          action: 'Thử đăng nhập thất bại',
          module: 'AUTH',
          description: `Cố gắng đăng nhập không thành công với thông tin [${identity}]`,
          status: 'WARNING',
        });
      }
    } catch {
      setErrorMessage('Có lỗi xảy ra trong quá trình xác thực.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] dark:bg-[#0b1329] flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors relative">
      
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2.5 rounded-lg bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-yellow-400 hover:bg-slate-100 dark:hover:bg-[#1a2b53] transition-colors shadow-sm"
          title="Chuyển chế độ sáng/tối"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        {/* Institutional emblem */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-institutional-800 to-institutional-950 text-white shadow-xl border-2 border-amber-400 mb-3">
          <Bus className="w-9 h-9 text-amber-300" />
        </div>

        <span className="inline-block text-[11px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800 mb-2">
          CỔNG THÔNG TIN QUỐC GIA
        </span>
        <h2 className="text-xl sm:text-2xl font-black text-institutional-900 dark:text-white tracking-tight uppercase">
          Hệ Thống Bán Vé Xe Buýt Thông Minh
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5 mt-1">
          <Building2 className="w-3.5 h-3.5 inline" />
          <span>Cục Quản Lý Giao Thông Vận Tải Đô Thị</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white dark:bg-[#131e3a] py-8 px-6 sm:px-10 shadow-xl rounded-xl border border-slate-200 dark:border-[#1e2f57]">
          
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Xác thực quyền truy cập
            </h3>
            <div className="h-0.5 bg-amber-500 w-16 mt-1.5 rounded-full" />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Đăng nhập tài khoản để vào hệ thống điều hành và dịch vụ vận tải.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Identity Field */}
            <div>
              <label
                htmlFor="identity"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
              >
                Email hoặc Tên đăng nhập <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="identity"
                  type="text"
                  value={identity}
                  onChange={(e) => setIdentity(e.target.value)}
                  placeholder="Ví dụ: admin@bus.com hoặc admin"
                  className="block w-full pl-9 pr-3 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-institutional-500 dark:focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1"
              >
                Mật khẩu truy cập <span className="text-rose-500">*</span>
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  className="block w-full pl-9 pr-10 py-2 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-institutional-500 dark:focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-md text-xs font-bold uppercase tracking-wider text-white bg-institutional-700 hover:bg-institutional-800 dark:bg-institutional-800 dark:hover:bg-institutional-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-institutional-500 transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Đăng nhập hệ thống</span>
                  </>
                )}
              </button>
            </div>
          </form>


          {/* Trước đây chỗ này là các nút điền nhanh tài khoản giả (admin123, manager123...).
              Đăng nhập giờ gọi POST /api/auth/login nên tài khoản phải tồn tại thật trong
              cơ sở dữ liệu với mật khẩu đã băm bằng PasswordService. */}
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-[#1e2f57]">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              <ShieldCheck className="w-4 h-4 text-institutional-600 dark:text-sky-400" />
              <span>Tài khoản kiểm thử:</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Hệ thống xác thực với máy chủ thật, không còn tài khoản mẫu sẵn trong giao diện.
              Hãy tạo tài khoản Admin đầu tiên trực tiếp trong cơ sở dữ liệu (mật khẩu băm bằng
              <span className="font-mono"> PasswordService.Hash</span>), sau đó dùng chính tài khoản
              đó để tạo các tài khoản còn lại ở trang Quản lý tài khoản.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
