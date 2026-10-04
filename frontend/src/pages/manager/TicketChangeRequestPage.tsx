import React, { useState, useMemo, useEffect } from 'react';
import {
  TicketCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  RefreshCw,
  User,
  Phone,
  Armchair,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { ApiError } from '../../api/client';
import {
  approveChangeRequest,
  ChangeRequestStatus,
  listChangeRequests,
  rejectChangeRequest,
  TicketChangeRequestDto,
} from '../../api/ticketChangeRequests';

/**
 * US5 - Quản lý duyệt yêu cầu hủy / đổi vé của hành khách.
 *
 * Vé và ghế chỉ thực sự thay đổi khi bấm Duyệt ở trang này. Máy chủ kiểm lại toàn bộ điều
 * kiện lúc đó, nên một yêu cầu hợp lệ khi gửi vẫn có thể bị chặn nếu chuyến đã khởi hành
 * hoặc ghế đích đã có người đặt — thông điệp lỗi sẽ nói rõ.
 */
export const TicketChangeRequestPage: React.FC = () => {
  const { success, error } = useToast();

  const [requests, setRequests] = useState<TicketChangeRequestDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | ChangeRequestStatus>('Pending');
  const [filterType, setFilterType] = useState<'ALL' | 'Cancel' | 'Exchange'>('ALL');

  /** Id đang được xử lý, để khóa đúng một hàng thay vì khóa cả trang. */
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        // Lấy tất cả rồi lọc ở client: danh sách yêu cầu của một tuyến xe buýt nhỏ, và
        // như vậy đổi bộ lọc không phải gọi lại máy chủ.
        const rows = await listChangeRequests(undefined, controller.signal);
        if (controller.signal.aborted) return;
        setRequests(rows);
        setLoadError('');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setRequests([]);
        setLoadError(
          err instanceof ApiError ? err.message : 'Không tải được danh sách yêu cầu hủy/đổi vé.'
        );
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [reloadToken]);

  const reload = () => {
    setIsLoading(true);
    setReloadToken((n) => n + 1);
  };

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return requests.filter((r) => {
      const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
      const matchType = filterType === 'ALL' || r.requestType === filterType;
      const matchSearch =
        !term ||
        [r.bookingCode, r.seatCode, r.passengerName, r.routeCode, r.routeName, r.busPlate]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(term));

      return matchStatus && matchType && matchSearch;
    });
  }, [requests, filterStatus, filterType, searchTerm]);

  const pendingCount = useMemo(() => requests.filter((r) => r.status === 'Pending').length, [requests]);

  const handleApprove = async (request: TicketChangeRequestDto) => {
    setProcessingId(request.id);
    try {
      const result = await approveChangeRequest(request.id);
      success(
        result.newSeatCode
          ? `${result.message} Vé mới: ghế ${result.newSeatCode}.`
          : result.message
      );
      reload();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Không duyệt được yêu cầu này.');
      // Máy chủ có thể đã từ chối vì dữ liệu thay đổi, nên tải lại cho khớp thực tế.
      reload();
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request: TicketChangeRequestDto) => {
    setProcessingId(request.id);
    try {
      const result = await rejectChangeRequest(request.id);
      success(result.message);
      reload();
    } catch (err) {
      error(err instanceof ApiError ? err.message : 'Không từ chối được yêu cầu này.');
      reload();
    } finally {
      setProcessingId(null);
    }
  };

  const statusBadge = (status: ChangeRequestStatus) => {
    const map = {
      Pending: {
        text: 'Chờ duyệt',
        cls: 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800',
        icon: <Clock className="w-3.5 h-3.5" />,
      },
      Approved: {
        text: 'Đã duyệt',
        cls: 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
      },
      Rejected: {
        text: 'Đã từ chối',
        cls: 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800',
        icon: <XCircle className="w-3.5 h-3.5" />,
      },
    }[status];

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold ${map.cls}`}
      >
        {map.icon}
        {map.text}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Duyệt Yêu Cầu Hủy & Đổi Vé"
        subtitle="Xét duyệt hoặc từ chối yêu cầu hủy vé, đổi chuyến của hành khách. Vé và ghế chỉ thay đổi sau khi duyệt."
        icon={<TicketCheck className="w-6 h-6 text-sky-500" />}
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Điều hành' },
          { label: 'Yêu cầu hủy / đổi vé' },
        ]}
      />

      {loadError && (
        <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={reload}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-900 font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Bộ lọc */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã đặt chỗ, ghế, hành khách, tuyến, biển số..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'ALL' | ChangeRequestStatus)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
          >
            <option value="Pending">Chờ duyệt ({pendingCount})</option>
            <option value="Approved">Đã duyệt</option>
            <option value="Rejected">Đã từ chối</option>
            <option value="ALL">Tất cả trạng thái</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as 'ALL' | 'Cancel' | 'Exchange')}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
          >
            <option value="ALL">Hủy và đổi vé</option>
            <option value="Cancel">Chỉ yêu cầu hủy</option>
            <option value="Exchange">Chỉ yêu cầu đổi</option>
          </select>
        </div>

        <button
          type="button"
          onClick={reload}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Tải lại</span>
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-[#131e3a] p-10 rounded-xl border border-slate-200 dark:border-[#1e2f57] text-center text-xs text-slate-500 dark:text-slate-400">
          Đang tải danh sách yêu cầu…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Không có yêu cầu nào"
          description={
            filterStatus === 'Pending'
              ? 'Hiện không có yêu cầu hủy hoặc đổi vé nào đang chờ duyệt.'
              : 'Không có yêu cầu nào khớp bộ lọc hiện tại.'
          }
          icon={<TicketCheck className="w-12 h-12 text-slate-300" />}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const isBusy = processingId === r.id;

            return (
              <div
                key={r.id}
                className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm p-4 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-bold ${
                        r.requestType === 'Cancel'
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                          : 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {r.requestType === 'Cancel' ? <XCircle className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                      {r.requestType === 'Cancel' ? 'Yêu cầu hủy vé' : 'Yêu cầu đổi vé'}
                    </span>
                    {statusBadge(r.status)}
                  </div>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                    {r.bookingCode}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Hành khách</div>
                    <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {r.passengerName}
                    </div>
                    {r.passengerPhone && (
                      <div className="text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {r.passengerPhone}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Vé hiện tại</div>
                    <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                      <Armchair className="w-3.5 h-3.5 text-slate-400" />
                      Ghế {r.seatCode}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                      {r.routeCode} • {r.departureDate} {r.departureTime}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400">Xe {r.busPlate}</div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">
                      {r.requestType === 'Exchange' ? 'Đổi sang' : 'Giá vé'}
                    </div>
                    {r.requestType === 'Exchange' && r.newSeatCode ? (
                      <>
                        <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          Ghế {r.newSeatCode}
                        </div>
                        <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                          {r.newDepartureDate} {r.newDepartureTime}
                        </div>
                        {r.newBusPlate && (
                          <div className="text-slate-500 dark:text-slate-400">Xe {r.newBusPlate}</div>
                        )}
                      </>
                    ) : (
                      <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {r.ticketPrice.toLocaleString('vi-VN')} đ
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5">Gửi lúc</div>
                    <div className="text-slate-700 dark:text-slate-200 font-mono">
                      {r.createdAt}
                    </div>
                    {r.processedAt && (
                      <div className="text-slate-500 dark:text-slate-400 mt-0.5">
                        Xử lý: {r.processedAt}
                        {r.processedByName ? ` • ${r.processedByName}` : ''}
                      </div>
                    )}
                  </div>
                </div>

                {r.reason && (
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-slate-400 text-[10px] uppercase tracking-wider">Lý do hành khách nêu: </span>
                    <span className="text-slate-700 dark:text-slate-200">{r.reason}</span>
                  </div>
                )}

                {r.status === 'Pending' && (
                  <div className="flex flex-wrap justify-end gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => handleReject(r)}
                      disabled={isBusy}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isBusy ? 'Đang xử lý…' : 'Từ chối'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprove(r)}
                      disabled={isBusy}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-institutional-700 hover:bg-institutional-800 text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-colors"
                    >
                      {isBusy ? 'Đang xử lý…' : 'Duyệt yêu cầu'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
