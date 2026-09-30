import React, { useState } from 'react';
import { MessageSquareWarning } from 'lucide-react';
import { F16_QuanLyPhanAnh } from './F16_QuanLyPhanAnh';
import { F17_XuLyPhanAnh } from './F17_XuLyPhanAnh';
import { MOCK_COMPLAINTS, MOCK_ROUTES } from './mockData';
import { Complaint, ComplaintStatus } from './types';

/**
 * TRANG TÍCH HỢP HOÀN CHỈNH:
 * - F16: Quản lý phản ánh (Bảng danh sách, Bộ lọc, Tìm kiếm, Chi tiết phản ánh)
 * - F17: Xử lý phản ánh (Tiếp nhận giải quyết, cập nhật trạng thái, lưu phản hồi)
 */
export const ComplaintManagementApp: React.FC = () => {
  const [complaints, setComplaints] = useState<Complaint[]>(MOCK_COMPLAINTS);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);

  // Trigger mở modal xử lý F17 từ bảng F16
  const handleOpenProcess = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsProcessModalOpen(true);
  };

  // Lưu kết quả xử lý của F17 vào danh sách F16
  const handleSaveProcess = (
    complaintId: string,
    newStatus: ComplaintStatus,
    adminResponse: string
  ) => {
    setComplaints((prev) =>
      prev.map((c) => {
        if (c.id === complaintId) {
          return {
            ...c,
            status: newStatus,
            adminResponse,
            processedBy: 'Cán bộ điều hành',
            processedAt: new Date().toLocaleString('vi-VN'),
          };
        }
        return c;
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0b1329] p-6 text-slate-900 dark:text-slate-100">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Banner tiêu đề */}
        <div className="flex items-center justify-between p-5 rounded-2xl bg-white dark:bg-[#131e3a] border border-slate-200 dark:border-[#1e2f57] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 rounded-xl text-rose-500">
              <MessageSquareWarning className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">
                Module Quản Lý & Xử Lý Khiếu Nại Hành Khách
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gói tích hợp 2 chức năng cuối: <span className="font-semibold text-sky-600">F16 (Quản lý phản ánh)</span> & <span className="font-semibold text-emerald-600">F17 (Xử lý phản ánh)</span>
              </p>
            </div>
          </div>
        </div>

        {/* F16: Bảng quản lý & bộ lọc danh sách */}
        <F16_QuanLyPhanAnh
          complaints={complaints}
          routes={MOCK_ROUTES}
          onOpenProcess={handleOpenProcess}
        />

        {/* F17: Modal xử lý phản ánh */}
        <F17_XuLyPhanAnh
          isOpen={isProcessModalOpen}
          complaint={selectedComplaint}
          routes={MOCK_ROUTES}
          onClose={() => setIsProcessModalOpen(false)}
          onSave={handleSaveProcess}
        />
      </div>
    </div>
  );
};

export default ComplaintManagementApp;
