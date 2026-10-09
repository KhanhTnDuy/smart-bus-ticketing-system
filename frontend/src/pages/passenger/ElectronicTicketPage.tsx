import React, { useState, useMemo, useEffect } from 'react';
import {
  Ticket as TicketIcon,
  Search,
  Filter,
  Eye,
  Download,
  RefreshCw,
  XCircle,
  QrCode,
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Bus,
  CreditCard,
  AlertCircle,
  FileCheck,
  Printer,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Badge } from '../../components/common/Badge';
import { Modal } from '../../components/common/Modal';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { Ticket, TicketStatus } from '../../types';
import { ApiError } from '../../api/client';
import { UnpaidBookingsPanel } from '../../components/passenger/UnpaidBookingsPanel';
import {
  requestCancelTicket,
  requestExchangeTicket,
  getTripSeats,
  listMyTickets,
  MyTicketDto,
  searchTrips,
  toTicket,
  TripDto,
  TripSeatDto,
} from '../../api/booking';

export const ElectronicTicketPage: React.FC = () => {
  const { routes } = useData();
  const { role } = useAuth();
  const { success, error, info } = useToast();

  // Vé lấy từ máy chủ: GET /api/bookings/my đã lọc theo tài khoản đang đăng nhập.
  const [tickets, setTickets] = useState<Ticket[]>([]);
  // DTO gốc giữ lại song song: giao diện dùng mã vé dạng chuỗi để hiển thị, còn API
  // hủy/đổi cần TicketId dạng số, và đổi vé còn cần tên điểm lên/xuống để tra chuyến.
  const [ticketDtos, setTicketDtos] = useState<Map<string, MyTicketDto>>(new Map());
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Số lần bấm "Thử lại"; đổi giá trị này là cách yêu cầu effect tải lại.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const rows = await listMyTickets(controller.signal);
        if (controller.signal.aborted) return;
        const mapped = rows.map(toTicket);
        setTickets(mapped);
        setTicketDtos(new Map(rows.map((dto, i) => [mapped[i].id, dto])));
        setLoadError('');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setTickets([]);
        setTicketDtos(new Map());
        setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách vé của bạn.');
      } finally {
        if (!controller.signal.aborted) setIsLoadingTickets(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [reloadToken]);

  const showSuccess = success;
  const showError = error;
  const showInfo = info;

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modal states
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  
  // Cancel Ticket Modal
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelTicketTarget, setCancelTicketTarget] = useState<Ticket | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Change Ticket Modal
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
  const [changeTicketTarget, setChangeTicketTarget] = useState<Ticket | null>(null);
  const [selectedNewTripId, setSelectedNewTripId] = useState('');
  const [selectedNewSeat, setSelectedNewSeat] = useState('');
  const [isSubmittingChange, setIsSubmittingChange] = useState(false);
  // Chuyến và ghế để đổi sang, tra từ API theo ngày khách chọn.
  const [changeDate, setChangeDate] = useState('');
  const [changeTrips, setChangeTrips] = useState<TripDto[]>([]);
  const [isSearchingTrips, setIsSearchingTrips] = useState(false);
  const [changeSeats, setChangeSeats] = useState<TripSeatDto[]>([]);
  const [isLoadingChangeSeats, setIsLoadingChangeSeats] = useState(false);

  // Helper to get Route Name
  const getRouteName = (routeId: string) => {
    const r = routes.find((item) => item.id === routeId);
    return r ? `${r.code || r.routeCode || ''} - ${r.name}` : routeId;
  };

  // Máy chủ đã lọc theo tài khoản đang đăng nhập nên không lọc lại ở client: lọc
  // thêm theo tên hoặc số điện thoại như bản dữ liệu mẫu sẽ làm mất vé của chính
  // mình khi hồ sơ chưa điền số điện thoại.
  //
  // Lưu ý: vai trò Quản trị/Điều hành cũng chỉ thấy vé của chính mình, vì hệ thống
  // chưa có endpoint liệt kê toàn bộ vé.
  const userTickets = tickets;

  /** Loại yêu cầu đang chờ duyệt trên một vé, nếu có. */
  const pendingRequestOf = (ticket: Ticket) => ticketDtos.get(ticket.id)?.pendingRequestType ?? null;

  /**
   * Vé còn gửi yêu cầu hủy/đổi được. Phải khớp với backend: TicketsController cho phép cả
   * vé đang giữ chỗ (Held, hiện ra đây là PENDING) và vé đã thanh toán (Valid -> PAID).
   * Bản cũ chỉ cho PAID, nên với dữ liệu thật — vé luôn dừng ở Held vì chưa có luồng
   * thanh toán — hai nút này không bao giờ hiện và tính năng thành ra không bấm được.
   *
   * Vé đã có một yêu cầu đang chờ thì không gửi thêm được: backend trả 409, nên khóa luôn
   * ở giao diện thay vì để khách bấm rồi nhận lỗi.
   */
  const canModify = (ticket: Ticket, ticketStatus: string) =>
    (ticketStatus === 'PAID' || ticketStatus === 'PENDING') && pendingRequestOf(ticket) === null;

  const filteredTickets = useMemo(() => {
    return userTickets.filter((ticket) => {
      const ticketCode = ticket.id;
      const routeName = ticket.routeName || getRouteName(ticket.routeId);
      const ticketStatus = ticket.ticketStatus || ticket.status || 'PAID';

      const matchesSearch =
        ticketCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        routeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.seatNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.busPlate.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || ticketStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [userTickets, searchTerm, statusFilter, routes]);

  // Handle "Xem vé"
  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsViewModalOpen(true);
  };

  // Handle "Xuất vé"
  const handleExportTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setIsExportModalOpen(true);
  };

  const handleDownloadTicketPdf = () => {
    showSuccess(
      `Đã tạo bản PDF cho vé ${selectedTicket?.id}. Đang lưu tệp vé điện tử...`
    );
    setIsExportModalOpen(false);
  };

  // Handle "Hủy vé"
  const openCancelModal = (ticket: Ticket) => {
    setCancelTicketTarget(ticket);
    setCancelReason('');
    setIsCancelModalOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTicketTarget) return;
    if (!cancelReason.trim()) {
      showError('Vui lòng nhập lý do hủy vé');
      return;
    }

    const dto = ticketDtos.get(cancelTicketTarget.id);
    if (!dto) {
      showError('Không xác định được vé cần hủy. Hãy tải lại trang.');
      return;
    }

    setIsSubmittingCancel(true);
    try {
      const result = await requestCancelTicket(dto.ticketId, cancelReason.trim());
      // Yêu cầu chưa có hiệu lực: vé vẫn còn và ghế chưa bị nhả tới khi quản lý duyệt.
      showSuccess(
        `Đã gửi yêu cầu hủy vé ghế ${result.seatCode}. Vé vẫn còn hiệu lực tới khi quản lý duyệt.`
      );
      setIsCancelModalOpen(false);
      setCancelTicketTarget(null);
      setCancelReason('');
      setReloadToken((n) => n + 1);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Không thể hủy vé vào lúc này');
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  // Handle "Đổi vé"
  const openChangeModal = (ticket: Ticket) => {
    setChangeTicketTarget(ticket);
    setSelectedNewTripId('');
    setSelectedNewSeat('');
    setChangeTrips([]);
    setChangeSeats([]);
    // Mặc định tra chuyến đúng ngày của vé hiện tại, là lựa chọn hay dùng nhất.
    setChangeDate(ticket.departureDate);
    setIsChangeModalOpen(true);
  };

  /**
   * Tra chuyến để đổi sang, dùng đúng điểm lên và điểm xuống của vé hiện tại:
   * backend chỉ cho đổi sang chuyến có đi qua cả hai điểm đó theo đúng chiều.
   */
  const handleSearchTripsForChange = async () => {
    if (!changeTicketTarget) return;
    const dto = ticketDtos.get(changeTicketTarget.id);
    if (!dto) {
      showError('Không xác định được vé cần đổi. Hãy tải lại trang.');
      return;
    }
    if (!changeDate) {
      showError('Vui lòng chọn ngày khởi hành để tra chuyến');
      return;
    }

    setIsSearchingTrips(true);
    setSelectedNewTripId('');
    setSelectedNewSeat('');
    setChangeSeats([]);
    try {
      const found = await searchTrips({
        from: dto.boardStopName,
        to: dto.alightStopName,
        date: changeDate,
      });
      // Bỏ chính chuyến của vé: backend chặn đổi sang cùng chuyến cùng ghế, và đổi
      // sang cùng chuyến khác ghế thì nên dùng chức năng chọn lại ghế.
      const others = found.filter((t) => t.id !== dto.tripId);
      setChangeTrips(others);
      if (others.length === 0) {
        showInfo('Không có chuyến nào khác phù hợp trong ngày đã chọn.');
      }
    } catch (err) {
      setChangeTrips([]);
      showError(err instanceof ApiError ? err.message : 'Không tra cứu được chuyến xe để đổi.');
    } finally {
      setIsSearchingTrips(false);
    }
  };

  /** Nạp sơ đồ ghế của chuyến mới để chỉ cho chọn ghế thật và còn trống. */
  const handlePickTripForChange = async (tripId: string) => {
    setSelectedNewTripId(tripId);
    setSelectedNewSeat('');
    setChangeSeats([]);
    if (!tripId) return;

    setIsLoadingChangeSeats(true);
    try {
      const seatMap = await getTripSeats(Number(tripId));
      setChangeSeats(seatMap);
      if (seatMap.every((s) => !s.isAvailable)) {
        showInfo('Chuyến này đã hết ghế trống.');
      }
    } catch (err) {
      setChangeSeats([]);
      showError(err instanceof ApiError ? err.message : 'Không tải được sơ đồ ghế của chuyến mới.');
    } finally {
      setIsLoadingChangeSeats(false);
    }
  };

  const selectedTripDetails = useMemo(
    () => changeTrips.find((t) => String(t.id) === selectedNewTripId),
    [changeTrips, selectedNewTripId]
  );

  const availableSeatsForChange = useMemo(
    () => changeSeats.filter((s) => s.isAvailable),
    [changeSeats]
  );

  const handleConfirmChange = async () => {
    if (!changeTicketTarget) return;
    if (!selectedNewTripId) {
      showError('Vui lòng chọn chuyến xe mới');
      return;
    }
    if (!selectedNewSeat) {
      showError('Vui lòng chọn số ghế mới');
      return;
    }

    const dto = ticketDtos.get(changeTicketTarget.id);
    if (!dto) {
      showError('Không xác định được vé cần đổi. Hãy tải lại trang.');
      return;
    }

    setIsSubmittingChange(true);
    try {
      await requestExchangeTicket(dto.ticketId, Number(selectedNewTripId), Number(selectedNewSeat));
      const chosenSeat = changeSeats.find((x) => String(x.seatId) === selectedNewSeat)?.seatCode ?? '';
      showSuccess(
        `Đã gửi yêu cầu đổi sang ghế ${chosenSeat}. Ghế chưa được giữ, quản lý sẽ kiểm tra khi duyệt.`
      );
      setIsChangeModalOpen(false);
      setChangeTicketTarget(null);
      setReloadToken((n) => n + 1);
    } catch (err) {
      showError(err instanceof ApiError ? err.message : 'Không thể đổi vé lúc này');
      // 409 nghĩa là ghế vừa bị người khác giữ: nạp lại sơ đồ để khách chọn ghế khác.
      if (err instanceof ApiError && err.status === 409) {
        await handlePickTripForChange(selectedNewTripId);
      }
    } finally {
      setIsSubmittingChange(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Official Page Header */}
      <PageHeader
        title="Quản Lý Vé Xe Điện Tử"
        subtitle="Tra cứu, kiểm tra mã QR, tải vé dạng tài liệu chính thức, thực hiện đổi chuyến hoặc hủy vé theo quy định vận tải"
        icon={<TicketIcon className="w-6 h-6 text-amber-500" />}
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Hành khách', href: '/passenger/booking' },
          { label: 'Vé điện tử' },
        ]}
      />
      <UnpaidBookingsPanel tickets={[...ticketDtos.values()]} onPaid={() => setReloadToken((n) => n + 1)} />


      {/* Không tải được vé thì phải nói rõ, nếu không trang trông y như "chưa có vé nào" */}
      {loadError && (
        <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsLoadingTickets(true);
              setReloadToken((n) => n + 1);
            }}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-900 font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* Filter and Control Bar */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo mã vé (TKT-...), họ tên, tuyến đường, biển số..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
            >
              <option value="ALL">Tất cả trạng thái vé</option>
              <option value="PAID">Đã thanh toán (Hợp lệ)</option>
              <option value="PENDING">Chờ thanh toán</option>
              <option value="USED">Đã sử dụng</option>
              <option value="CHANGED">Đã đổi vé</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <span className="text-xs text-slate-500 dark:text-slate-400">Chế độ hiển thị:</span>
          <div className="flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-[#0c162d]">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 text-xs font-semibold rounded ${
                viewMode === 'cards'
                  ? 'bg-institutional-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-white'
              }`}
            >
              Dạng Thẻ
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-xs font-semibold rounded ${
                viewMode === 'table'
                  ? 'bg-institutional-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-white'
              }`}
            >
              Dạng Bảng
            </button>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      {isLoadingTickets ? (
        <div className="bg-white dark:bg-[#131e3a] p-10 rounded-xl border border-slate-200 dark:border-[#1e2f57] text-center text-xs text-slate-500 dark:text-slate-400">
          Đang tải danh sách vé của bạn…
        </div>
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          title="Không tìm thấy vé xe nào"
          description={
            searchTerm || statusFilter !== 'ALL'
              ? 'Không có vé xe nào phù hợp với bộ lọc tìm kiếm của bạn.'
              : 'Bạn chưa có vé xe điện tử nào trong hệ thống.'
          }
          icon={<TicketIcon className="w-12 h-12 text-slate-300" />}
          action={
            role === 'PASSENGER' ? (
              <button
                type="button"
                onClick={() => (window.location.href = '/passenger/booking')}
                className="px-4 py-2 bg-institutional-600 text-white rounded-lg text-xs font-bold hover:bg-institutional-700 transition-colors"
              >
                Đặt vé ngay
              </button>
            ) : undefined
          }
        />
      ) : viewMode === 'cards' ? (
        /* Card Layout */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredTickets.map((ticket) => {
            const ticketStatus = ticket.ticketStatus || ticket.status || 'PAID';
            const canCancel = canModify(ticket, ticketStatus);
            const canChange = canModify(ticket, ticketStatus);
            const pendingRequest = pendingRequestOf(ticket);
            const routeName = ticket.routeName || getRouteName(ticket.routeId);

            return (
              <div
                key={ticket.id}
                className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Top Banner */}
                <div>
                  <div className="bg-gradient-to-r from-institutional-800 to-institutional-900 text-white p-4 flex items-center justify-between border-b-2 border-amber-500">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-white/10 rounded">
                        <Bus className="w-4 h-4 text-amber-300" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
                          MÃ VÉ ĐIỆN TỬ
                        </div>
                        <div className="text-sm font-mono font-bold tracking-wide">
                          {ticket.id}
                        </div>
                      </div>
                    </div>
                    <Badge variant="ticketStatus" value={ticketStatus} />
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3 text-xs">
                    {/* Route */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase">Tuyến xe</span>
                      <p className="font-bold text-slate-900 dark:text-sky-300 text-sm mt-0.5 line-clamp-1">
                        {routeName}
                      </p>
                    </div>

                    {/* Departure & Seat */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-[#0c162d] p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Khởi hành:</span>
                        <div className="font-semibold text-slate-800 dark:text-white flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-amber-500" />
                          <span>{ticket.departureDate}</span>
                        </div>
                        <div className="text-institutional-600 dark:text-sky-400 font-bold flex items-center gap-1 mt-0.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{ticket.departureTime}</span>
                        </div>
                      </div>

                      <div className="text-right border-l border-slate-200 dark:border-slate-800 pl-2">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">Vị trí ghế:</span>
                        <span className="inline-block mt-0.5 px-2.5 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 font-black text-sm rounded border border-amber-500/30">
                          {ticket.seatNumber}
                        </span>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Biển số: {ticket.busPlate}
                        </div>
                      </div>
                    </div>

                    {/* Passenger & Fare */}
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Hành khách:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {ticket.passengerName}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">Giá cước:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {ticket.price.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>

                    {/* QR Code preview strip */}
                    <div className="flex items-center justify-between p-2 rounded bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                        <QrCode className="w-4 h-4 text-institutional-600 dark:text-sky-400" />
                        <span className="text-[11px] font-mono">{ticket.qrCodeData}</span>
                      </div>
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">
                        Sẵn sàng quét
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer with Distinct Action Buttons (Separate Action Rule) */}
                <div className="p-3 bg-slate-50 dark:bg-[#0c162d]/60 border-t border-slate-100 dark:border-[#1e2f57] flex flex-wrap gap-1.5 justify-end">
                  {/* Action 1: Xem vé */}
                  <button
                    type="button"
                    onClick={() => handleViewTicket(ticket)}
                    className="px-2.5 py-1.5 rounded text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                    title="Xem chi tiết vé và mã QR"
                  >
                    <Eye className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Xem vé</span>
                  </button>

                  {/* Action 2: Xuất vé */}
                  <button
                    type="button"
                    onClick={() => handleExportTicket(ticket)}
                    className="px-2.5 py-1.5 rounded text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                    title="Xuất vé định dạng PDF/In"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Xuất vé</span>
                  </button>

                  {/* Action 3: Đổi vé */}
                  {canChange && (
                    <button
                      type="button"
                      onClick={() => openChangeModal(ticket)}
                      className="px-2.5 py-1.5 rounded text-xs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 flex items-center gap-1 transition-colors"
                      title="Gửi yêu cầu đổi chuyến hoặc ghế"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Đổi vé</span>
                    </button>
                  )}

                  {/* Action 4: Hủy vé */}
                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => openCancelModal(ticket)}
                      className="px-2.5 py-1.5 rounded text-xs font-semibold bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/20 flex items-center gap-1 transition-colors"
                      title="Gửi yêu cầu hủy vé"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Hủy vé</span>
                    </button>
                  )}

                  {/* Vé đang có yêu cầu chờ duyệt: nói rõ thay vì chỉ ẩn hai nút đi */}
                  {pendingRequest && (
                    <span className="px-2.5 py-1.5 rounded text-xs font-semibold bg-sky-500/10 border border-sky-500/30 text-sky-700 dark:text-sky-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {pendingRequest === 'Cancel' ? 'Chờ duyệt hủy vé' : 'Chờ duyệt đổi vé'}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table Layout */
        <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-[#0c162d] text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Mã vé</th>
                  <th className="py-3 px-4">Tuyến xe</th>
                  <th className="py-3 px-4">Khởi hành</th>
                  <th className="py-3 px-4">Hành khách</th>
                  <th className="py-3 px-4">Ghế / Biển số</th>
                  <th className="py-3 px-4">Giá vé</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTickets.map((ticket) => {
                  const ticketStatus = ticket.ticketStatus || ticket.status || 'PAID';
                  const canCancel = canModify(ticket, ticketStatus);
                  const canChange = canModify(ticket, ticketStatus);
                  const routeName = ticket.routeName || getRouteName(ticket.routeId);

                  return (
                    <tr
                      key={ticket.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-[#162344] transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-institutional-700 dark:text-sky-300">
                        {ticket.id}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100 max-w-xs truncate">
                        {routeName}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-800 dark:text-slate-200 font-medium">
                          {ticket.departureDate}
                        </div>
                        <div className="text-slate-500 text-[11px]">{ticket.departureTime}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {ticket.passengerName}
                        </div>
                        <div className="text-slate-400 text-[11px]">{ticket.passengerPhone}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          Ghế {ticket.seatNumber}
                        </span>
                        <div className="text-slate-400 text-[11px]">{ticket.busPlate}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {ticket.price.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Badge variant="ticketStatus" value={ticketStatus} />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewTicket(ticket)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-400"
                            title="Xem vé"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportTicket(ticket)}
                            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-emerald-600 dark:text-emerald-400"
                            title="Xuất vé"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {canChange && (
                            <button
                              type="button"
                              onClick={() => openChangeModal(ticket)}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600 dark:text-amber-400"
                              title="Đổi vé"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          )}
                          {canCancel && (
                            <button
                              type="button"
                              onClick={() => openCancelModal(ticket)}
                              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-red-600 dark:text-red-400"
                              title="Hủy vé"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: XEM VÉ (View Ticket Modal with QR) */}
      {selectedTicket && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={`THÔNG TIN VÉ ĐIỆN TỬ — ${selectedTicket.id}`}
          maxWidth="xl"
        >
          <div className="space-y-5">
            {/* Visual Boarding Pass Card */}
            <div className="bg-gradient-to-br from-slate-900 to-institutional-950 text-white rounded-xl p-6 border-2 border-amber-500 relative overflow-hidden shadow-2xl">
              {/* Decorative background watermark */}
              <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
                <Bus className="w-48 h-48 text-white" />
              </div>

              {/* Header inside ticket */}
              <div className="flex justify-between items-start border-b border-white/20 pb-4">
                <div>
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-widest">
                    HỆ THỐNG VÉ XE ĐIỆN TỬ ĐÔ THỊ
                  </div>
                  <div className="text-xl font-bold tracking-wide mt-1">
                    THẺ LÊN XE / BOARDING PASS
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="ticketStatus" value={selectedTicket.ticketStatus || selectedTicket.status || 'PAID'} />
                  <div className="text-xs font-mono font-bold mt-1 text-slate-300">
                    {selectedTicket.id}
                  </div>
                </div>
              </div>

              {/* Route */}
              <div className="py-4">
                <div className="text-[10px] text-amber-300 font-semibold uppercase">Tuyến vận hành</div>
                <div className="text-lg font-bold text-white mt-0.5">
                  {selectedTicket.routeName || getRouteName(selectedTicket.routeId)}
                </div>
              </div>

              {/* Core Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/10 backdrop-blur-sm p-3.5 rounded-lg border border-white/10 text-xs">
                <div>
                  <span className="text-[10px] text-slate-300 block">Ngày đi</span>
                  <span className="font-bold text-amber-300">{selectedTicket.departureDate}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-300 block">Giờ xuất bến</span>
                  <span className="font-bold text-white">{selectedTicket.departureTime}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-300 block">Số ghế</span>
                  <span className="font-black text-amber-400 text-base">{selectedTicket.seatNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-300 block">Biển kiểm soát</span>
                  <span className="font-bold text-white">{selectedTicket.busPlate}</span>
                </div>
              </div>

              {/* Passenger & QR Block */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1.5 text-xs text-left w-full sm:w-auto">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Hành khách:</span>
                    <span className="font-bold text-slate-100 text-sm">
                      {selectedTicket.passengerName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Số điện thoại:</span>
                    <span className="font-mono text-slate-200">{selectedTicket.passengerPhone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Cước phí thanh toán:</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {selectedTicket.price.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                {/* Simulated QR Box */}
                <div className="flex flex-col items-center bg-white p-3 rounded-lg shadow-inner text-slate-900 shrink-0">
                  <div className="w-28 h-28 border-2 border-dashed border-slate-400 rounded flex flex-col items-center justify-center bg-slate-50 relative">
                    <QrCode className="w-20 h-20 text-institutional-900" />
                    <span className="text-[9px] font-bold text-institutional-800 bg-white px-1 rounded absolute bottom-1">
                      CHÍNH THỨC
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold mt-1.5 text-slate-600">
                    {selectedTicket.qrCodeData}
                  </span>
                </div>
              </div>

              {/* Note */}
              <div className="mt-4 pt-3 border-t border-white/10 text-[10px] text-slate-300 flex items-center justify-between">
                <span>Quý khách vui lòng có mặt tại trạm trước giờ khởi hành 15 phút.</span>
                <span className="text-amber-400 font-semibold">Bảo mật mã QR</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleExportTicket(selectedTicket);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Xuất bản in / PDF</span>
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

      {/* MODAL 2: XUẤT VÉ (Export Printable Ticket Format) */}
      {selectedTicket && (
        <Modal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          title="XUẤT VÉ ĐIỆN TỬ (BẢN CHÍNH THỨC)"
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                Vé điện tử có giá trị pháp lý tương đương vé giấy in theo quy định của Bộ Giao thông Vận tải. Bạn có thể lưu ảnh hoặc file PDF để xuất trình khi lên xe.
              </div>
            </div>

            {/* Printable Preview Container */}
            <div className="border border-slate-300 dark:border-slate-700 rounded-xl p-5 bg-white text-slate-900 space-y-4 font-sans shadow-sm">
              <div className="text-center border-b pb-3">
                <div className="text-[11px] font-bold uppercase text-slate-500">
                  CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                </div>
                <div className="text-[10px] text-slate-400">Độc lập - Tự do - Hạnh phúc</div>
                <div className="text-sm font-bold text-institutional-900 mt-2 uppercase tracking-wide">
                  PHIẾU VÉ XE BUÝT ĐIỆN TỬ
                </div>
                <div className="text-xs font-mono font-bold text-slate-600">
                  Số vé: {selectedTicket.id}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Hành khách:</span>{' '}
                  <strong>{selectedTicket.passengerName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">SĐT:</span>{' '}
                  <strong>{selectedTicket.passengerPhone}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Tuyến xe:</span>{' '}
                  <strong>{selectedTicket.routeName || getRouteName(selectedTicket.routeId)}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Khởi hành:</span>{' '}
                  <strong>{selectedTicket.departureDate} ({selectedTicket.departureTime})</strong>
                </div>
                <div>
                  <span className="text-slate-500">Số ghế:</span>{' '}
                  <strong className="text-institutional-700 font-black">{selectedTicket.seatNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Xe buýt:</span>{' '}
                  <strong>{selectedTicket.busPlate}</strong>
                </div>
                <div className="col-span-2 pt-2 border-t flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">Tổng cước thanh toán:</span>
                  <span className="text-base font-bold text-emerald-600">
                    {selectedTicket.price.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <div className="text-center">
                  <QrCode className="w-24 h-24 mx-auto text-slate-800" />
                  <span className="text-[9px] font-mono text-slate-500">{selectedTicket.qrCodeData}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleDownloadTicketPdf}
                className="px-4 py-2 bg-institutional-600 hover:bg-institutional-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Tải tệp vé PDF</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: ĐỔI VÉ (Change Ticket Modal) */}
      {changeTicketTarget && (
        <Modal
          isOpen={isChangeModalOpen}
          onClose={() => setIsChangeModalOpen(false)}
          title={`GỬI YÊU CẦU ĐỔI VÉ — ${changeTicketTarget.id}`}
          maxWidth="xl"
        >
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg text-xs text-blue-800 dark:text-blue-300">
              <p className="font-semibold">Quy định đổi vé:</p>
              <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[11px]">
                <li>Chỉ gửi được khi chuyến hiện tại chưa khởi hành.</li>
                <li>Chuyến mới phải đi qua đúng điểm lên và điểm xuống của vé, theo đúng chiều.</li>
                <li>
                  Đây là <strong>yêu cầu</strong>: ghế mới chưa được giữ, quản lý sẽ kiểm tra lại
                  khi duyệt. Nếu lúc đó ghế đã có người, yêu cầu sẽ không duyệt được.
                </li>
                <li>Không phát sinh thêm phí: tổng tiền của lượt đặt giữ nguyên.</li>
              </ul>
            </div>

            {/* Current Ticket Summary */}
            <div className="p-3 bg-slate-50 dark:bg-[#0c162d] rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">Vé hiện tại:</div>
              <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                <div>Tuyến: <strong>{changeTicketTarget.routeName || getRouteName(changeTicketTarget.routeId)}</strong></div>
                <div>Số ghế: <strong className="text-amber-600">{changeTicketTarget.seatNumber}</strong></div>
                <div>Khởi hành: <strong>{changeTicketTarget.departureDate} ({changeTicketTarget.departureTime})</strong></div>
                <div>Xe: <strong>{changeTicketTarget.busPlate}</strong></div>
              </div>
              {ticketDtos.get(changeTicketTarget.id) && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  Hành trình giữ nguyên:{' '}
                  <strong>{ticketDtos.get(changeTicketTarget.id)!.boardStopName}</strong>
                  {' den '}
                  <strong>{ticketDtos.get(changeTicketTarget.id)!.alightStopName}</strong>
                </div>
              )}
            </div>

            {/* Chon ngay roi tra chuyen tu may chu */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                1. Chọn ngày khởi hành muốn đổi sang:
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={changeDate}
                  onChange={(e) => setChangeDate(e.target.value)}
                  className="flex-1 p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleSearchTripsForChange}
                  disabled={isSearchingTrips || !changeDate}
                  className="px-4 py-2 bg-institutional-700 hover:bg-institutional-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{isSearchingTrips ? 'Đang tra…' : 'Tra chuyến'}</span>
                </button>
              </div>
            </div>

            {/* Select New Trip */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                2. Chọn chuyến xe mới muốn đổi sang:
              </label>
              {changeTrips.length === 0 ? (
                <div className="text-xs text-slate-500 dark:text-slate-400 p-3 bg-slate-50 dark:bg-[#0c162d] rounded border border-slate-200 dark:border-slate-800">
                  Chọn ngày rồi bấm Tra chuyến để xem các chuyến có thể đổi sang.
                </div>
              ) : (
                <select
                  value={selectedNewTripId}
                  onChange={(e) => void handlePickTripForChange(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-institutional-500"
                >
                  <option value="">-- Vui lòng chọn chuyến xe --</option>
                  {changeTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.routeCode} | {trip.departureDate} {trip.departureTime} | xe {trip.busPlate} (còn {trip.availableSeats} ghế)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Select New Seat */}
            {selectedNewTripId && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                  3. Chọn ghế mới{selectedTripDetails ? ` trên chuyến ${selectedTripDetails.departureTime}` : ''}:
                </label>
                {isLoadingChangeSeats ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400 p-3">Đang tải sơ đồ ghế…</div>
                ) : availableSeatsForChange.length === 0 ? (
                  <div className="text-xs text-rose-600 dark:text-rose-400 p-3 bg-rose-50 dark:bg-rose-950/30 rounded border border-rose-200 dark:border-rose-900">
                    Chuyến này không còn ghế trống nào.
                  </div>
                ) : (
                  <div className="grid grid-cols-6 gap-1.5 max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-[#0c162d] rounded-lg border border-slate-200 dark:border-slate-800">
                    {changeSeats.map((seat) => {
                      const isOccupied = !seat.isAvailable;
                      const isSelected = selectedNewSeat === String(seat.seatId);

                      return (
                        <button
                          key={seat.seatId}
                          type="button"
                          disabled={isOccupied}
                          onClick={() => setSelectedNewSeat(String(seat.seatId))}
                          className={`p-2 rounded text-xs font-bold text-center transition-all ${
                            isOccupied
                              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed line-through'
                              : isSelected
                              ? 'bg-institutional-600 text-white ring-2 ring-amber-400 shadow'
                              : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-600 hover:border-institutional-500'
                          }`}
                          title={isOccupied ? `Ghế ${seat.seatCode} đã có người` : `Chọn ghế ${seat.seatCode}`}
                        >
                          {seat.seatCode}
                        </button>
                      );
                    })}
                  </div>
                )}
                {selectedNewSeat && (
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" />
                    Đã chọn ghế mới:{' '}
                    <strong>{changeSeats.find((s) => String(s.seatId) === selectedNewSeat)?.seatCode}</strong>
                  </div>
                )}
              </div>
            )}
            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsChangeModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                disabled={isSubmittingChange}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmChange}
                disabled={isSubmittingChange || !selectedNewTripId || !selectedNewSeat}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-institutional-950 font-bold text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isSubmittingChange ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đổi vé'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 4: HỦY VÉ (Cancel Ticket Modal) */}
      {cancelTicketTarget && (
        <Modal
          isOpen={isCancelModalOpen}
          onClose={() => setIsCancelModalOpen(false)}
          title={`GỬI YÊU CẦU HỦY VÉ — ${cancelTicketTarget.id}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-800 dark:text-red-300">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-4 h-4" />
                Lưu ý khi gửi yêu cầu hủy vé:
              </div>
              {/* Không nêu tỷ lệ hoàn tiền: hệ thống chưa có luồng thanh toán nên vé mới
                  chỉ ở trạng thái giữ chỗ, hủy vé không phát sinh giao dịch hoàn tiền nào. */}
              <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                <li>Chỉ gửi được khi chuyến xe chưa khởi hành.</li>
                <li>
                  Đây là <strong>yêu cầu</strong>: vé {cancelTicketTarget.seatNumber} vẫn còn hiệu
                  lực và ghế chưa bị nhả cho tới khi quản lý duyệt.
                </li>
                <li>Mỗi vé chỉ có một yêu cầu chờ duyệt tại một thời điểm.</li>
                <li>
                  Vé này đang ở trạng thái giữ chỗ và chưa thanh toán, nên hủy vé không phát sinh
                  hoàn tiền.
                </li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Lý do yêu cầu hủy vé: <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Nhập lý do chi tiết (ví dụ: Thay đổi lịch trình công tác, bận việc đột xuất...)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                disabled={isSubmittingCancel}
              >
                Giữ lại vé
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isSubmittingCancel || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isSubmittingCancel ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu hủy vé'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
