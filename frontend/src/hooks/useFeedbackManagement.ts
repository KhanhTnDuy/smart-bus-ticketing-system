/**
 * US4 - Nguồn dữ liệu thật cho trang tiếp nhận và xử lý phản ánh.
 *
 * Hook này thay useData() (mockData) ở ComplaintManagementPage. Việc lọc theo
 * trạng thái, loại và từ khóa được đẩy xuống backend vì bảng phản ánh lớn dần
 * theo thời gian.
 *
 * Những gì giao diện cũ có mà backend không lưu, nên đã bỏ khỏi trang:
 * - Phân loại vi phạm (ATTITUDE, DELAY, OVERCHARGING...): bảng feedbacks không
 *   có cột nào tương ứng. Backend chỉ phân biệt Khiếu nại và Đánh giá qua `Type`.
 * - Ngày xảy ra sự việc: chỉ có TripId, không có ngày chuyến. Trang hiển thị
 *   ngày gửi phản ánh thay thế.
 * - Nội dung phản hồi của cán bộ: bảng feedbacks không có cột nào để lưu, nên
 *   trang không thu thập nữa thay vì nhận rồi bỏ đi.
 * - Trạng thái "Từ chối": FeedbackStatus của backend chỉ có ba giá trị
 *   ChuaXuLy, DangXuLy, DaXuLy.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ComplaintStatus } from '../types';
import { ApiError } from '../api/client';
import { formatDateTime } from '../api/datetime';
import {
  FeedbackDto,
  FeedbackStatusCode,
  FeedbackTypeCode,
  listFeedbacks,
  updateFeedbackStatus,
} from '../api/feedback';

const DEBOUNCE_MS = 300;

export interface FeedbackRow {
  id: number;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  /** Mã tuyến nếu phản ánh gắn với một tuyến, rỗng nếu không. */
  routeLabel: string;
  type: FeedbackTypeCode;
  subject: string;
  content: string;
  /** Số sao 1-5, chỉ có ý nghĩa khi type là Review. */
  rating: number;
  imagePath: string | null;
  status: FeedbackStatusCode;
  processedByName: string;
  /** Đã định dạng sẵn theo giờ địa phương. */
  createdAt: string;
}

export interface FeedbackFilters {
  status: FeedbackStatusCode | null;
  type: FeedbackTypeCode | null;
  search: string;
}

export const EMPTY_FEEDBACK_FILTERS: FeedbackFilters = {
  status: null,
  type: null,
  search: '',
};

/** Backend có ba trạng thái, ánh xạ sang giá trị mà Badge sẵn có hiểu được. */
export const toComplaintStatus = (status: FeedbackStatusCode): ComplaintStatus => {
  switch (status) {
    case FeedbackStatusCode.DangXuLy:
      return 'PROCESSING';
    case FeedbackStatusCode.DaXuLy:
      return 'RESOLVED';
    default:
      return 'PENDING';
  }
};

const toRow = (dto: FeedbackDto): FeedbackRow => ({
  id: dto.id,
  passengerName: dto.passengerName,
  passengerEmail: dto.passengerEmail ?? '',
  passengerPhone: dto.passengerPhone ?? '',
  routeLabel: dto.routeCode ?? '',
  type: dto.type,
  subject: dto.subject,
  content: dto.content,
  rating: dto.rating,
  imagePath: dto.imagePath,
  status: dto.status,
  processedByName: dto.processedByName ?? '',
  createdAt: formatDateTime(dto.createdAt),
});

const describe = (err: unknown): string => {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Đã xảy ra lỗi không xác định.';
};

export interface MutationResult {
  success: boolean;
  message?: string;
}

export const useFeedbackManagement = () => {
  const [filters, setFilters] = useState<FeedbackFilters>(EMPTY_FEEDBACK_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FeedbackFilters>(EMPTY_FEEDBACK_FILTERS);
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAppliedFilters(filters), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const dtos = await listFeedbacks(
          {
            status: appliedFilters.status ?? undefined,
            type: appliedFilters.type ?? undefined,
            search: appliedFilters.search.trim() || undefined,
          },
          controller.signal,
        );
        setRows(dtos.map(toRow));
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(describe(err));
        setRows([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void run();
    return () => controller.abort();
  }, [appliedFilters, reloadToken]);

  const reload = useCallback(() => setReloadToken((n) => n + 1), []);

  const setFilter = useCallback(
    <K extends keyof FeedbackFilters>(key: K, value: FeedbackFilters[K]) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const clearFilters = useCallback(() => {
    setFilters(EMPTY_FEEDBACK_FILTERS);
    setAppliedFilters(EMPTY_FEEDBACK_FILTERS);
  }, []);

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => value !== '' && value !== null),
    [filters],
  );

  /** Đổi trạng thái rồi tải lại để danh sách khớp với cơ sở dữ liệu. */
  const changeStatus = useCallback(
    async (id: number, status: FeedbackStatusCode): Promise<MutationResult> => {
      try {
        await updateFeedbackStatus(id, status);
        setReloadToken((n) => n + 1);
        return { success: true };
      } catch (err) {
        return { success: false, message: describe(err) };
      }
    },
    [],
  );

  return useMemo(
    () => ({
      rows,
      loading,
      error,
      filters,
      setFilter,
      clearFilters,
      hasActiveFilters,
      reload,
      changeStatus,
    }),
    [rows, loading, error, filters, setFilter, clearFilters, hasActiveFilters, reload, changeStatus],
  );
};
