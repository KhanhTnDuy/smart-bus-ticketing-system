// ratingConstants.js - Hằng số dùng chung cho phân hệ Đánh giá chuyến đi (F15)
// Được tái sử dụng bởi StarRating, RatingForm, RatingCard và PassengerRatingPage

// Các tiêu chí đánh giá chi tiết (sub-ratings) ngoài số sao tổng quan
export const SUB_RATING_CONFIG = [
  { key: 'driver',      label: 'Thái độ & tay lái của tài xế', hint: 'Lái xe êm, an toàn, thân thiện' },
  { key: 'punctuality', label: 'Đúng giờ đón / trả khách',     hint: 'Xuất bến và đến đúng lịch trình' },
  { key: 'cleanliness', label: 'Vệ sinh khoang xe',            hint: 'Sàn, ghế, gối, nhà vệ sinh sạch sẽ' },
  { key: 'amenities',   label: 'Tiện ích trên xe',             hint: 'Wifi, điều hòa, nước uống, chăn gối' }
];

// Nhãn ngắn (quick tags) giúp hành khách đánh giá nhanh bằng 1 chạm
export const RATING_TAGS = [
  'Lái xe an toàn 🛡️',
  'Đúng giờ tuyệt đối ⏱️',
  'Khoang xe sạch sẽ ✨',
  'Bác tài vui vẻ 😊',
  'Xe chạy rất êm 🚌',
  'Điều hòa mát lạnh ❄️',
  'Wifi mạnh, lướt mượt 📶',
  'Có nước uống miễn phí 💧'
];

// Mô tả trực quan theo số sao (dùng cho cả form lẫn thẻ hiển thị)
export const RATING_LEVELS = [
  { min: 5, label: 'Tuyệt vời',   emoji: '😍', color: '#10b981' },
  { min: 4, label: 'Hài lòng',    emoji: '🙂', color: '#22c55e' },
  { min: 3, label: 'Bình thường', emoji: '😐', color: '#f59e0b' },
  { min: 2, label: 'Chưa tốt',    emoji: '🙁', color: '#f97316' },
  { min: 1, label: 'Tệ',          emoji: '😠', color: '#ef4444' }
];

// Trả về cấu hình mức đánh giá tương ứng với số sao (mặc định mức thấp nhất)
export const getRatingLevel = (value = 0) =>
  RATING_LEVELS.find((level) => value >= level.min) || RATING_LEVELS[RATING_LEVELS.length - 1];

// Tùy chọn sắp xếp danh sách đánh giá (khớp với feedbackService.getTripRatings)
export const SORT_OPTIONS = [
  { value: 'NEWEST',  label: 'Mới nhất' },
  { value: 'HIGHEST', label: 'Điểm cao nhất' },
  { value: 'LOWEST',  label: 'Điểm thấp nhất' }
];
