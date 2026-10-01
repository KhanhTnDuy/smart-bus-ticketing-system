import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Calendar,
  Clock,
  MapPin,
  Search,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  QrCode,
  ArrowLeft,
  Armchair,
  Sparkles,
  ShieldCheck,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { BusTrip, PaymentMethod } from '../../types';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/common/Badge';

export const RouteBookingPage: React.FC = () => {
  const { routes, trips, bookTicket, processPayment } = useData();
  const { currentUser } = useAuth();
  const { success, error, warning } = useToast();
  const navigate = useNavigate();

  // Booking Flow Steps: 1: SEARCH, 2: SEATS, 3: PAYMENT, 4: SUCCESS
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Search Filters
  const [departurePoint, setDeparturePoint] = useState<string>('ALL');
  const [destinationPoint, setDestinationPoint] = useState<string>('ALL');
  const [travelDate, setTravelDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedRouteFilter, setSelectedRouteFilter] = useState<string>('ALL');

  // Selected Trip & Seat
  const [selectedTrip, setSelectedTrip] = useState<BusTrip | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string>('');

  // Passenger Contact Form
  const [passengerName, setPassengerName] = useState(currentUser?.fullName || '');
  const [passengerEmail, setPassengerEmail] = useState(currentUser?.email || '');
  const [passengerPhone, setPassengerPhone] = useState(currentUser?.phone || '');

  // Payment Selection
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MOMO');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [createdTicketId, setCreatedTicketId] = useState<string>('');

  // All distinct start and end points for filter dropdowns
  const startPoints = useMemo(() => {
    return Array.from(new Set(routes.map((r) => r.startPoint)));
  }, [routes]);

  const endPoints = useMemo(() => {
    return Array.from(new Set(routes.map((r) => r.endPoint)));
  }, [routes]);

  // Filtered trips
  const availableTrips = useMemo(() => {
    return trips.filter((trip) => {
      const route = routes.find((r) => r.id === trip.routeId);
      if (!route) return false;

      const matchRoute =
        selectedRouteFilter === 'ALL' || trip.routeId === selectedRouteFilter;
      const matchDeparture =
        departurePoint === 'ALL' || route.startPoint === departurePoint;
      const matchDestination =
        destinationPoint === 'ALL' || route.endPoint === destinationPoint;
      const matchDate = !travelDate || trip.departureDate === travelDate;

      return matchRoute && matchDeparture && matchDestination && matchDate;
    });
  }, [trips, routes, selectedRouteFilter, departurePoint, destinationPoint, travelDate]);

  // Step 1: Handle trip selection ("Đặt vé")
  const handleSelectTrip = (trip: BusTrip) => {
    setSelectedTrip(trip);
    setSelectedSeat('');
    setCurrentStep(2);
  };

  // Step 2: Handle seat selection
  const handleSeatClick = (seatId: string) => {
    if (!selectedTrip) return;
    if (selectedTrip.bookedSeats.includes(seatId)) {
      warning(`Ghế ${seatId} đã được đặt trước bởi hành khách khác.`);
      return;
    }
    setSelectedSeat(seatId);
  };

  const handleProceedToPayment = () => {
    if (!selectedSeat) {
      error('Vui lòng chọn 1 vị trí ghế ngồi trước khi tiếp tục.');
      return;
    }
    if (!passengerName.trim() || !passengerPhone.trim()) {
      error('Vui lòng nhập tên và số điện thoại liên hệ của hành khách.');
      return;
    }
    setCurrentStep(3);
  };

  // Step 3: Handle simulated payment
  const handlePayNow = async () => {
    if (!selectedTrip || !selectedSeat) return;

    setIsProcessingPayment(true);

    try {
      // 1. Create booking ticket
      const bookRes = bookTicket({
        tripId: selectedTrip.id,
        routeId: selectedTrip.routeId,
        seatNumber: selectedSeat,
        passengerName: passengerName.trim(),
        passengerEmail: passengerEmail.trim(),
        passengerPhone: passengerPhone.trim(),
        price: selectedTrip.price,
        busPlate: selectedTrip.busPlate,
        departureDate: selectedTrip.departureDate,
        departureTime: selectedTrip.departureTime,
      });

      if (!bookRes.success || !bookRes.data) {
        error(bookRes.message || 'Không thể tạo vé xe.');
        setIsProcessingPayment(false);
        return;
      }

      const newTicket = bookRes.data;

      // 2. Process simulated payment
      const payRes = await processPayment(newTicket.id, paymentMethod);
      if (payRes.success) {
        success(
          `Thanh toán ${selectedTrip.price.toLocaleString('vi-VN')} VNĐ qua ${paymentMethod} thành công!`
        );
        setCreatedTicketId(newTicket.id);
        setCurrentStep(4);
      } else {
        error(payRes.message || 'Thanh toán thất bại.');
      }
    } catch (e) {
      error('Có lỗi trong quá trình xử lý giao dịch thanh toán.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const resetFlow = () => {
    setSelectedTrip(null);
    setSelectedSeat('');
    setCurrentStep(1);
    setCreatedTicketId('');
  };

  // Bus seat rows generator (A1-A4, B1-B4, C1-C4, D1-D4, E1-E4, F1-F4)
  const seatRows = ['A', 'B', 'C', 'D', 'E', 'F'];

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
            <div className="border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-institutional-900 dark:text-sky-300">
                Bộ lọc tìm kiếm tuyến xe buýt:
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Điểm đi */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Điểm đi (Bến khởi hành)
                </label>
                <select
                  value={departurePoint}
                  onChange={(e) => setDeparturePoint(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
                >
                  <option value="ALL">-- Tất cả điểm đi --</option>
                  {startPoints.map((p) => (
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
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
                >
                  <option value="ALL">-- Tất cả điểm đến --</option>
                  {endPoints.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ngày đi */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">
                  Ngày khởi hành
                </label>
                <input
                  type="date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500"
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

            <div className="flex justify-end pt-2">
              <button
                type="button"
                className="flex items-center gap-2 px-5 py-2 rounded bg-institutional-700 hover:bg-institutional-800 text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
              >
                <Search className="w-4 h-4" />
                <span>Tìm tuyến</span>
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
              <div className="p-8 text-center text-xs text-slate-400">
                Không tìm thấy chuyến xe nào phù hợp với điều kiện tìm kiếm. Hãy đổi ngày đi hoặc điểm đến.
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
                <span className="text-slate-600 dark:text-slate-300">Ghế trống</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-amber-400 border-2 border-amber-600" />
                <span className="text-slate-900 dark:text-white font-bold">Đang chọn</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded bg-rose-500 border-2 border-rose-700" />
                <span className="text-slate-600 dark:text-slate-300">Đã đặt</span>
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

              {/* Rows of seats: 2 on left, aisle, 2 on right */}
              <div className="space-y-3">
                {seatRows.map((row) => (
                  <div key={row} className="flex items-center justify-between gap-4">
                    {/* Left 2 seats (1, 2) */}
                    <div className="flex items-center gap-2">
                      {[1, 2].map((col) => {
                        const seatId = `${row}${col}`;
                        const isBooked = selectedTrip.bookedSeats.includes(seatId);
                        const isSelected = selectedSeat === seatId;

                        return (
                          <button
                            key={seatId}
                            type="button"
                            disabled={isBooked}
                            onClick={() => handleSeatClick(seatId)}
                            className={`w-12 h-12 rounded-lg font-bold text-xs flex flex-col items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-amber-400 text-institutional-950 font-black ring-4 ring-amber-300 shadow-md transform scale-105'
                                : isBooked
                                ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-900 cursor-not-allowed opacity-70'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 hover:border-institutional-500 hover:bg-blue-50 dark:hover:bg-slate-700'
                            }`}
                            title={isBooked ? `Ghế ${seatId} đã đặt` : `Chọn ghế ${seatId}`}
                          >
                            <Armchair className="w-3.5 h-3.5" />
                            <span>{seatId}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Aisle (Lối đi) */}
                    <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                      Lối đi
                    </div>

                    {/* Right 2 seats (3, 4) */}
                    <div className="flex items-center gap-2">
                      {[3, 4].map((col) => {
                        const seatId = `${row}${col}`;
                        const isBooked = selectedTrip.bookedSeats.includes(seatId);
                        const isSelected = selectedSeat === seatId;

                        return (
                          <button
                            key={seatId}
                            type="button"
                            disabled={isBooked}
                            onClick={() => handleSeatClick(seatId)}
                            className={`w-12 h-12 rounded-lg font-bold text-xs flex flex-col items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-amber-400 text-institutional-950 font-black ring-4 ring-amber-300 shadow-md transform scale-105'
                                : isBooked
                                ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-900 cursor-not-allowed opacity-70'
                                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-2 border-slate-300 dark:border-slate-700 hover:border-institutional-500 hover:bg-blue-50 dark:hover:bg-slate-700'
                            }`}
                            title={isBooked ? `Ghế ${seatId} đã đặt` : `Chọn ghế ${seatId}`}
                          >
                            <Armchair className="w-3.5 h-3.5" />
                            <span>{seatId}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

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

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-slate-700 dark:text-slate-300 font-bold">Ghế đã chọn:</span>
                  <span className="text-sm font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-3 py-1 rounded border border-amber-300 dark:border-amber-800">
                    {selectedSeat || 'Chưa chọn'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-700 dark:text-slate-300 font-bold">Đơn giá vé:</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {selectedTrip.price.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm">
                  <span className="font-bold text-slate-900 dark:text-white uppercase">Tổng tiền:</span>
                  <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                    {selectedSeat ? `${selectedTrip.price.toLocaleString('vi-VN')} VNĐ` : '0 VNĐ'}
                  </span>
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
                  disabled={!selectedSeat}
                  className="flex items-center gap-1.5 px-4 py-2 rounded bg-institutional-700 hover:bg-institutional-800 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase tracking-wider shadow-sm transition-colors"
                >
                  <span>Tiếp tục thanh toán</span>
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
      {currentStep === 3 && selectedTrip && selectedSeat && (
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
              <span>Vị trí ghế:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">{selectedSeat}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-sm font-bold text-emerald-600 dark:text-emerald-400">
              <span>Tổng số tiền cần thanh toán:</span>
              <span className="text-base font-black font-mono">
                {selectedTrip.price.toLocaleString('vi-VN')} VNĐ
              </span>
            </div>
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
                  <span>Xác nhận thanh toán ngay</span>
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
              GIAO DỊCH THÀNH CÔNG
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-2">
              Đặt Chỗ & Thanh Toán Hoàn Tất!
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Mã vé điện tử của bạn: <strong className="font-mono text-slate-900 dark:text-white">{createdTicketId}</strong>
            </p>
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
              <span className="text-slate-500">Ghế ngồi:</span>
              <span className="font-extrabold text-amber-600 dark:text-amber-400 font-mono text-sm">{selectedSeat}</span>
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
