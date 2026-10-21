import React from 'react';
import { Loader2, Route as RouteIcon, TriangleAlert } from 'lucide-react';
import { StopDto } from '../../api/routeManagement';
import { EstimateState } from '../../hooks/useRouteEstimate';

const INPUT_CLASS =
  'w-full px-3 py-2 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0c162d] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-institutional-500';
const LABEL_CLASS = 'block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1';

interface Props {
  stops: StopDto[];
  startStopId: string;
  endStopId: string;
  /** Tên điểm đầu/cuối đang lưu của tuyến cũ, hiện khi chưa chọn trạm (tuyến tạo trước khi có ô chọn trạm). */
  startPoint: string;
  endPoint: string;
  distance: number;
  estimate: EstimateState;
  errors: Record<string, string>;
  onStopChange: (which: 'start' | 'end', stopId: string) => void;
  onDistanceChange: (km: number) => void;
}

const fmtKm = (km: number) => km.toLocaleString('vi-VN', { maximumFractionDigits: 2 });

/**
 * Ô chọn điểm đầu, điểm cuối từ các trạm có sẵn và ô cự ly. Chọn đủ hai trạm thì cự ly được điền sẵn theo đường đi thực tế
 * (xem useRouteEstimate); vẫn sửa tay được khi cần.
 */
export const RouteEndpointFields: React.FC<Props> = ({
  stops,
  startStopId,
  endStopId,
  startPoint,
  endPoint,
  distance,
  estimate,
  errors,
  onStopChange,
  onDistanceChange,
}) => {
  const renderSelect = (which: 'start' | 'end', value: string, legacyText: string) => (
    <select
      value={value}
      onChange={(e) => onStopChange(which, e.target.value)}
      className={INPUT_CLASS}
      disabled={stops.length === 0}
    >
      <option value="">
        {value === '' && legacyText.trim()
          ? `${legacyText} (chưa có trong danh sách trạm)`
          : '-- Chọn trạm có sẵn --'}
      </option>
      {stops.map((s) => (
        <option key={s.id} value={String(s.id)}>
          {s.name}
        </option>
      ))}
    </select>
  );

  return (
    <>
      <div>
        <label className={LABEL_CLASS}>
          Điểm đầu tuyến <span className="text-rose-500">*</span>
        </label>
        {renderSelect('start', startStopId, startPoint)}
        {errors.startPoint && <p className="text-[11px] text-rose-500 mt-1">{errors.startPoint}</p>}
      </div>

      <div>
        <label className={LABEL_CLASS}>
          Điểm cuối tuyến <span className="text-rose-500">*</span>
        </label>
        {renderSelect('end', endStopId, endPoint)}
        {errors.endPoint && <p className="text-[11px] text-rose-500 mt-1">{errors.endPoint}</p>}
      </div>

      {stops.length === 0 && (
        <div className="sm:col-span-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded px-3 py-2">
          Chưa có trạm dừng nào trong hệ thống. Hãy tạo trạm (tên và tọa độ) ở mục Quản lý trạm dừng trước, rồi quay lại chọn điểm đầu và điểm cuối.
        </div>
      )}

      <div>
        <label className={LABEL_CLASS}>
          Cự ly hành trình (km) <span className="text-rose-500">*</span>
        </label>
        <input
          type="number"
          step="0.1"
          min="0.1"
          value={distance}
          onChange={(e) => onDistanceChange(parseFloat(e.target.value) || 0)}
          className={INPUT_CLASS}
        />
        {errors.distance && <p className="text-[11px] text-rose-500 mt-1">{errors.distance}</p>}
      </div>

      <div className="text-[11px] self-end pb-1 text-slate-500 dark:text-slate-400">
        {estimate.status === 'idle' && 'Chọn đủ điểm đầu và điểm cuối để hệ thống tự tính cự ly.'}
        {estimate.status === 'manual' && 'Cự ly đang nhập tay. Đổi điểm đầu hoặc cuối để tính lại tự động.'}
        {estimate.status === 'loading' && (
          <span className="inline-flex items-center gap-1.5 text-sky-700 dark:text-sky-300">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tính cự ly đường bộ...
          </span>
        )}
        {estimate.status === 'done' && estimate.result.source === 'road' && (
          <span className="inline-flex items-start gap-1.5 text-emerald-700 dark:text-emerald-300">
            <RouteIcon className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>
              Tự tính theo đường đi thực tế: {fmtKm(estimate.result.distanceKm)} km
              {estimate.result.durationMinutes != null && `, khoảng ${estimate.result.durationMinutes} phút lái xe`}. Có thể sửa tay nếu cần.
            </span>
          </span>
        )}
        {estimate.status === 'done' && estimate.result.source !== 'road' && (
          <span className="inline-flex items-start gap-1.5 text-amber-700 dark:text-amber-300">
            <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>
              Không gọi được dịch vụ bản đồ nên tạm dùng đường chim bay ({fmtKm(estimate.result.distanceKm)} km, thường thấp hơn thực tế).
              Hãy kiểm tra lại cự ly.
            </span>
          </span>
        )}
        {estimate.status === 'error' && (
          <span className="inline-flex items-start gap-1.5 text-rose-600 dark:text-rose-400">
            <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>{estimate.message}</span>
          </span>
        )}
      </div>
    </>
  );
};
