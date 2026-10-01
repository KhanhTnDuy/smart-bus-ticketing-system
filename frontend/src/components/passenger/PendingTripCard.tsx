import React from 'react';
import { Bus, User, Clock, MapPin, Star } from 'lucide-react';
import type { PendingTrip } from '../../api/tripRatingService';

const formatVND = (amount: number): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(
    amount || 0,
  );

interface PendingTripCardProps {
  trip: PendingTrip;
  onRate: (trip: PendingTrip) => void;
}

/** Thẻ hiển thị một chuyến đi đã hoàn thành nhưng chưa được đánh giá. */
export const PendingTripCard: React.FC<PendingTripCardProps> = ({ trip, onRate }) => {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl border border-slate-200 dark:border-[#1e2f57] bg-white dark:bg-[#131e3a] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] font-bold text-institutional-700 dark:text-sky-400 font-mono">
            {trip.ticketCode}
          </div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{trip.routeName}</h4>
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800">
          Chờ đánh giá
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <User size={13} className="text-slate-400" /> {trip.driverName}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Bus size={13} className="text-slate-400" /> {trip.busPlate}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock size={13} className="text-slate-400" /> {trip.departureTime} → {trip.arrivalTime}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={13} className="text-slate-400" /> Ghế {trip.seatNumber}
        </span>
      </div>

      <div className="flex items-center justify-between border-t border-dashed border-slate-200 dark:border-slate-700 pt-3">
        <span className="text-sm font-extrabold text-slate-900 dark:text-white">{formatVND(trip.price)}</span>
        <button
          type="button"
          onClick={() => onRate(trip)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wide text-white bg-amber-600 hover:bg-amber-700 shadow-sm transition-colors"
        >
          <Star size={14} /> Đánh giá ngay
        </button>
      </div>
    </div>
  );
};
