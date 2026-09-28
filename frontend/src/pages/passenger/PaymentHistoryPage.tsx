import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Eye,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowDownLeft,
  Smartphone,
  Building,
  DollarSign,
  Receipt,
  FileCheck,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { PaymentRecord, PaymentMethod, PaymentStatus } from '../../types';

export const PaymentHistoryPage: React.FC = () => {
  const { payments, tickets, routes } = useData();
  const { currentUser, role } = useAuth();
  const { success } = useToast();
  const showSuccess = success;

  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Filter payments by role if passenger
  const availablePayments = useMemo(() => {
    let list = payments;
    if (role === 'PASSENGER' && currentUser) {
      // Find tickets belonging to user
      const userTicketIds = tickets
        .filter(
          (t) =>
            t.passengerId === currentUser.id ||
            t.passengerName.toLowerCase() === currentUser.fullName.toLowerCase()
        )
        .map((t) => t.id);

      list = list.filter((p) => userTicketIds.includes(p.ticketId));
    }
    return list;
  }, [payments, tickets, currentUser, role]);

  const filteredPayments = useMemo(() => {
    return availablePayments.filter((p) => {
      const txnCode = p.transactionCode || p.id;
      const matchesSearch =
        txnCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.amount.toString().includes(searchTerm);

      const matchesMethod = methodFilter === 'ALL' || p.method === methodFilter;
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

      return matchesSearch && matchesMethod && matchesStatus;
    });
  }, [availablePayments, searchTerm, methodFilter, statusFilter]);

  const handleViewDetail = (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setIsDetailModalOpen(true);
  };

  const handleDownloadReceipt = (payment: PaymentRecord) => {
    showSuccess(`Đã xuất biên lai điện tử cho giao dịch ${payment.transactionCode || payment.id}!`);
  };

  const renderMethodBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'MOMO':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border border-pink-200 dark:border-pink-800 flex items-center gap-1.5 w-fit">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Ví MoMo</span>
          </span>
        );
      case 'VNPAY':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5 w-fit">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Cổng VNPay</span>
          </span>
        );
      case 'ZALOPAY':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800 flex items-center gap-1.5 w-fit">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Ví ZaloPay</span>
          </span>
        );
      case 'BANK_TRANSFER':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5 w-fit">
            <Building className="w-3.5 h-3.5" />
            <span>Chuyển khoản NH</span>
          </span>
        );
      default:
        return <span>{method}</span>;
    }
  };

  // Find linked ticket
  const linkedTicket = useMemo(() => {
    if (!selectedPayment) return null;
    return tickets.find((t) => t.id === selectedPayment.ticketId);
  }, [tickets, selectedPayment]);

  const linkedRoute = useMemo(() => {
    if (!linkedTicket) return null;
    return routes.find((r) => r.id === linkedTicket.routeId);
  }, [routes, linkedTicket]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch Sử Giao Dịch & Thanh Toán"
        subtitle="Theo dõi toàn bộ dòng tiền thanh toán vé điện tử qua các cổng MoMo, VNPay, ZaloPay và Ngân hàng số"
        icon={<CreditCard className="w-6 h-6 text-amber-500" />}
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Tài chính & Thanh toán' },
          { label: 'Lịch sử thanh toán' },
        ]}
      />

      {/* Statistics Quick Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Tổng số giao dịch</div>
          <div className="text-xl font-bold text-institutional-900 dark:text-white mt-1">
            {availablePayments.length} giao dịch
          </div>
        </div>

        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Giao dịch thành công</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {availablePayments.filter((p) => p.status === 'SUCCESS').length}
          </div>
        </div>

        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Đã hoàn tiền (Refunded)</div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {availablePayments.filter((p) => p.status === 'REFUNDED').length}
          </div>
        </div>

        <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="text-slate-400 text-xs font-semibold">Tổng giá trị thanh toán</div>
          <div className="text-xl font-bold text-institutional-700 dark:text-sky-300 mt-1">
            {availablePayments
              .filter((p) => p.status === 'SUCCESS')
              .reduce((sum, p) => sum + p.amount, 0)
              .toLocaleString('vi-VN')}{' '}
            đ
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã giao dịch (TXN-...), mã vé hoặc số tiền..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">Tất cả phương thức</option>
              <option value="MOMO">Ví MoMo</option>
              <option value="VNPAY">Cổng VNPay</option>
              <option value="ZALOPAY">Ví ZaloPay</option>
              <option value="BANK_TRANSFER">Chuyển khoản Ngân hàng</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="SUCCESS">Thành công</option>
              <option value="PENDING">Đang xử lý</option>
              <option value="FAILED">Thất bại</option>
              <option value="REFUNDED">Đã hoàn tiền</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment Table */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          title="Không tìm thấy giao dịch nào"
          description="Chưa có dữ liệu giao dịch thanh toán nào phù hợp với bộ lọc hiện tại."
          icon={<CreditCard className="w-12 h-12 text-slate-300" />}
        />
      ) : (
        <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-[#0c162d] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Mã giao dịch</th>
                  <th className="py-3 px-4">Mã vé / Dịch vụ</th>
                  <th className="py-3 px-4">Phương thức</th>
                  <th className="py-3 px-4">Số tiền</th>
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-[#162344] transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-institutional-700 dark:text-sky-300 whitespace-nowrap">
                      {payment.transactionCode || payment.id}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {payment.ticketId}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {renderMethodBadge(payment.method)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {payment.amount.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                      {new Date(payment.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant="paymentStatus" value={payment.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewDetail(payment)}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-institutional-700 dark:text-sky-300 font-semibold rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Chi tiết</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadReceipt(payment)}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 font-semibold rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Biên lai</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedPayment && (
        <Modal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`CHI TIẾT GIAO DỊCH — ${selectedPayment.transactionCode || selectedPayment.id}`}
          maxWidth="lg"
        >
          <div className="space-y-4">
            {/* Header Status Card */}
            <div className="bg-slate-50 dark:bg-[#0c162d] p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-2">
              <div className="text-xs text-slate-500">Số tiền thanh toán</div>
              <div className="text-2xl font-black text-institutional-900 dark:text-white">
                {selectedPayment.amount.toLocaleString('vi-VN')} VNĐ
              </div>
              <div className="flex justify-center">
                <Badge variant="paymentStatus" value={selectedPayment.status} />
              </div>
            </div>

            {/* Information Grid */}
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Mã giao dịch hệ thống:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {selectedPayment.transactionCode || selectedPayment.id}
                </span>
              </div>
              <div className="py-2.5 flex justify-between items-center">
                <span className="text-slate-500">Phương thức thanh toán:</span>
                <div>{renderMethodBadge(selectedPayment.method)}</div>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Thời gian khởi tạo:</span>
                <span className="text-slate-900 dark:text-white">
                  {new Date(selectedPayment.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Mã vé liên kết:</span>
                <span className="font-mono font-bold text-institutional-600 dark:text-sky-400">
                  {selectedPayment.ticketId}
                </span>
              </div>
              {linkedTicket && (
                <>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-500">Hành khách:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {linkedTicket.passengerName}
                    </span>
                  </div>
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-500">Tuyến xe:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {linkedRoute ? `${linkedRoute.code || linkedRoute.routeCode} - ${linkedRoute.name}` : linkedTicket.routeId}
                    </span>
                  </div>
                </>
              )}
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Trạng thái hạch toán:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Đã ghi nhận ngân hàng
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleDownloadReceipt(selectedPayment)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Tải biên lai PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
