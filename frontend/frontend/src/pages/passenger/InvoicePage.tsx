import React, { useState, useMemo } from 'react';
import {
  FileText,
  Search,
  Filter,
  Eye,
  Download,
  Calendar,
  CreditCard,
  Building2,
  CheckCircle2,
  Printer,
  ShieldCheck,
  FileCheck,
  Receipt,
  User,
  DollarSign,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { Modal } from '../../components/common/Modal';
import { EmptyState } from '../../components/common/EmptyState';
import { ElectronicInvoice } from '../../types';

export const InvoicePage: React.FC = () => {
  const { invoices } = useData();
  const { currentUser, role } = useAuth();
  const { success } = useToast();
  const showSuccess = success;

  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [selectedInvoice, setSelectedInvoice] = useState<ElectronicInvoice | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Filter list by role (passenger sees their invoices, manager/admin sees all)
  const availableInvoices = useMemo(() => {
    let list = invoices;
    if (role === 'PASSENGER' && currentUser) {
      list = list.filter(
        (inv) =>
          inv.customerName.toLowerCase() === currentUser.fullName.toLowerCase() ||
          inv.customerTaxCode === currentUser.id
      );
    }
    return list;
  }, [invoices, currentUser, role]);

  const filteredInvoices = useMemo(() => {
    return availableInvoices.filter((inv) => {
      const invNum = inv.id;
      const tktCode = inv.ticketId;
      const matchesSearch =
        invNum.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tktCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.routeName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesMethod = methodFilter === 'ALL' || inv.paymentMethod === methodFilter;

      return matchesSearch && matchesMethod;
    });
  }, [availableInvoices, searchTerm, methodFilter]);

  const handleViewInvoice = (inv: ElectronicInvoice) => {
    setSelectedInvoice(inv);
    setIsViewModalOpen(true);
  };

  const handleExportPdf = (inv: ElectronicInvoice) => {
    showSuccess(`Đang xuất tệp hóa đơn điện tử VAT ${inv.id}.pdf thành công!`);
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case 'MOMO':
        return 'Ví MoMo';
      case 'VNPAY':
        return 'Cổng VNPay';
      case 'ZALOPAY':
        return 'Ví ZaloPay';
      case 'BANK_TRANSFER':
        return 'Chuyển khoản Ngân hàng';
      default:
        return method;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hóa Đơn Điện Tử (VAT)"
        subtitle="Tra cứu và tải hóa đơn giá trị gia tăng điện tử hợp lệ theo quy định của Tổng cục Thuế và Cục Vận Tải Đô Thị"
        icon={<Receipt className="w-6 h-6 text-amber-500" />}
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Tài chính & Thanh toán' },
          { label: 'Hóa đơn điện tử' },
        ]}
      />

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo số hóa đơn (HD-...), mã vé, họ tên, tuyến đường..."
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
              <option value="ALL">Tất cả phương thức thanh toán</option>
              <option value="MOMO">Ví MoMo</option>
              <option value="VNPAY">Cổng VNPay</option>
              <option value="ZALOPAY">Ví ZaloPay</option>
              <option value="BANK_TRANSFER">Chuyển khoản Ngân hàng</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 self-end md:self-auto">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Hóa đơn ký số tự động 100%</span>
        </div>
      </div>

      {/* Invoice Table */}
      {filteredInvoices.length === 0 ? (
        <EmptyState
          title="Không tìm thấy hóa đơn điện tử"
          description="Chưa có hóa đơn giá trị gia tăng nào phù hợp với điều kiện tìm kiếm của bạn."
          icon={<Receipt className="w-12 h-12 text-slate-300" />}
        />
      ) : (
        <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-[#0c162d] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Số hóa đơn</th>
                  <th className="py-3 px-4">Mã vé liên kết</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Nội dung dịch vụ</th>
                  <th className="py-3 px-4">Tiền trước thuế</th>
                  <th className="py-3 px-4">Thuế GTGT (8%)</th>
                  <th className="py-3 px-4">Tổng cộng</th>
                  <th className="py-3 px-4">Hình thức</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-[#162344] transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-institutional-700 dark:text-sky-300 whitespace-nowrap">
                      {inv.id}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {inv.ticketId}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {inv.customerName}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        MST/CCCD: {inv.customerTaxCode || '0109988776'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs truncate text-slate-700 dark:text-slate-300">
                      {inv.routeName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {inv.amount.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {inv.vatAmount.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                      {inv.totalAmount.toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                        {getMethodName(inv.paymentMethod)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewInvoice(inv)}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-institutional-700 dark:text-sky-300 font-semibold rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem hóa đơn</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleExportPdf(inv)}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 font-semibold rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Xuất PDF</span>
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

      {/* FORMAL VAT ELECTRONIC INVOICE MODAL */}
      {selectedInvoice && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`HÓA ĐƠN ĐIỆN TỬ — ${selectedInvoice.id}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Standard Institutional Invoice Paper Format */}
            <div className="bg-white text-slate-900 border-2 border-slate-300 rounded-xl p-6 shadow-md font-sans text-xs space-y-5">
              
              {/* Top Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div className="space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    CỤC VẬN TẢI ĐÔ THỊ THÀNH PHỐ
                  </div>
                  <div className="text-base font-bold text-institutional-900">
                    TRUNG TÂM QUẢN LÝ VÉ XE THÔNG MINH
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Mã số thuế: <strong>0101234567-001</strong>
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Địa chỉ: Số 01 Đường Đinh Tiên Hoàng, Phường Bến Nghé, Quận 1, TP.HCM
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Hotline: 1900 6868 • Email: hoadon@smartbus.gov.vn
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <div className="text-sm font-bold text-slate-900">Mẫu số: 01GTKT0/001</div>
                  <div className="text-xs text-slate-600 font-mono">Ký hiệu: <strong>SB/26E</strong></div>
                  <div className="text-xs font-mono font-bold text-red-600">
                    Số: {selectedInvoice.id}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Ngày lập: {selectedInvoice.invoiceDate}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center py-1">
                <h2 className="text-lg font-bold text-institutional-900 tracking-wider uppercase">
                  HÓA ĐƠN GIÁ TRỊ GIA TĂNG
                </h2>
                <div className="text-[11px] text-slate-500 italic">
                  (Hóa đơn điện tử khởi tạo từ máy tính tiền theo Nghị định 123/2020/NĐ-CP)
                </div>
              </div>

              {/* Customer Info */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-1.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Họ tên người mua hàng:</span>{' '}
                    <strong className="text-slate-900">{selectedInvoice.customerName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Mã số thuế / CCCD:</span>{' '}
                    <strong className="text-slate-900">{selectedInvoice.customerTaxCode || '0109988776'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Hình thức thanh toán:</span>{' '}
                    <strong>{getMethodName(selectedInvoice.paymentMethod)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Mã vé liên kết:</span>{' '}
                    <strong className="font-mono text-institutional-700">{selectedInvoice.ticketId}</strong>
                  </div>
                </div>
              </div>

              {/* Line items table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-200 font-bold text-slate-800">
                    <tr>
                      <th className="p-2 w-8 text-center">STT</th>
                      <th className="p-2">Tên hàng hóa, dịch vụ</th>
                      <th className="p-2 text-center w-16">ĐVT</th>
                      <th className="p-2 text-center w-16">SL</th>
                      <th className="p-2 text-right">Đơn giá</th>
                      <th className="p-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2 text-center">1</td>
                      <td className="p-2">
                        <div className="font-semibold text-slate-900">
                          Vé vận chuyển hành khách xe buýt thông minh
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Tuyến: {selectedInvoice.routeName}
                        </div>
                      </td>
                      <td className="p-2 text-center">Lượt</td>
                      <td className="p-2 text-center font-bold">1</td>
                      <td className="p-2 text-right font-mono">
                        {selectedInvoice.amount.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="p-2 text-right font-mono font-semibold">
                        {selectedInvoice.amount.toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tax & Total calculation */}
              <div className="space-y-1.5 border-t pt-3 text-right">
                <div className="flex justify-between text-slate-600">
                  <span>Cộng tiền dịch vụ:</span>
                  <span className="font-mono font-semibold">
                    {selectedInvoice.amount.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Thuế suất thuế GTGT: <strong>8%</strong>:</span>
                  <span className="font-mono font-semibold">
                    {selectedInvoice.vatAmount.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-institutional-900 border-t border-slate-300 pt-1.5">
                  <span>Tổng cộng tiền thanh toán:</span>
                  <span className="font-mono text-emerald-600">
                    {selectedInvoice.totalAmount.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
              </div>

              {/* Digital signature simulation */}
              <div className="pt-4 border-t grid grid-cols-2 gap-4">
                <div className="text-center space-y-1 text-slate-500">
                  <div className="font-bold text-slate-700">NGƯỜI MUA HÀNG</div>
                  <div className="text-[10px]">(Ký, ghi rõ họ tên)</div>
                  <div className="h-14 flex items-center justify-center text-[11px] text-slate-400">
                    Xác nhận qua giao dịch điện tử
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <div className="font-bold text-slate-800">NGƯỜI BÁN HÀNG</div>
                  <div className="text-[10px] text-slate-500">(Ký điện tử bởi tổ chức)</div>
                  
                  {/* Digital Signature Badge */}
                  <div className="p-2 border-2 border-emerald-600 bg-emerald-50 rounded-lg text-emerald-800 text-[11px] space-y-0.5 mt-1 shadow-sm">
                    <div className="flex items-center justify-center gap-1 font-bold text-emerald-700">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>CHỮ KÝ SỐ HỢP LỆ</span>
                    </div>
                    <div>Ký bởi: TRUNG TÂM VẬN TẢI THÔNG MINH</div>
                    <div className="text-[10px] text-emerald-600 font-mono">
                      Thời gian ký: {selectedInvoice.invoiceDate}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal action bar */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => handleExportPdf(selectedInvoice)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Tải tệp PDF hóa đơn</span>
              </button>
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
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
