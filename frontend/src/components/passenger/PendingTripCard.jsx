import React from 'react';
import { Bus, User, Clock, MapPin, Star } from 'lucide-react';
import { Button } from '../common/Button';
import { formatCurrencyVND } from '../../utils/formatters';

/**
 * PendingTripCard - Thẻ hiển thị một chuyến đi đã hoàn thành nhưng chưa được đánh giá.
 * Nhấn "Đánh giá ngay" sẽ mở biểu mẫu đánh giá (RatingForm) với chuyến đi này.
 */
export const PendingTripCard = ({ trip, onRate }) => {
  return (
    <div
      className="card"
      style={{ padding: '1.15rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
    >
      {/* Ticket & Route */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', fontFamily: 'monospace' }}>
            {trip.ticketCode}
          </div>
          <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '0.15rem' }}>
            {trip.routeName}
          </h4>
        </div>
        <span className="badge badge-passenger" style={{ flexShrink: 0 }}>
          Chờ đánh giá
        </span>
      </div>

      {/* Trip meta */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.5rem',
          fontSize: '0.8rem',
          color: 'var(--text-secondary)'
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <User size={14} color="var(--text-muted)" /> {trip.driverName}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <Bus size={14} color="var(--text-muted)" /> {trip.busPlate}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <Clock size={14} color="var(--text-muted)" /> {trip.departureTime} → {trip.arrivalTime}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          <MapPin size={14} color="var(--text-muted)" /> Ghế {trip.seatNumber}
        </span>
      </div>

      {/* Price & CTA */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px dashed var(--border-light)',
          paddingTop: '0.75rem'
        }}
      >
        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-main)' }}>
          {formatCurrencyVND(trip.price)}
        </span>
        <Button variant="primary" size="sm" icon={Star} onClick={() => onRate(trip)}>
          Đánh giá ngay
        </Button>
      </div>
    </div>
  );
};
