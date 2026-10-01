import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileQuestion, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-8 text-center space-y-4">
        <div className="inline-flex p-4 rounded-full bg-institutional-50 dark:bg-institutional-950 text-institutional-600 dark:text-sky-400">
          <FileQuestion className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          404 — Không Tìm Thấy Trang
        </h2>
        <div className="h-0.5 bg-amber-500 w-16 mx-auto rounded-full" />
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Đường dẫn bạn yêu cầu không tồn tại hoặc đã bị thay đổi trong hệ thống điều hành xe buýt.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-institutional-700 hover:bg-institutional-800 text-white text-xs font-semibold shadow-md transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Trở về Trang chủ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
