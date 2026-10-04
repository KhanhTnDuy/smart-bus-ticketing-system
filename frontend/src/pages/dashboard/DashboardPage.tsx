import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Compass,
  MapPin,
  CreditCard,
  MessageSquareWarning,
  Star,
  FileText,
  ShieldCheck,
  Calendar,
  ArrowRight,
  AlertTriangle,
  Ticket,
  QrCode,
  Radio,
  Receipt,
  UserCheck,
  RotateCcw,
  Search,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { toAuditLog } from '../../api/mappers';
import { formatDateTime } from '../../api/datetime';
import { Badge } from '../../components/common/Badge';

export const DashboardPage: React.FC = () => {
  const { currentUser, role } = useAuth();
  // Số liệu thật từ backend theo quyền của vai trò. Không còn dữ liệu mẫu ở trang này.
  const data = useDashboardData(role);
  const navigate = useNavigate();

  /** " (3 chờ)" khi có số liệu; chuỗi rỗng khi null, để không khoe một con số 0 sai. */
  const countLabel = (n: number | null, unit: string) => (n === null ? '' : ` (${n} ${unit})`);

  const recentLogs = data.recentAuditLogs.map(toAuditLog);

  return (
    <div className="space-y-6">
      
      {/* 1. Official Institutional Welcome Panel */}
      <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                PHIÊN LÀM VIỆC CHÍNH THỨC
              </span>
              <span className="text-xs text-slate-400">
                Hôm nay: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-institutional-900 dark:text-sky-300">
              Xin chào, {currentUser?.fullName || 'Người dùng'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Đơn vị: <strong>{currentUser?.department || 'Cục Quản Lý Vận Tải Đô Thị'}</strong>
              {currentUser?.email ? <> • Email: {currentUser.email}</> : null}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs text-slate-400">Quyền hạn hệ thống:</div>
              <Badge variant="role" value={role || 'PASSENGER'} />
            </div>
            <img
              src={currentUser?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser?.fullName || 'U')}&background=0c356a&color=fff`}
              alt="Avatar"
              className="w-12 h-12 rounded-full object-cover ring-2 ring-institutional-600/40"
            />
          </div>
        </div>
      </div>

      {/* 2. Structured Information Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Operations & Key Panels */}
        <div className="lg:col-span-2 space-y-6">

          {/* SPRINT 2 QUICK ACCESS SHORTCUT PANEL */}
          <div className="bg-white dark:bg-[#131e3a] rounded-xl border-2 border-amber-400/40 dark:border-amber-500/30 p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-institutional-900 dark:text-sky-300">
                    Nghiệp Vụ Bán Vé & Vận Hành Thời Gian Thực
                  </h2>
                </div>
                <div className="h-0.5 bg-amber-500 w-24 mt-1 rounded-full" />
              </div>
              <span className="text-[11px] text-slate-400">Theo vai trò: {role}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              
              {/* PASSENGER SPRINT 2 SHORTCUTS */}
              {role === 'PASSENGER' && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/passenger/booking')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-[#0d1d3a] hover:bg-sky-100/70 dark:hover:bg-sky-900/40 transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-sky-600 text-white shrink-0 shadow-sm">
                      <Search className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-institutional-600 dark:group-hover:text-sky-400 flex items-center justify-between">
                        <span>Tìm & Đặt Vé Trực Tuyến</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Tìm chuyến theo điểm đi, điểm đến và ngày, chọn ghế trên sơ đồ thật của xe, giữ chỗ 10 phút.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/passenger/tickets')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-[#1f1a10] hover:bg-amber-100/70 dark:hover:bg-amber-900/40 transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-amber-500 text-slate-950 shrink-0 shadow-sm">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 flex items-center justify-between">
                        <span>Vé Điện Tử Của Tôi{countLabel(data.myActiveTicketCount, 'vé còn hiệu lực')}</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Mã QR lên xe, xem chi tiết, gửi yêu cầu đổi chuyến hoặc hủy vé.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/tracking')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-[#0c1e18] hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-emerald-600 text-white shrink-0 shadow-sm">
                      <Radio className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center justify-between">
                        <span>Theo Dõi Vị Trí Xe GPS</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Radar bản đồ trực tiếp vị trí xe buýt, tốc độ di chuyển và thời gian đến trạm.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/passenger/invoices')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/50 dark:bg-[#1a0f2b] hover:bg-purple-100/70 dark:hover:bg-purple-900/40 transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-purple-600 text-white shrink-0 shadow-sm">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 flex items-center justify-between">
                        <span>Hóa Đơn Điện Tử VAT</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Tra cứu hóa đơn điện tử giá trị gia tăng chuẩn Tổng cục Thuế kèm chữ ký số.
                      </p>
                    </div>
                  </button>
                </>
              )}

              {/* MANAGER & ADMIN SPRINT 2 SHORTCUTS */}
              {(role === 'MANAGER' || role === 'ADMIN') && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/manager/schedules')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-[#0d1d3a] hover:bg-sky-100/70 dark:hover:bg-sky-900/40 transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-sky-600 text-white shrink-0 shadow-sm">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-institutional-600 dark:group-hover:text-sky-400 flex items-center justify-between">
                        <span>Quản Lý Lịch Chuyến Xe{countLabel(data.upcomingTripCount, 'chuyến sắp chạy')}</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Thiết lập thời gian biểu, sinh chuyến tự động theo tần suất và theo dõi trạng thái từng chuyến.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/manager/assignments')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-[#12133a] hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-indigo-600 text-white shrink-0 shadow-sm">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center justify-between">
                        <span>Phân Công Tài Xế & Phụ Xe{countLabel(data.unassignedTripCount, 'chuyến thiếu người')}</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Giao xe, tài xế chính và phụ xe cho từng chuyến đi, giám sát ca trực.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/manager/ticket-requests')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-[#1f1a10] hover:bg-amber-100/70 dark:hover:bg-amber-900/40 transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-amber-500 text-slate-950 shrink-0 shadow-sm">
                      <RotateCcw className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 flex items-center justify-between">
                        <span>Duyệt Yêu Cầu Hủy / Đổi Vé{countLabel(data.pendingChangeRequestCount, 'chờ')}</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Xét duyệt hoặc từ chối yêu cầu hủy vé và đổi chuyến do hành khách gửi lên.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/tracking')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-[#0c1e18] hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-emerald-600 text-white shrink-0 shadow-sm">
                      <Radio className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center justify-between">
                        <span>Giám Sát Radar GPS Xe Buýt</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Bản đồ mô phỏng vị trí xe buýt trên tuyến.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/manager/revenue')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-[#1f1a10] hover:bg-amber-100/70 dark:hover:bg-amber-900/40 transition-all text-left group sm:col-span-2"
                  >
                    <div className="p-2.5 rounded-lg bg-amber-500 text-slate-950 shrink-0 shadow-sm">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 flex items-center justify-between">
                        <span>Báo Cáo & Thống Kê Doanh Thu Bán Vé</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Tổng hợp doanh thu theo ngày, tháng, tuyến xe, trực quan hóa biểu đồ và xuất báo cáo tài chính.
                      </p>
                    </div>
                  </button>
                </>
              )}

              {/* DRIVER SPRINT 2 SHORTCUTS */}
              {role === 'DRIVER' && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/driver/qr-scanner')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-[#1f1a10] hover:bg-amber-100/70 dark:hover:bg-amber-900/40 transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-amber-500 text-slate-950 shrink-0 shadow-sm">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 flex items-center justify-between">
                        <span>Quét Mã QR Vé Lên Xe</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Kiểm soát vé hành khách qua camera mô phỏng: Hợp lệ, Đã dùng, Bị hủy, Không tồn tại.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/incident/report')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-[#201015] hover:bg-rose-100/70 dark:hover:bg-rose-900/40 transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-rose-600 text-white shrink-0 shadow-sm">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 flex items-center justify-between">
                        <span>Báo Cáo Sự Cố Khẩn Cấp</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Khai báo nhanh hỏng hóc kỹ thuật, sự cố giao thông gửi về Trung tâm điều hành.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/tracking')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-[#0c1e18] hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 transition-all text-left group sm:col-span-2"
                  >
                    <div className="p-2.5 rounded-lg bg-emerald-600 text-white shrink-0 shadow-sm">
                      <Radio className="w-5 h-5 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 flex items-center justify-between">
                        <span>Giám Sát Định Vị Xe Buýt Của Ca Trực</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Kiểm tra vị trí xe, khoảng cách và thời gian dự kiến đến trạm dừng tiếp theo.
                      </p>
                    </div>
                  </button>
                </>
              )}

            </div>
          </div>

          {/* SPRINT 1 QUICK ACCESS FUNCTION PANEL */}
          <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-institutional-800 dark:text-sky-400">
                  Lối Tắt Nghiệp Vụ Cơ Bản
                </h2>
                <div className="h-0.5 bg-amber-500 w-16 mt-1 rounded-full" />
              </div>
              <span className="text-[11px] text-slate-400">Theo vai trò: {role}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {role === 'ADMIN' && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/admin/accounts')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0c162d] hover:bg-blue-50 dark:hover:bg-[#19274c] transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-institutional-600 dark:group-hover:text-sky-400 flex items-center justify-between">
                        <span>Quản lý tài khoản</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Thêm, xem chi tiết, chỉnh sửa thông tin và xóa tài khoản nhân sự.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/admin/roles')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0c162d] hover:bg-blue-50 dark:hover:bg-[#19274c] transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-institutional-600 dark:group-hover:text-sky-400 flex items-center justify-between">
                        <span>Phân quyền vai trò</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Thiết lập vai trò Admin, Manager, Driver, Passenger trực tiếp.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/admin/audit-logs')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0c162d] hover:bg-blue-50 dark:hover:bg-[#19274c] transition-all text-left group sm:col-span-2"
                  >
                    <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-institutional-600 dark:group-hover:text-sky-400 flex items-center justify-between">
                        <span>Nhật ký thanh tra hệ thống (Audit Logs)</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Theo dõi toàn bộ hoạt động CRUD, tra cứu theo người thực hiện, phân hệ, ngày giờ và trạng thái.
                      </p>
                    </div>
                  </button>
                </>
              )}

              {role === 'MANAGER' && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/manager/routes')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0c162d] hover:bg-blue-50 dark:hover:bg-[#19274c] transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 shrink-0">
                      <Compass className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-institutional-600 dark:group-hover:text-sky-400 flex items-center justify-between">
                        <span>Quản lý Tuyến đường</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Thêm mới, xem chi tiết, điều chỉnh lộ trình, cự ly và xóa tuyến.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/manager/stops')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0c162d] hover:bg-blue-50 dark:hover:bg-[#19274c] transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-institutional-600 dark:group-hover:text-sky-400 flex items-center justify-between">
                        <span>Quản lý Trạm dừng</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Thêm trạm, sắp xếp thứ tự di chuyển [Lên / Xuống] tức thời.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/manager/fares')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0c162d] hover:bg-blue-50 dark:hover:bg-[#19274c] transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-institutional-600 dark:group-hover:text-sky-400 flex items-center justify-between">
                        <span>Biểu giá vé xe buýt</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Định giá vé lượt, trợ giá học sinh sinh viên, miễn phí người cao tuổi.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/manager/complaints')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0c162d] hover:bg-blue-50 dark:hover:bg-[#19274c] transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 shrink-0">
                      <MessageSquareWarning className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-institutional-600 dark:group-hover:text-sky-400 flex items-center justify-between">
                        <span>Xử lý khiếu nại{countLabel(data.pendingFeedbackCount, 'chờ')}</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Xem chi tiết phản ánh, chuyển trạng thái giải quyết và phản hồi.
                      </p>
                    </div>
                  </button>
                </>
              )}

              {role === 'DRIVER' && (
                <button
                  type="button"
                  onClick={() => navigate('/driver/schedule')}
                  className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0c162d] hover:bg-blue-50 dark:hover:bg-[#19274c] transition-all text-left group sm:col-span-2"
                >
                  <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-institutional-600 dark:group-hover:text-sky-400 flex items-center justify-between">
                      <span>Lịch trình & Lộ trình trạm dừng phụ trách</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                      Xem danh sách các trạm dừng tuần tự theo lộ trình xe buýt chạy.
                    </p>
                  </div>
                </button>
              )}

              {role === 'PASSENGER' && (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/passenger/complaints')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0c162d] hover:bg-blue-50 dark:hover:bg-[#19274c] transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 shrink-0">
                      <MessageSquareWarning className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-institutional-600 dark:group-hover:text-sky-400 flex items-center justify-between">
                        <span>Gửi khiếu nại dịch vụ</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Phản ánh về thái độ lái phụ xe, giờ đón, giá cước hoặc chất lượng phương tiện.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/passenger/ratings')}
                    className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0c162d] hover:bg-blue-50 dark:hover:bg-[#19274c] transition-all text-left group"
                  >
                    <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                      <Star className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-institutional-600 dark:group-hover:text-sky-400 flex items-center justify-between">
                        <span>Đánh giá chất lượng chuyến đi</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                        Chấm sao từ 1 đến 5 sao và đóng góp ý kiến nâng cao dịch vụ xe buýt công cộng.
                      </p>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Operational summary list: Routes in operation */}
          <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-institutional-800 dark:text-sky-400">
                  Tuyến Xe Buýt Đang Vận Hành ({data.routes.length} Tuyến)
                </h3>
                <div className="h-0.5 bg-amber-500 w-16 mt-1 rounded-full" />
              </div>
              {(role === 'MANAGER' || role === 'ADMIN') && (
                <button
                  onClick={() => navigate('/manager/routes')}
                  className="text-xs font-semibold text-institutional-600 dark:text-sky-400 hover:underline"
                >
                  Xem tất cả
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-[#1a2b53] mt-2">
              {data.isLoading ? (
                <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  Đang tải danh sách tuyến…
                </div>
              ) : data.routes.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  Chưa có tuyến xe nào trong hệ thống.
                </div>
              ) : (
                data.routes.map((rt) => (
                  <div key={rt.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-institutional-50 dark:bg-[#1c2c54] border border-institutional-200 dark:border-institutional-800 flex items-center justify-center font-bold text-xs text-institutional-800 dark:text-sky-300 shrink-0">
                        {rt.code}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{rt.name}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {rt.startPoint} ⇄ {rt.endPoint}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* Backend chưa lưu thời lượng hay giờ hoạt động của tuyến nên không hiển thị: chỉ nêu cái có thật. */}
                      <div className="text-right hidden sm:block text-[11px] text-slate-500 dark:text-slate-400">
                        <div>{rt.distanceKm} km</div>
                        <div>{rt.stopCount} trạm dừng</div>
                      </div>
                      <Badge variant="routeStatus" value={rt.active ? 'ACTIVE' : 'SUSPENDED'} size="sm" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Recent Audit / Complaints / Status Notices */}
        <div className="space-y-6">

          {/* Chỉ số vận hành: chỉ những số có nguồn thật */}
          {(data.upcomingTripCount !== null || data.pendingChangeRequestCount !== null || data.pendingFeedbackCount !== null) && (
            <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Chỉ Số Vận Hành
              </h3>
              <div className="h-0.5 bg-amber-500 w-12 rounded-full" />

              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {data.upcomingTripCount !== null && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Chuyến sắp chạy</div>
                    <div className="text-xl font-bold text-sky-600 dark:text-sky-400 mt-0.5">
                      {data.upcomingTripCount}
                    </div>
                  </div>
                )}

                {data.unassignedTripCount !== null && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Chuyến thiếu người/xe</div>
                    <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5">
                      {data.unassignedTripCount}
                    </div>
                  </div>
                )}

                {data.pendingChangeRequestCount !== null && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Hủy/đổi vé chờ duyệt</div>
                    <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                      {data.pendingChangeRequestCount}
                    </div>
                  </div>
                )}

                {data.pendingFeedbackCount !== null && (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] text-slate-400 uppercase font-semibold">Phản ánh chưa xử lý</div>
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {data.pendingFeedbackCount}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Institutional Indicators (Sprint 1) */}
          <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Chỉ Số Hạ Tầng Toàn Hệ Thống
            </h3>
            <div className="h-0.5 bg-amber-500 w-12 rounded-full" />

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Tuyến hoạt động</div>
                <div className="text-xl font-bold text-institutional-800 dark:text-sky-400 mt-0.5">
                  {data.routes.filter((r) => r.active).length} / {data.routes.length}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Tổng trạm dừng</div>
                <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                  {data.stopCount}
                </div>
              </div>

              {data.fareCount !== null && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Biểu giá vé</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {data.fareCount}
                  </div>
                </div>
              )}

              {data.accountCount !== null && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Tài khoản</div>
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                    {data.accountCount}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Nhật ký thao tác: chỉ Admin được đọc nhật ký nên các vai trò khác không có khối này */}
          {role === 'ADMIN' && (
            <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-institutional-800 dark:text-sky-400">
                  Nhật Ký Thao Tác Gần Đây
                </h3>
                <button
                  onClick={() => navigate('/admin/audit-logs')}
                  className="text-[11px] text-institutional-600 dark:text-sky-400 hover:underline"
                >
                  Xem chi tiết
                </button>
              </div>

              <div className="space-y-3 mt-3">
                {recentLogs.length === 0 ? (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center py-2">
                    Chưa có thao tác nào được ghi nhận.
                  </div>
                ) : (
                  recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="text-xs p-2.5 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {log.action}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">{log.dateTime.split(' ')[1]}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {log.description}
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                        <span className="font-mono">{log.user.split(' ')[0]}</span>
                        <Badge variant="auditStatus" value={log.status} size="sm" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Đánh giá chuyến đi: chỉ Admin/Quản lý đọc được danh sách phản ánh */}
          {(role === 'ADMIN' || role === 'MANAGER') && (
            <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-institutional-800 dark:text-sky-400">
                  Đánh Giá Chuyến Đi Mới
                </h3>
                {data.averageRating !== null && (
                  <div className="flex items-center text-amber-400 gap-1 text-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      {data.averageRating.toFixed(1)} / 5.0
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2.5 mt-3">
                {data.recentReviews.length === 0 ? (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center py-2">
                    Chưa có đánh giá chuyến đi nào.
                  </div>
                ) : (
                  data.recentReviews.map((r) => (
                    <div
                      key={r.id}
                      className="p-2.5 rounded bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{r.passengerName}</span>
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < r.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic line-clamp-2">
                        "{r.content}"
                      </p>
                      <div className="text-[10px] text-slate-400 pt-0.5">{formatDateTime(r.createdAt)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
