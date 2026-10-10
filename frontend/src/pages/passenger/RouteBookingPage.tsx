import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Calendar,
  Search,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  QrCode,
  ArrowLeft,
  Armchair,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { PaymentMethod, ValidateVoucherResult } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';
import { ApiError } from '../../api/client';
import { listRouteStops, listRoutes, RouteDto, RouteStopDto } from '../../api/routeManagement';
import { confirmBooking, getTripSeats, searchTrips, TripDto, TripSeatDto } from '../../api/booking';
import { voucherApi } from '../../api/voucherApi';
import { payBooking, PaymentMethodCode, PaymentDto } from '../../api/payments';

const PAYMENT_METHOD_CODE: Record<string, PaymentMethodCode> = {
  MOMO: PaymentMethodCode.Momo,
  VNPAY: PaymentMethodCode.VnPay,
  ZALOPAY: PaymentMethodCode.ZaloPay,
  BANK_TRANSFER: PaymentMethodCode.BankTransfer,
};

export const RouteBookingPage: React.FC = () => {
  const { currentUser } = useAuth();
  const { success, error, warning, info } = useToast();
  const navigate = useNavigate();

  // Dữ liệu tuyến và trạm lấy từ API thật (SCRUM-54): cần StopId để gửi điểm lên/xuống
  // khi xác nhận đặt vé, mà dữ liệu mẫu cũ chỉ có tên trạm.
  const [routes, setRoutes] = useState<RouteDto[]>([]);
  const [routeStops, setRouteStops] = useState<Map<number, RouteStopDto[]>>(new Map());
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Kết quả tra cứu chuyến, chỉ có sau khi bấm "Tra cứu": backend bắt buộc đủ
  // from + to + date nên không thể lọc trực tiếp như bản dùng dữ liệu mẫu.
  const [trips, setTrips] = useState<TripDto[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Maximum seats allowed per booking
  const MAX_SEATS_PER_BOOKING = 4;
  const todayString = new Date().toISOString().split('T')[0];

  // Booking Flow Steps: 1: SEARCH, 2: SEATS, 3: PAYMENT, 4: SUCCESS
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Search Filters
  const [departurePoint, setDeparturePoint] = useState<string>('ALL');
  const [destinationPoint, setDestinationPoint] = useState<string>('ALL');
  const [travelDate, setTravelDate] = useState<string>(todayString);
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('ALL');

  // Selected Trip & Seats (hỗ trợ chọn và bỏ chọn nhiều ghế, tối đa 4 ghế)
  const [selectedTrip, setSelectedTrip] = useState<TripDto | null>(null);
  // Sơ đồ ghế thật của chuyến; ghế gửi lên backend là SeatId nên phải giữ số, không giữ mã ghế.
  const [seats, setSeats] = useState<TripSeatDto[]>([]);
  const [isLoadingSeats, setIsLoadingSeats] = useState(false);
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([]);

  // Passenger Type & Fare Calculation (Requirement 10)
  const [passengerType, setPassengerType] = useState<'REGULAR' | 'STUDENT' | 'ELDERLY_DISABLED'>('REGULAR');

  // Passenger Contact Form
  const [passengerName, setPassengerName] = useState(currentUser?.fullName || '');
  const [passengerEmail, setPassengerEmail] = useState(currentUser?.email || '');
  const [passengerPhone, setPassengerPhone] = useState(currentUser?.phone || '');

  /** Mã đối tượng hành khách của backend tương ứng lựa chọn trên giao diện. */
  const passengerTypeCode =
    passengerType === 'STUDENT' ? 'STUDENT' : passengerType === 'ELDERLY_DISABLED' ? 'ELDERLY' : 'STANDARD';

  // Mã ghế để hiển thị, suy ra từ SeatId đang chọn.
  const selectedSeatCodes = useMemo(
    () => selectedSeatIds.map((id) => seats.find((s) => s.seatId === id)?.seatCode ?? String(id)),
    [selectedSeatIds, seats]
  );

  // Giá đơn vị do backend tính sẵn cho từng đối tượng (SCRUM-55), không tự nhân giảm giá ở client.
  const currentUnitPrice = useMemo(() => {
    if (!selectedTrip) return 0;
    const matched = selectedTrip.prices.find((p) => p.passengerTypeCode === passengerTypeCode);
    return matched ? matched.price : selectedTrip.price;
  }, [selectedTrip, passengerTypeCode]);

  const totalCalculatedAmount = useMemo(() => {
    return currentUnitPrice * selectedSeatIds.length;
  }, [currentUnitPrice, selectedSeatIds]);


  // Payment Selection
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MOMO');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState<string>('');
  // Kết quả thanh toán sau khi giữ chỗ; null nghĩa là vẫn chưa thanh toán.
  const [paidInfo, setPaidInfo] = useState<PaymentDto | null>(null);
  /** Số tiền do máy chủ chốt khi đặt vé, có thể khác số hiển thị lúc chọn ghế. */
  const [serverFinalAmount, setServerFinalAmount] = useState<number | null>(null);

  // Voucher & Discount (SCRUM-66 & SCRUM-67)
  const [voucherCodeInput, setVoucherCodeInput] = useState('');
  const [appliedVoucher, setAppliedVoucher] = useState<ValidateVoucherResult | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  const voucherDiscount = appliedVoucher?.discountAmount ?? 0;
  const finalCalculatedAmount = Math.max(0, totalCalculatedAmount - voucherDiscount);

  const handleApplyVoucher = async () => {
    const code = voucherCodeInput.trim();
    if (!code) {
      warning('Vui lòng nhập mã giảm giá.');
      return;
    }
    setIsValidatingVoucher(true);
    try {
      const res = await voucherApi.validateVoucher(code, totalCalculatedAmount);
      if (res.isValid) {
        setAppliedVoucher(res);
        success(res.message);
      } else {
        setAppliedVoucher(null);
        error(res.message);
      }
    } catch (err) {
      setAppliedVoucher(null);
      error(err instanceof ApiError ? err.message : 'Không kiểm tra được mã giảm giá.');
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCodeInput('');
    info('Đã hủy áp dụng mã giảm giá.');
  };

  // Nạp tuyến và trạm của từng tuyến một lần khi vào trang.
  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const routeList = await listRoutes(controller.signal);
        const stopLists = await Promise.all(
          routeList.map(async (route) => [route.id, await listRouteStops(route.id, controller.signal)] as const)
        );
        if (controller.signal.aborted) return;
        setRoutes(routeList);
        setRouteStops(new Map(stopLists));
        setLoadError('');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setLoadError(err instanceof ApiError ? err.message : 'Không tải được danh sách tuyến và trạm dừng.');
      } finally {
        if (!controller.signal.aborted) setIsLoadingRoutes(false);
      }
    };

    void load();
    return () => controller.abort();
  }, []);

  // Danh sách tên trạm của từng tuyến theo thứ tự chạy, lấy từ API nên khớp StopOrder thật.
  const routeStopNames = useMemo(() => {
    const map = new Map<number, string[]>();
    routes.forEach((route) => {
      const stopsOfRoute = [...(routeStops.get(route.id) ?? [])].sort((a, b) => a.stopOrder - b.stopOrder);
      map.set(route.id, stopsOfRoute.map((s) => s.stopName));
    });
    return map;
  }, [routes, routeStops]);

  /** Tra StopId theo tên trạm trong một tuyến; cần cho boardStopId/alightStopId khi đặt vé. */
  const findStopId = useCallback(
    (routeId: number, stopName: string): number | undefined =>
      (routeStops.get(routeId) ?? []).find((s) => s.stopName === stopName)?.stopId,
    [routeStops]
  );

  // Mọi trạm có trên các tuyến, dùng cho cả ô điểm đi và điểm đến
  const allStopNames = useMemo(() => {
    const list = new Set<string>();
    routeStopNames.forEach((names) => names.forEach((n) => list.add(n)));
    return Array.from(list);
  }, [routeStopNames]);

  // Validation: Xử lý ngoại lệ chọn sai thứ tự trạm hoặc trùng trạm
  const stopOrderValidation = useMemo(() => {
    if (departurePoint === 'ALL' || destinationPoint === 'ALL') {
      return { isValid: true, message: '' };
    }
    // Trùng điểm đi và điểm đến
    if (departurePoint === destinationPoint) {
      return {
        isValid: false,
        message: 'Điểm đi và điểm đến không được trùng nhau! Vui lòng chọn điểm đến khác.',
      };
    }

    // Sai thứ tự: có tuyến đi qua cả hai trạm nhưng không tuyến nào đi theo chiều điểm đi → điểm đến
    const routesWithBoth = routes.filter((route) => {
      const names = routeStopNames.get(route.id) ?? [];
      return names.includes(departurePoint) && names.includes(destinationPoint);
    });
    const hasValidRoute = routesWithBoth.some((route) => {
      const names = routeStopNames.get(route.id) ?? [];
      return names.indexOf(departurePoint) < names.indexOf(destinationPoint);
    });
    if (routesWithBoth.length > 0 && !hasValidRoute) {
      return {
        isValid: false,
        message: `Thứ tự trạm không hợp lệ: Trạm lên xe "${departurePoint}" phải nằm trước trạm xuống xe "${destinationPoint}" theo lộ trình tuyến ${routesWithBoth[0].code}!`,
      };
    }

    return { isValid: true, message: '' };
  }, [departurePoint, destinationPoint, routes, routeStopNames]);

  // Handle date change with validation for past date
  const handleDateChange = (newDate: string) => {
    if (newDate && newDate < todayString) {
      warning('Không thể chọn ngày trong quá khứ! Hệ thống đã tự động chuyển về ngày hôm nay.');
      setTravelDate(todayString);
      return;
    }
    setTravelDate(newDate);
  };

  // Backend tự lọc theo tuyến, điểm đi/đến và ngày nên không lọc lại ở client.
  const availableTrips = trips;

  /** Backend bắt buộc đủ from + to + date, nên phải chọn đủ mới tra cứu được. */
  const canSearch =
    stopOrderValidation.isValid && departurePoint !== 'ALL' && destinationPoint !== 'ALL' && !!travelDate;

  // Step 1: Tra cứu chuyến bằng API thật (SCRUM-54/55)
  const handleSearch = async () => {
    if (!canSearch) {
      warning('Vui lòng chọn điểm đi, điểm đến và ngày khởi hành trước khi tra cứu.');
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchTrips({
        from: departurePoint,
        to: destinationPoint,
        date: travelDate,
        routeId: selectedRouteFilter === 'ALL' ? undefined : Number(selectedRouteFilter),
      });
      setTrips(result);
      setHasSearched(true);
      if (result.length === 0) {
        info('Không tìm thấy chuyến xe nào khớp điều kiện tra cứu.');
      }
    } catch (err) {
      setTrips([]);
      setHasSearched(true);
      error(err instanceof ApiError ? err.message : 'Không tra cứu được chuyến xe.');
    } finally {
      setIsSearching(false);
    }
  };

  /** Nạp sơ đồ ghế thật của chuyến; gọi lại được để làm mới sau khi ghế bị người khác giữ. */
  const loadSeats = useCallback(
    async (tripId: number) => {
      setIsLoadingSeats(true);
      try {
        const seatMap = await getTripSeats(tripId);
        setSeats(seatMap);
        if (seatMap.length === 0) {
          warning('Chuyến xe này chưa được gán xe nên chưa có sơ đồ ghế.');
        }
      } catch (err) {
        setSeats([]);
        error(err instanceof ApiError ? err.message : 'Không tải được sơ đồ ghế của chuyến.');
      } finally {
        setIsLoadingSeats(false);
      }
    },
    [error, warning]
  );

  // Step 1: Handle trip selection ("Đặt vé")
  const handleSelectTrip = (trip: TripDto) => {
    setSelectedTrip(trip);
    setSelectedSeatIds([]);
    setCurrentStep(2);
    void loadSeats(trip.id);
  };

  // Step 2: Handle seat selection & deselection (Toggle + Limit)
  const handleSeatClick = (seat: TripSeatDto) => {
    if (!selectedTrip) return;
    if (!seat.isAvailable) {
      warning(`Ghế ${seat.seatCode} đã được đặt trước bởi hành khách khác.`);
      return;
    }

    if (selectedSeatIds.includes(seat.seatId)) {
      // BỎ CHỌN GHẾ
      setSelectedSeatIds((prev) => prev.filter((id) => id !== seat.seatId));
      info(`Đã hủy chọn ghế ${seat.seatCode}`);
    } else {
      // GIỚI HẠN SỐ GHẾ MỖI LẦN ĐẶT (Tối đa 4 ghế)
      if (selectedSeatIds.length >= MAX_SEATS_PER_BOOKING) {
        warning(`Mỗi lần đặt vé chỉ được chọn tối đa ${MAX_SEATS_PER_BOOKING} ghế theo quy định.`);
        return;
      }
      // CHỌN THÊM GHẾ
      setSelectedSeatIds((prev) => [...prev, seat.seatId]);
    }
  };

  const handleProceedToPayment = () => {
    if (selectedSeatIds.length === 0) {
      error('Vui lòng chọn ít nhất 1 vị trí ghế ngồi trước khi tiếp tục.');
      return;
    }
    if (!passengerName.trim() || !passengerPhone.trim()) {
      error('Vui lòng nhập tên và số điện thoại liên hệ của hành khách.');
      return;
    }
    setCurrentStep(3);
  };

  // Step 3: Xác nhận đặt vé thật (SCRUM-62), sau đó mô phỏng thanh toán.
  //
  // Backend chỉ GIỮ CHỖ trong 10 phút và để booking ở trạng thái Pending: hệ thống
  // chưa có endpoint thanh toán, nên bước trả tiền vẫn là mô phỏng như trước.
  const handlePayNow = async () => {
    if (!selectedTrip || selectedSeatIds.length === 0) return;

    const boardStopId = findStopId(selectedTrip.routeId, departurePoint);
    const alightStopId = findStopId(selectedTrip.routeId, destinationPoint);

    if (!boardStopId || !alightStopId) {
      error('Không xác định được điểm lên hoặc điểm xuống trên tuyến của chuyến này.');
      return;
    }

    setIsProcessingPayment(true);

    try {
      const booking = await confirmBooking({
        tripId: selectedTrip.id,
        seatIds: selectedSeatIds,
        boardStopId,
        alightStopId,
        voucherCode: appliedVoucher?.voucher?.code || undefined,
      });

      // Số tiền hiển thị lấy theo máy chủ: backend tính theo hồ sơ đối tượng ưu đãi đã
      // được duyệt của tài khoản, không theo đối tượng chọn trên giao diện.
      setServerFinalAmount(booking.finalAmount);
      setCreatedTicketId(booking.bookingCode);
      success(
        `Đã giữ ${booking.totalSeats} ghế (${booking.bookedSeats.join(', ')}) — ${booking.finalAmount.toLocaleString('vi-VN')} VNĐ. Mã đặt chỗ ${booking.bookingCode}.`
      );
      if (booking.finalAmount !== finalCalculatedAmount) {
        info(
          `Máy chủ chốt ${booking.finalAmount.toLocaleString('vi-VN')} VNĐ theo đối tượng ưu đãi và mã giảm giá của tài khoản.`
        );
      }
      // Thanh toán ngay sau khi giữ chỗ. Nếu lỗi thì ghế vẫn được giữ 10 phút để khách trả lại ở mục Vé điện tử.
      try {
        const payment = await payBooking(booking.bookingId, PAYMENT_METHOD_CODE[paymentMethod]);
        setPaidInfo(payment);
        success(`Đã thanh toán ${payment.amount.toLocaleString('vi-VN')} VNĐ. Hóa đơn ${payment.invoiceNo ?? ''}.`);
      } catch (payErr) {
        setPaidInfo(null);
        error(
          `${payErr instanceof ApiError ? payErr.message : 'Thanh toán không thành công.'} Ghế vẫn được giữ trong 10 phút, bạn có thể thanh toán lại ở mục Vé điện tử.`
        );
      }
      setCurrentStep(4);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Không xác nhận được đặt vé.';
      error(message);
      // 409 nghĩa là ghế vừa bị người khác giữ: tải lại sơ đồ để khách thấy trạng thái mới.
      if (err instanceof ApiError && err.status === 409) {
        setSelectedSeatIds([]);
        setCurrentStep(2);
        await loadSeats(selectedTrip.id);
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const resetFlow = () => {
    setSelectedTrip(null);
    setSeats([]);
    setSelectedSeatIds([]);
    setCurrentStep(1);
    setCreatedTicketId('');
    setPaidInfo(null);
    setServerFinalAmount(null);
    setAppliedVoucher(null);
    setVoucherCodeInput('');
  };

  const handleResetSearch = () => {
    setDeparturePoint('ALL');
    setDestinationPoint('ALL');
    setTravelDate(todayString);
    setSelectedRouteFilter('ALL');
    setTrips([]);
    setHasSearched(false);
  };

  // Sơ đồ ghế dựng theo Row/Column thật của xe, không cố định A-F x 1-4 như bản dữ liệu mẫu:
  // số ghế mỗi xe lấy từ Capacity nên hàng cuối có thể không đủ ghế.
  const seatRows = useMemo(() => {
    const grouped = new Map<number, TripSeatDto[]>();
    seats.forEach((seat) => {
      const row = grouped.get(seat.row) ?? [];
      row.push(seat);
      grouped.set(seat.row, row);
    });
    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([row, list]) => ({ row, seats: [...list].sort((a, b) => a.column - b.column) }));
  }, [seats]);

  const selectedRouteObj = routes.find((r) => r.id === selectedTrip?.routeId);

  return (
    <div className="space-y-6">
      
      {/* 1. Page Header */}
      <PageHeader
        title="Tìm Tuyến Xe & Đặt Vé Trực Tuyến"
        subtitle="Hệ thống bán vé xe buýt điện tử: Tra cứu lịch chạy, chọn sơ đồ ghế ngồi trực quan và thanh toán qua ví MoMo, VNPAY, ZaloPay hoặc Ngân hàng."
        breadcrumbs={[
          { label: 'Trang chủ', href: '/' },
          { label: 'Hành khách' },
          { label: 'Tìm & Đặt vé' },
        ]}
        icon={<Compass className="w-5 h-5 text-sky-500" />}
      />

      {/* Không tải được tuyến/trạm thì mọi bước sau đều không dùng được, nên báo ngay */}
      {loadError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{loadError}</span>
        </div>
      )}

      {/* 2. Step Progress Bar */}
      <div className="bg-white dark:bg-[#131e3a] p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          
          <div
            className={`flex items-center justify-center gap-2 p-2 rounded-lg font-bold transition-colors ${
              currentStep === 1
                ? 'bg-institutional-700 text-white shadow-sm'
                : currentStep > 1
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                : 'text-slate-400 bg-slate-50 dark:bg-slate-800/40'
            }`}
          >
            <span>1. Tìm tuyến xe</span>
          </div>

          <div
            className={`flex items-center justify-center gap-2 p-2 rounded-lg font-bold transition-colors ${
              currentStep === 2
                ? 'bg-institutional-700 text-white shadow-sm'
                : currentStep > 2
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                : 'text-slate-400 bg-slate-50 dark:bg-slate-800/40'
            }`}
          >
            <span>2. Chọn chỗ ngồi</span>
          </div>

          <div
            className={`flex items-center justify-center gap-2 p-2 rounded-lg font-bold transition-colors ${
              currentStep === 3
                ? 'bg-institutional-700 text-white shadow-sm'
                : currentStep > 3
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                : 'text-slate-400 bg-slate-50 dark:bg-slate-800/40'
            }`}
          >
            <span>3. Thanh toán</span>
          </div>

          <div
            className={`flex items-center justify-center gap-2 p-2 rounded-lg font-bold transition-colors ${
              currentStep === 4
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 bg-slate-50 dark:bg-slate-800/40'
            }`}
          >
            <span>4. Vé điện tử</span>
          </div>

        </div>
      </div>

      {/* ==============================================================
          STEP 1: FIND ROUTE AND BUS TRIPS
      ============================================================== */}
      {currentStep === 1 && (
        <div className="space-y-6">
          {/* Search Box */}
          <div className="bg-white dark:bg-[#131e3a] p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-institutional-900 dark:text-sky-300">
                Bộ lọc tìm kiếm tuyến xe buýt:
              </h3>
              <span className="text-[11px] text-slate-400">
                * Chọn điểm đi, điểm đến và ngày khởi hành để tra cứu các chuyến xe phù hợp
              </span>
            </div>

            {/* Validation Banner: Cảnh báo ngoại lệ chọn sai thứ tự trạm hoặc trùng trạm */}
            {!stopOrderValidation.isValid && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-center gap-2.5 text-rose-700 dark:text-rose-300 animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span className="font-semibold text-xs">{stopOrderValidation.message}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Điểm đi */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Điểm đi (Bến khởi hành)
                </label>
                <select
                  value={departurePoint}
                  onChange={(e) => setDeparturePoint(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded border bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                    !stopOrderValidation.isValid
                      ? 'border-rose-400 focus:ring-rose-500'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-institutional-500'
                  }`}
                >
                  <option value="ALL">-- Tất cả điểm đi --</option>
                  {allStopNames.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Điểm đến */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Điểm đến (Bến kết thúc)
                </label>
                <select
                  value={destinationPoint}
                  onChange={(e) => setDestinationPoint(e.target.value)}
                  className={`w-full px-3 py-2 text-xs rounded border bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                    !stopOrderValidation.isValid
                      ? 'border-rose-400 focus:ring-rose-500'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-institutional-500'
                  }`}
                >
                  <option value="ALL">-- Tất cả điểm đến --</option>
                  {allStopNames.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ngày đi - Xử lý ngoại lệ không cho chọn ngày trong quá khứ */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Ngày khởi hành (Từ hôm nay)
                </label>
                <input
                  type="date"
                  value={travelDate}
                  min={todayString}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500 font-mono"
                />
              </div>

              {/* Tuyến xe */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Mã tuyến cụ thể
                </label>
                <select
                  value={selectedRouteFilter}
                  onChange={(e) => setSelectedRouteFilter(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
                >
                  <option value="ALL">-- Tất cả các tuyến --</option>
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code}: {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleResetSearch}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1.5 font-medium"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Đặt lại bộ lọc mặc định</span>
              </button>

              <button
                type="button"
                onClick={handleSearch}
                disabled={!canSearch || isSearching || isLoadingRoutes}
                className="flex items-center gap-2 px-5 py-2 rounded bg-institutional-700 hover:bg-institutional-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>{isSearching ? 'Đang tra cứu…' : 'Tra Cứu Chuyến Xe'}</span>
              </button>
            </div>
          </div>

          {/* Results List */}
          <div className="bg-white dark:bg-[#131e3a] rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1e2f57] flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Kết quả tìm kiếm: <span className="text-institutional-700 dark:text-sky-400 font-extrabold">{availableTrips.length} chuyến xe</span>
              </div>
              <span className="text-[11px] text-slate-400">
                * Nhấn "Đặt vé" trên chuyến xe mong muốn để chọn chỗ ngồi
              </span>
            </div>

            {availableTrips.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {!stopOrderValidation.isValid
                    ? stopOrderValidation.message
                    : !hasSearched
                    ? 'Chọn điểm đi, điểm đến và ngày rồi nhấn "Tra cứu chuyến xe"'
                    : 'Không tìm thấy chuyến xe nào phù hợp'}
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {!stopOrderValidation.isValid
                    ? 'Vui lòng chọn lại điểm đi và điểm đến hợp lệ để hệ thống hiển thị danh sách các chuyến xe.'
                    : !hasSearched
                    ? 'Hệ thống tra cứu chuyến trực tiếp từ máy chủ, nên cần đủ cả điểm đi, điểm đến và ngày khởi hành.'
                    : `Không có chuyến xe nào chạy từ bến "${departurePoint}" đến bến "${destinationPoint}" vào ngày ${travelDate}. Hãy thử đổi ngày khởi hành hoặc chọn tuyến khác.`}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleResetSearch}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Đặt lại bộ lọc tìm kiếm</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#0c162d] border-b border-slate-200 dark:border-[#1e2f57] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="px-4 py-3">Mã chuyến</th>
                      <th className="px-4 py-3">Tuyến đường</th>
                      <th className="px-4 py-3">Điểm đi ⇄ Điểm đến</th>
                      <th className="px-4 py-3">Giờ chạy</th>
                      <th className="px-4 py-3">Giờ đến dự kiến</th>
                      <th className="px-4 py-3">Giá vé</th>
                      <th className="px-4 py-3 text-center">Chỗ trống</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3 text-center">Hành động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#19274c]">
                    {availableTrips.map((trip) => {
                      const route = routes.find((r) => r.id === trip.routeId);
                      const remainingSeats = trip.totalSeats - trip.bookedSeats.length;

                      return (
                        <tr
                          key={trip.id}
                          className="hover:bg-blue-50/50 dark:hover:bg-[#1a2b53]/50 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {trip.id}
                          </td>
                          <td className="px-4 py-3 font-semibold text-institutional-700 dark:text-sky-400">
                            {route?.code || trip.routeId}
                          </td>
                          <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                            <div className="font-medium">{route?.startPoint}</div>
                            <div className="text-[10px] text-slate-400">đến {route?.endPoint}</div>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                            {trip.departureTime}
                            <div className="text-[10px] text-slate-400 font-normal">{trip.departureDate}</div>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-300">
                            {trip.estimatedArrivalTime}
                          </td>
                          <td className="px-4 py-3 font-mono font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                            {trip.price.toLocaleString('vi-VN')} VNĐ
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-xs ${
                                remainingSeats <= 3
                                  ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300'
                                  : 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300'
                              }`}
                            >
                              {remainingSeats} / {trip.totalSeats}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="tripStatus" value={trip.status} size="sm" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {/* Separate "Đặt vé" Action Button */}
                            <button
                              type="button"
                              onClick={() => handleSelectTrip(trip)}
                              disabled={remainingSeats === 0 || trip.status === 'CANCELLED'}
                              className="px-3.5 py-1.5 rounded bg-institutional-700 hover:bg-institutional-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-colors whitespace-nowrap"
                            >
                              Đặt vé
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==============================================================
          STEP 2: SELECT SEAT (SƠ ĐỒ CHỖ NGỒI XE BUÝT)
      ============================================================== */}
      {currentStep === 2 && selectedTrip && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Visual Bus Seat Layout */}
          <div className="lg:col-span-2 bg-white dark:bg-[#131e3a] p-6 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-institutional-900 dark:text-sky-300">
                  Sơ Đồ Chỗ Ngồi Xe Buýt ({selectedTrip.busPlate})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Tuyến: {selectedRouteObj?.name} • Khởi hành lúc: {selectedTrip.departureTime} ({selectedTrip.departureDate})
                </p>
              </div>
              <Badge variant="tripStatus" value={selectedTrip.status} />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs p-3 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600" />
                <span className="text-slate-600 dark:text-slate-300">Ghế trống (Nhấp để chọn)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-amber-400 border-2 border-amber-600" />
                <span className="text-slate-900 dark:text-white font-bold">
                  Đang chọn ({selectedSeatIds.length}/{MAX_SEATS_PER_BOOKING})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-rose-500 border-2 border-rose-700" />
                <span className="text-slate-600 dark:text-slate-300">Đã bán</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-slate-300 dark:bg-slate-700 border-2 border-slate-400" />
                <span className="text-slate-600 dark:text-slate-300">Không khả dụng</span>
              </div>
            </div>

            {/* Bus Shell Container */}
            <div className="max-w-md mx-auto p-6 rounded-3xl bg-slate-100 dark:bg-[#0c162d] border-4 border-slate-300 dark:border-[#223561] shadow-inner space-y-4">
              
              {/* Front of Bus (Windshield & Driver) */}
              <div className="flex items-center justify-between pb-3 border-b-2 border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-400">
                <span className="flex items-center gap-1 text-slate-500 dark:text-slate-300">
                  <Armchair className="w-4 h-4 text-slate-500" />
                  Vị trí tài xế
                </span>
                <span className="uppercase tracking-wider">Cửa lên xe →</span>
              </div>

              {/* Sơ đồ ghế thật của xe: mỗi hàng chia đôi, chèn lối đi ở giữa */}
              {isLoadingSeats ? (
                <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  Đang tải sơ đồ ghế…
                </div>
              ) : seatRows.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  Chuyến xe này chưa được gán xe nên chưa có sơ đồ ghế.
                </div>
              ) : (
                <div className="space-y-3">
                  {seatRows.map(({ row, seats: rowSeats }) => {
                    // Chia đôi theo số ghế thật của hàng để lối đi luôn nằm giữa,
                    // kể cả xe có 3 hoặc 5 ghế một hàng.
                    const half = Math.ceil(rowSeats.length / 2);
                    const sides = [rowSeats.slice(0, half), rowSeats.slice(half)];

                    return (
                      <div key={row} className="flex items-center justify-between gap-4">
                        {sides.map((side, sideIndex) => (
                          <React.Fragment key={sideIndex}>
                            <div className="flex items-center gap-2">
                              {side.map((seat) => {
                                const isBooked = !seat.isAvailable;
                                const isSelected = selectedSeatIds.includes(seat.seatId);

                                return (
                                  <button
                                    key={seat.seatId}
                                    type="button"
                                    disabled={isBooked}
                                    onClick={() => handleSeatClick(seat)}
                                    className={`w-12 h-12 rounded-lg font-bold text-xs flex flex-col items-center justify-center transition-all ${
                                      isSelected
                                        ? 'bg-amber-400 text-institutional-950 font-black ring-4 ring-amber-300 shadow-md transform scale-105'
                                        : isBooked
                                        ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-900 cursor-not-allowed opacity-70'
                                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 hover:border-institutional-500 hover:bg-blue-50 dark:hover:bg-slate-700'
                                    }`}
                                    title={
                                      isSelected
                                        ? `Nhấp để hủy chọn ghế ${seat.seatCode}`
                                        : isBooked
                                        ? `Ghế ${seat.seatCode} đã đặt`
                                        : `Chọn ghế ${seat.seatCode} (${currentUnitPrice.toLocaleString('vi-VN')} đ)`
                                    }
                                  >
                                    <Armchair className="w-3.5 h-3.5" />
                                    <span>{seat.seatCode}</span>
                                  </button>
                                );
                              })}
                            </div>

                            {/* Lối đi, chỉ chèn một lần giữa hai bên */}
                            {sideIndex === 0 && (
                              <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                                Lối đi
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Rear of Bus */}
              <div className="text-center pt-2 border-t-2 border-dashed border-slate-300 dark:border-slate-700 text-[10px] uppercase font-bold text-slate-400">
                Đuôi xe buýt
              </div>
            </div>
          </div>

          {/* Booking Summary Panel on Right */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-[#131e3a] p-5 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-4 text-xs">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
                <h4 className="font-bold uppercase tracking-wider text-institutional-900 dark:text-sky-300">
                  Tóm Tắt Đặt Vé
                </h4>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tuyến đường:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedRouteObj?.code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lộ trình:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200 text-right max-w-[160px]">
                    {selectedRouteObj?.startPoint} ⇄ {selectedRouteObj?.endPoint}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Ngày khởi hành:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedTrip.departureDate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Giờ xuất bến:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedTrip.departureTime}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Biển số xe buýt:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedTrip.busPlate}
                  </span>
                </div>

                {/* Danh sách ghế đã chọn & nút xóa từng ghế */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-700 dark:text-slate-300 font-bold">Ghế đã chọn:</span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {selectedSeatIds.length} / {MAX_SEATS_PER_BOOKING} ghế tối đa
                    </span>
                  </div>

                  {selectedSeatIds.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSeatIds.map((seatId) => {
                        const seat = seats.find((s) => s.seatId === seatId);
                        if (!seat) return null;

                        return (
                          <span
                            key={seat.seatId}
                            className="inline-flex items-center gap-1 text-xs font-black text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/80 px-2.5 py-1 rounded-md border border-amber-300 dark:border-amber-700"
                          >
                            {seat.seatCode}
                            <button
                              type="button"
                              onClick={() => handleSeatClick(seat)}
                              className="text-amber-700 hover:text-rose-600 font-bold ml-1 text-sm leading-none"
                              title={`Bỏ chọn ghế ${seat.seatCode}`}
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 italic">
                      Chưa chọn ghế nào (Nhấp vào ghế trống để chọn)
                    </div>
                  )}
                </div>

                {/* Lựa chọn loại đối tượng hành khách (Requirement 10) */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold">
                    Loại đối tượng hành khách:
                  </label>
                  <select
                    value={passengerType}
                    onChange={(e) => setPassengerType(e.target.value as 'REGULAR' | 'STUDENT' | 'ELDERLY_DISABLED')}
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] font-semibold text-slate-800 dark:text-slate-100"
                  >
                    <option value="REGULAR">Vé phổ thông (Toàn tuyến)</option>
                    <option value="STUDENT">Học sinh / Sinh viên (Trợ giá đặc biệt)</option>
                    <option value="ELDERLY_DISABLED">Người cao tuổi / Khuyết tật (Miễn phí)</option>
                  </select>
                  {passengerType === 'STUDENT' && (
                    <p className="text-[10px] text-amber-600 dark:text-amber-400">
                      * Trợ giá vé: Vui lòng xuất trình thẻ HSSV hợp lệ khi lên xe.
                    </p>
                  )}
                  {passengerType === 'ELDERLY_DISABLED' && (
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      * Miễn phí 100% vé xe theo chính sách an sinh giao thông công cộng.
                    </p>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-700 dark:text-slate-300 font-bold">Đơn giá vé theo đối tượng:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {currentUnitPrice === 0 ? 'MIỄN PHÍ (0 VNĐ)' : `${currentUnitPrice.toLocaleString('vi-VN')} VNĐ / vé`}
                  </span>
                </div>

                {/* Tổng tiền tạm tính */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-900 dark:text-white uppercase">Tổng tiền tạm tính:</span>
                  <div className="text-right">
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                      {totalCalculatedAmount === 0 ? '0 VNĐ (Miễn phí)' : `${totalCalculatedAmount.toLocaleString('vi-VN')} VNĐ`}
                    </span>
                    {selectedSeatIds.length > 0 && (
                      <div className="text-[10px] text-slate-400 font-normal">
                        ({currentUnitPrice.toLocaleString('vi-VN')} đ × {selectedSeatIds.length} ghế)
                      </div>
                    )}
                  </div>
                </div>
              </div>


              {/* Passenger contact information */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-500">
                  Thông tin hành khách đi xe:
                </span>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">Họ và tên *</label>
                  <input
                    type="text"
                    value={passengerName}
                    onChange={(e) => setPassengerName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">Số điện thoại *</label>
                  <input
                    type="text"
                    value={passengerPhone}
                    onChange={(e) => setPassengerPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-0.5">Email nhận vé</label>
                  <input
                    type="email"
                    value={passengerEmail}
                    onChange={(e) => setPassengerEmail(e.target.value)}
                    placeholder="passenger@bus.com"
                    className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d]"
                  />
                </div>
              </div>

              {/* Action Buttons: "Quay lại" and "Tiếp tục" */}
              <div className="pt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex items-center gap-1 px-3 py-2 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Quay lại</span>
                </button>

                <button
                  type="button"
                  onClick={handleProceedToPayment}
                  disabled={selectedSeatIds.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 rounded bg-institutional-700 hover:bg-institutional-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
                >
                  <span>Tiếp tục thanh toán ({selectedSeatIds.length} ghế)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ==============================================================
          STEP 3: PAYMENT METHOD & CONFIRMATION
      ============================================================== */}
      {currentStep === 3 && selectedTrip && selectedSeatIds.length > 0 && (
        <div className="max-w-2xl mx-auto bg-white dark:bg-[#131e3a] p-6 rounded-xl border border-slate-200 dark:border-[#1e2f57] shadow-sm space-y-6 text-xs">
          
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-institutional-900 dark:text-sky-300">
              Chọn Phương Thức Thanh Toán Điện Tử
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Cổng thanh toán điện tử mô phỏng cho vé xe buýt thông minh
            </p>
          </div>

          {/* Order Summary Recap */}
          <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex justify-between font-bold text-slate-900 dark:text-white">
              <span>Hành khách:</span>
              <span>{passengerName} ({passengerPhone})</span>
            </div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300">
              <span>Tuyến & Giờ chạy:</span>
              <span>{selectedRouteObj?.code} • {selectedTrip.departureTime} ({selectedTrip.departureDate})</span>
            </div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300">
              <span>Đối tượng hành khách:</span>
              <span className="font-bold text-institutional-600 dark:text-sky-300">
                {passengerType === 'REGULAR'
                  ? 'Vé phổ thông (100%)'
                  : passengerType === 'STUDENT'
                  ? 'Học sinh / Sinh viên (Trợ giá)'
                  : 'Người cao tuổi / Khuyết tật (Miễn phí 100%)'}
              </span>
            </div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300">
              <span>Vị trí ghế đã chọn:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {selectedSeatCodes.join(', ')} ({selectedSeatIds.length} ghế)
              </span>
            </div>
            <div className="flex justify-between text-slate-700 dark:text-slate-300">
              <span>Tạm tính cước vé:</span>
              <span className="font-semibold font-mono">
                {totalCalculatedAmount === 0 ? '0 VNĐ' : `${totalCalculatedAmount.toLocaleString('vi-VN')} VNĐ`}
              </span>
            </div>
            {appliedVoucher && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                <span>Voucher giảm giá ({appliedVoucher.voucher?.code}):</span>
                <span className="font-mono">-{voucherDiscount.toLocaleString('vi-VN')} VNĐ</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm font-bold text-emerald-600 dark:text-emerald-400">
              <span>Tổng số tiền cần thanh toán:</span>
              <span className="text-base font-black font-mono">
                {finalCalculatedAmount === 0 ? '0 VNĐ (Miễn phí)' : `${finalCalculatedAmount.toLocaleString('vi-VN')} VNĐ`}
              </span>
            </div>
          </div>

          {/* Mã giảm giá / Voucher Section (SCRUM-66 & SCRUM-67) */}
          <div className="p-4 rounded-xl border border-sky-100 dark:border-sky-900/40 bg-gradient-to-r from-sky-50/50 to-indigo-50/40 dark:from-sky-950/20 dark:to-indigo-950/20 space-y-3">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Mã giảm giá (Voucher)
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={voucherCodeInput}
                onChange={(e) => setVoucherCodeInput(e.target.value.toUpperCase())}
                placeholder="Nhập mã voucher (VD: HE2026, CHAOHEXANH...)"
                disabled={Boolean(appliedVoucher) || isValidatingVoucher}
                className="flex-1 px-3 py-2 text-xs uppercase font-mono font-bold tracking-wider rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-60"
              />
              {appliedVoucher ? (
                <button
                  type="button"
                  onClick={handleRemoveVoucher}
                  className="px-3.5 py-2 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 transition-colors"
                >
                  Hủy áp dụng
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleApplyVoucher}
                  disabled={isValidatingVoucher || !voucherCodeInput.trim()}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  {isValidatingVoucher ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    <span>Áp dụng</span>
                  )}
                </button>
              )}
            </div>

            {appliedVoucher && (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Đã áp dụng mã <strong>{appliedVoucher.voucher?.code}</strong>: giảm{' '}
                    <strong>{voucherDiscount.toLocaleString('vi-VN')} VNĐ</strong> ({appliedVoucher.voucher?.discountType === 'Percent' ? `${appliedVoucher.voucher?.discountValue}%` : 'Số tiền cố định'}).
                  </span>
                </div>
              </div>
            )}
          </div>


          {/* Selectable Payment Methods (MoMo, VNPay, ZaloPay, Bank Transfer) */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Chọn cổng thanh toán <span className="text-rose-500">*</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* MoMo */}
              <label
                className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                  paymentMethod === 'MOMO'
                    ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/30 text-pink-900 dark:text-pink-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="payMethod"
                  value="MOMO"
                  checked={paymentMethod === 'MOMO'}
                  onChange={() => setPaymentMethod('MOMO')}
                  className="text-pink-600 focus:ring-pink-500"
                />
                <div className="w-8 h-8 rounded bg-pink-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  MoMo
                </div>
                <div>
                  <div className="font-bold">Ví điện tử MoMo</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Quét mã QR MoMo tức thì</div>
                </div>
              </label>

              {/* VNPay */}
              <label
                className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                  paymentMethod === 'VNPAY'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="payMethod"
                  value="VNPAY"
                  checked={paymentMethod === 'VNPAY'}
                  onChange={() => setPaymentMethod('VNPAY')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div className="w-8 h-8 rounded bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  VNPAY
                </div>
                <div>
                  <div className="font-bold">Cổng VNPAY-QR</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Hỗ trợ 40+ ứng dụng ngân hàng</div>
                </div>
              </label>

              {/* ZaloPay */}
              <label
                className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                  paymentMethod === 'ZALOPAY'
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/30 text-sky-900 dark:text-sky-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="payMethod"
                  value="ZALOPAY"
                  checked={paymentMethod === 'ZALOPAY'}
                  onChange={() => setPaymentMethod('ZALOPAY')}
                  className="text-sky-600 focus:ring-sky-500"
                />
                <div className="w-8 h-8 rounded bg-sky-500 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  Zalo
                </div>
                <div>
                  <div className="font-bold">Ví điện tử ZaloPay</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Thanh toán qua ví Zalo</div>
                </div>
              </label>

              {/* Ngân hàng */}
              <label
                className={`p-3.5 rounded-xl border-2 cursor-pointer flex items-center gap-3 transition-all ${
                  paymentMethod === 'BANK_TRANSFER'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <input
                  type="radio"
                  name="payMethod"
                  value="BANK_TRANSFER"
                  checked={paymentMethod === 'BANK_TRANSFER'}
                  onChange={() => setPaymentMethod('BANK_TRANSFER')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div className="w-8 h-8 rounded bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  Bank
                </div>
                <div>
                  <div className="font-bold">Chuyển khoản Ngân hàng</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">Vietcombank / BIDV / Vietinbank</div>
                </div>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              disabled={isProcessingPayment}
              className="flex items-center gap-1.5 px-4 py-2 rounded border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Quay lại đổi ghế</span>
            </button>

            <button
              type="button"
              onClick={handlePayNow}
              disabled={isProcessingPayment}
              className="flex items-center gap-2 px-6 py-2.5 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold uppercase tracking-wider shadow-md transition-colors"
            >
              {isProcessingPayment ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xử lý giao dịch...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Xác nhận thanh toán {finalCalculatedAmount === 0 ? '0 VNĐ (Miễn phí)' : `${finalCalculatedAmount.toLocaleString('vi-VN')} VNĐ`}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ==============================================================
          STEP 4: PAYMENT SUCCESS & TICKET GENERATION
      ============================================================== */}
      {currentStep === 4 && (
        <div className="max-w-xl mx-auto bg-white dark:bg-[#131e3a] p-8 rounded-xl border border-emerald-300 dark:border-emerald-800 shadow-xl text-center space-y-5">
          <div className="inline-flex p-4 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 animate-bounce">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              {paidInfo ? "ĐÃ THANH TOÁN" : "CHƯA THANH TOÁN"}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
              {paidInfo ? "Thanh Toán Thành Công!" : "Đã Giữ Chỗ, Chờ Thanh Toán"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Mã đặt chỗ của bạn: <strong className="font-mono text-slate-900 dark:text-white">{createdTicketId}</strong>
            </p>
            {serverFinalAmount !== null && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Số tiền máy chủ chốt:{' '}
                <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                  {serverFinalAmount.toLocaleString('vi-VN')} VNĐ
                </strong>
              </p>
            )}
          </div>

          <div className="p-4 rounded-lg bg-slate-50 dark:bg-[#0c162d] border border-slate-200 dark:border-slate-800 text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Hành khách:</span>
              <span className="font-bold text-slate-900 dark:text-white">{passengerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tuyến đường:</span>
              <span className="font-bold text-slate-900 dark:text-white">{selectedRouteObj?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Ghế ngồi ({selectedSeatIds.length} vé):</span>
              <span className="font-extrabold text-amber-600 dark:text-amber-400 font-mono text-sm">{selectedSeatCodes.join(', ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Thời gian:</span>
              <span className="font-mono text-slate-900 dark:text-white">{selectedTrip?.departureTime} ({selectedTrip?.departureDate})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Phương thức:</span>
              <span className="font-semibold text-institutional-700 dark:text-sky-400">{paymentMethod}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <button
              type="button"
              onClick={() => navigate('/passenger/tickets')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-institutional-700 hover:bg-institutional-800 text-white text-xs font-bold uppercase tracking-wider shadow-md transition-colors"
            >
              <QrCode className="w-4 h-4" />
              <span>Xem vé điện tử & Mã QR</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/passenger/invoices')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span>Xem hóa đơn điện tử</span>
            </button>

            <button
              type="button"
              onClick={resetFlow}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Đặt thêm vé khác</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
