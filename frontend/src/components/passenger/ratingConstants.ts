import type { SubRatingKey } from '../../api/tripRatingService';

// Cấu hình 4 tiêu chí đánh giá chi tiết
export interface SubRatingConfigItem {
  key: SubRatingKey;
  label: string;
  hint: string;
}

export const SUB_RATING_CONFIG: SubRatingConfigItem[] = [
  { key: 'driver', label: 'Thái độ & tay lái của tài xế', hint: 'Lái xe êm, an toàn, thân thiện' },
  { key: 'punctuality', label: 'Đúng giờ đón / trả khách', hint: 'Xuất bến và đến đúng lịch trình' },
  { key: 'cleanliness', label: 'Vệ sinh khoang xe', hint: 'Sàn, ghế, gối, nhà vệ sinh sạch sẽ' },
  { key: 'amenities', label: 'Tiện ích trên xe', hint: 'Wifi, điều hòa, nước uống, chăn gối' },
];

// Nhãn ngắn để đánh giá nhanh bằng 1 chạm
export const RATING_TAGS: string[] = [
  'Lái xe an toàn 🛡️',
  'Đúng giờ tuyệt đối ⏱️',
  'Khoang xe sạch sẽ ✨',
  'Bác tài vui vẻ 😊',
  'Xe chạy rất êm 🚌',
  'Điều hòa mát lạnh ❄️',
  'Wifi mạnh, lướt mượt 📶',
  'Có nước uống miễn phí 💧',
];

export interface RatingLevel {
  min: number;
  label: string;
  emoji: string;
  color: string;
}

export const RATING_LEVELS: RatingLevel[] = [
  { min: 5, label: 'Tuyệt vời', emoji: '😍', color: '#10b981' },
  { min: 4, label: 'Hài lòng', emoji: '🙂', color: '#22c55e' },
  { min: 3, label: 'Bình thường', emoji: '😐', color: '#f59e0b' },
  { min: 2, label: 'Chưa tốt', emoji: '🙁', color: '#f97316' },
  { min: 1, label: 'Tệ', emoji: '😠', color: '#ef4444' },
];

export const getRatingLevel = (value = 0): RatingLevel =>
  RATING_LEVELS.find((level) => value >= level.min) || RATING_LEVELS[RATING_LEVELS.length - 1];

export const SORT_OPTIONS = [
  { value: 'NEWEST', label: 'Mới nhất' },
  { value: 'HIGHEST', label: 'Điểm cao nhất' },
  { value: 'LOWEST', label: 'Điểm thấp nhất' },
] as const;
