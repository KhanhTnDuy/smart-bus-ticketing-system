import React from 'react';
import { Bus, Phone, Mail, Shield, Clock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-[#0c162d] border-t border-slate-200 dark:border-[#1a2d59] text-slate-600 dark:text-slate-400 text-xs transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Col 1: Portal intro */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-institutional-900 dark:text-white font-bold text-sm">
              <div className="p-1.5 bg-institutional-900 text-amber-400 rounded">
                <Bus className="w-4 h-4" />
              </div>
              <span>HỆ THỐNG ĐIỀU HÀNH & BÁN VÉ XE BUÝT THÔNG MINH</span>
            </div>
            <p className="text-xs leading-relaxed max-w-md text-slate-500 dark:text-slate-400">
              Cổng thông tin chính thức của Cục Quản Lý Giao Thông Vận Tải Đô Thị. Ứng dụng công nghệ số trong quản lý hạ tầng tuyến, trạm dừng xe buýt, định giá vé điện tử và tiếp nhận phản hồi của nhân dân.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span>Phiên bản: v1.0.0-PROD</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                An toàn & Bảo mật cấp độ 3
              </span>
            </div>
          </div>

          {/* Col 2: Hotline & Working hours */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
              Hỗ trợ kỹ thuật
            </h4>
            <div className="h-0.5 bg-amber-500 w-12 rounded-full mb-3" />
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
                <span>Tổng đài điều độ: <strong>1900 1288</strong></span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
                <span>hotro@smartbus.gov.vn</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-institutional-600 dark:text-sky-400" />
                <span>Trực điều hành: 05:00 - 22:30</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Notice */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs">
              Quy chuẩn nghiệp vụ
            </h4>
            <div className="h-0.5 bg-amber-500 w-12 rounded-full mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Mọi hành vi thay đổi lộ trình, biểu giá vé và phê duyệt khiếu nại đều được ghi nhận tự động vào Nhật ký hệ thống (Audit Logs) để phục vụ thanh tra.
            </p>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="pt-6 mt-6 border-t border-slate-200 dark:border-[#1a2d59] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
          <div>
            © 2026 Cục Quản Lý Giao Thông Đô Thị & Vận Tải Hành Khách Công Cộng. Bản quyền được bảo lưu.
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:underline cursor-pointer">Điều khoản sử dụng</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Chính sách bảo mật</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Quy chế vận tải</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
