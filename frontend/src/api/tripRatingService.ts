/**
 * tripRatingService.ts - Dịch vụ Đánh giá chuyến đi (F15) cho phân hệ Hành khách.
 *
 * Bản TypeScript hoá từ feedbackService.js, tự chứa dữ liệu (LocalStorage) nên
 * chạy độc lập, không phụ thuộc vào useData() của app. Khi nối backend thật chỉ
 * cần thay phần thân các hàm bằng `api.post/get/delete` trong ../api/client.
 */

export type SubRatingKey = 'driver' | 'punctuality' | 'cleanliness' | 'amenities';

export interface TripSubRatings {
  driver: number;
  punctuality: number;
  cleanliness: number;
  amenities: number;
}

export interface TripRatingItem {
  id: number;
  tripId: string;
  ticketCode: string;
  routeId: string;
  routeName: string;
  driverName: string;
  busPlate: string;
  passengerId: number;
  passengerName: string;
  isAnonymous: boolean;
  rating: number;
  subRatings: TripSubRatings;
  tags: string[];
  content: string;
  likesCount: number;
  adminResponse: string | null;
  createdAt: string;
}

export interface PendingTrip {
  tripId: string;
  ticketCode: string;
  routeId: string;
  routeName: string;
  driverName: string;
  busPlate: string;
  departureTime: string;
  arrivalTime: string;
  seatNumber: string;
  price: number;
  hasRated: boolean;
}

export interface CreateTripRatingInput {
  tripId?: string;
  ticketCode?: string;
  routeId: string;
  routeName?: string;
  driverName?: string;
  busPlate?: string;
  passengerId: number;
  passengerName: string;
  isAnonymous?: boolean;
  rating: number;
  subRatings?: Partial<TripSubRatings>;
  tags?: string[];
  content: string;
}

export interface TripRatingFilters {
  passengerId?: number;
  routeId?: string;
  rating?: number | 'ALL';
  search?: string;
  sortBy?: 'NEWEST' | 'HIGHEST' | 'LOWEST';
}

const STORAGE_KEY_RATINGS = 'smartbus_mock_trip_ratings';
const STORAGE_KEY_PENDING = 'smartbus_mock_pending_trips';

const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

// ── Dữ liệu mẫu ──────────────────────────────────────────────
export const INITIAL_PENDING_TRIPS: PendingTrip[] = [
  {
    tripId: 'TRIP-2026-881',
    ticketCode: 'TK-88192',
    routeId: 'route-sg-dl',
    routeName: 'SG-DL01: TP. Hồ Chí Minh - Đà Lạt',
    driverName: 'Nguyễn Văn Hùng',
    busPlate: '51B-892.44',
    departureTime: '2026-03-28 07:30',
    arrivalTime: '2026-03-28 13:45',
    seatNumber: 'A12 (Tầng 1)',
    price: 250000,
    hasRated: false,
  },
  {
    tripId: 'TRIP-2026-619',
    ticketCode: 'TK-61904',
    routeId: 'route-sg-ct',
    routeName: 'SG-CT04: TP. Hồ Chí Minh - Cần Thơ',
    driverName: 'Lê Hoàng Nam',
    busPlate: '65B-129.83',
    departureTime: '2026-03-27 14:15',
    arrivalTime: '2026-03-27 18:00',
    seatNumber: 'A08',
    price: 165000,
    hasRated: false,
  },
  {
    tripId: 'TRIP-2026-742',
    ticketCode: 'TK-74211',
    routeId: 'route-hn-sp',
    routeName: 'HN-SP02: Hà Nội - Sa Pa',
    driverName: 'Trần Đình Trọng',
    busPlate: '29B-432.18',
    departureTime: '2026-03-24 21:00',
    arrivalTime: '2026-03-25 04:30',
    seatNumber: 'B04 (Phòng VIP)',
    price: 350000,
    hasRated: true,
  },
];

export const INITIAL_TRIP_RATINGS: TripRatingItem[] = [
  {
    id: 201,
    tripId: 'TRIP-2026-742',
    ticketCode: 'TK-74211',
    routeId: 'route-hn-sp',
    routeName: 'HN-SP02: Hà Nội - Sa Pa',
    driverName: 'Trần Đình Trọng',
    busPlate: '29B-432.18',
    passengerId: 4,
    passengerName: 'Phạm Thị Thúy An',
    isAnonymous: false,
    rating: 5,
    subRatings: { driver: 5, punctuality: 5, cleanliness: 5, amenities: 4 },
    tags: ['Lái xe an toàn 🛡️', 'Đúng giờ tuyệt đối ⏱️', 'Khoang xe sạch sẽ ✨'],
    content:
      'Chuyến xe đêm lên Sa Pa chạy cực kỳ êm và an toàn, tài xế không bấm còi inh ỏi trong đêm giúp hành khách ngủ rất ngon. Phòng VIP giường nằm sạch và rộng rãi!',
    likesCount: 14,
    adminResponse:
      'Cảm ơn bạn Thúy An đã chia sẻ cảm nhận tuyệt vời. Chúc bạn luôn có những chuyến đi ý nghĩa cùng SmartBus!',
    createdAt: '2026-03-25T08:30:00.000Z',
  },
  {
    id: 202,
    tripId: 'TRIP-2026-512',
    ticketCode: 'TK-51280',
    routeId: 'route-dn-qn',
    routeName: 'DN-QN03: Đà Nẵng - Quy Nhơn',
    driverName: 'Võ Minh Tuấn',
    busPlate: '43B-098.22',
    passengerId: 7,
    passengerName: 'Đỗ Hữu Hùng',
    isAnonymous: false,
    rating: 4,
    subRatings: { driver: 4, punctuality: 5, cleanliness: 4, amenities: 4 },
    tags: ['Đúng giờ tuyệt đối ⏱️', 'Xe chạy rất êm 🚌'],
    content:
      'Xe xuất bến đúng từng phút, đón trả khách đúng quy định các trạm trên app. Có nước suối và khăn lạnh miễn phí chu đáo.',
    likesCount: 8,
    adminResponse: 'SmartBus luôn cam kết thời gian chuẩn xác. Rất hân hạnh được phục vụ bạn!',
    createdAt: '2026-03-22T19:00:00.000Z',
  },
  {
    id: 203,
    tripId: 'TRIP-2026-401',
    ticketCode: 'TK-40129',
    routeId: 'route-sg-dl',
    routeName: 'SG-DL01: TP. Hồ Chí Minh - Đà Lạt',
    driverName: 'Nguyễn Văn Hùng',
    busPlate: '51B-892.44',
    passengerId: 9,
    passengerName: 'Hành khách ẩn danh',
    isAnonymous: true,
    rating: 5,
    subRatings: { driver: 5, punctuality: 4, cleanliness: 5, amenities: 5 },
    tags: ['Lái xe an toàn 🛡️', 'Bác tài vui vẻ 😊'],
    content:
      'Bác tài Hùng lái xe đèo Bảo Lộc rất vững tay, không bị say xe tí nào. Giường nằm êm và wifi lướt mượt mà suốt đường.',
    likesCount: 19,
    adminResponse: null,
    createdAt: '2026-03-20T11:45:00.000Z',
  },
];

// ── Truy cập LocalStorage an toàn ─────────────────────────────
function readStore<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore<T>(key: string, value: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* bỏ qua nếu localStorage bị chặn */
  }
}

export const tripRatingService = {
  /** Lấy danh sách chuyến đi đã hoàn thành (kèm cờ đã đánh giá hay chưa). */
  getPendingTripsToRate: async (): Promise<PendingTrip[]> => {
    await delay(150);
    return readStore<PendingTrip>(STORAGE_KEY_PENDING, INITIAL_PENDING_TRIPS);
  },

  /** Lấy danh sách đánh giá chuyến đi, hỗ trợ lọc & sắp xếp phía client. */
  getTripRatings: async (filters: TripRatingFilters = {}): Promise<TripRatingItem[]> => {
    await delay();
    let list = readStore<TripRatingItem>(STORAGE_KEY_RATINGS, INITIAL_TRIP_RATINGS);

    if (filters.passengerId) {
      list = list.filter((r) => r.passengerId === filters.passengerId);
    }
    if (filters.routeId && filters.routeId !== 'ALL') {
      list = list.filter((r) => r.routeId === filters.routeId);
    }
    if (filters.rating && filters.rating !== 'ALL') {
      list = list.filter((r) => r.rating === Number(filters.rating));
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter((r) =>
        [r.content, r.driverName, r.busPlate, r.routeName, r.ticketCode].some(
          (field) => field && field.toLowerCase().includes(q),
        ),
      );
    }

    if (filters.sortBy === 'HIGHEST') return [...list].sort((a, b) => b.rating - a.rating);
    if (filters.sortBy === 'LOWEST') return [...list].sort((a, b) => a.rating - b.rating);
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  /** Gửi một đánh giá mới cho chuyến đi (đồng thời gắn cờ hasRated cho chuyến đó). */
  createTripRating: async (input: CreateTripRatingInput): Promise<TripRatingItem> => {
    await delay(350);

    const ratingScore = Number(input.rating);
    if (!ratingScore || ratingScore < 1 || ratingScore > 5) {
      throw new Error('Vui lòng chọn số sao đánh giá tổng quan (từ 1 đến 5 sao).');
    }
    if (!input.routeId) {
      throw new Error('Vui lòng chọn chuyến xe bạn đã trải nghiệm.');
    }
    if (!input.content || input.content.trim().length < 5) {
      throw new Error('Vui lòng chia sẻ đôi lời nhận xét (tối thiểu 5 ký tự) về chuyến đi.');
    }

    const current = readStore<TripRatingItem>(STORAGE_KEY_RATINGS, INITIAL_TRIP_RATINGS);
    const sub = input.subRatings || {};

    const created: TripRatingItem = {
      id: Date.now(),
      tripId: input.tripId || `TRIP-${Date.now().toString().slice(-4)}`,
      ticketCode: input.ticketCode || `TK-${Math.floor(10000 + Math.random() * 90000)}`,
      routeId: input.routeId,
      routeName: input.routeName || input.routeId,
      driverName: input.driverName || 'Tài xế SmartBus',
      busPlate: input.busPlate || '51B-MEMBER',
      passengerId: input.passengerId,
      passengerName: input.isAnonymous ? 'Hành khách ẩn danh' : input.passengerName,
      isAnonymous: Boolean(input.isAnonymous),
      rating: ratingScore,
      subRatings: {
        driver: Number(sub.driver || ratingScore),
        punctuality: Number(sub.punctuality || ratingScore),
        cleanliness: Number(sub.cleanliness || ratingScore),
        amenities: Number(sub.amenities || ratingScore),
      },
      tags: Array.isArray(input.tags) ? input.tags : [],
      content: input.content.trim(),
      likesCount: 0,
      adminResponse: null,
      createdAt: new Date().toISOString(),
    };

    writeStore<TripRatingItem>(STORAGE_KEY_RATINGS, [created, ...current]);

    if (input.tripId) {
      const trips = readStore<PendingTrip>(STORAGE_KEY_PENDING, INITIAL_PENDING_TRIPS);
      writeStore<PendingTrip>(
        STORAGE_KEY_PENDING,
        trips.map((t) => (t.tripId === input.tripId ? { ...t, hasRated: true } : t)),
      );
    }

    return created;
  },

  /** Thả tim (hữu ích) một đánh giá. */
  likeTripRating: async (id: number): Promise<void> => {
    const list = readStore<TripRatingItem>(STORAGE_KEY_RATINGS, INITIAL_TRIP_RATINGS);
    writeStore<TripRatingItem>(
      STORAGE_KEY_RATINGS,
      list.map((r) => (r.id === id ? { ...r, likesCount: (r.likesCount || 0) + 1 } : r)),
    );
  },

  /** Xóa đánh giá của chính mình. */
  deleteTripRating: async (id: number): Promise<void> => {
    const list = readStore<TripRatingItem>(STORAGE_KEY_RATINGS, INITIAL_TRIP_RATINGS);
    writeStore<TripRatingItem>(STORAGE_KEY_RATINGS, list.filter((r) => r.id !== id));
  },

  /** Khôi phục dữ liệu mẫu ban đầu. */
  resetAllData: (): void => {
    writeStore<TripRatingItem>(STORAGE_KEY_RATINGS, INITIAL_TRIP_RATINGS);
    writeStore<PendingTrip>(STORAGE_KEY_PENDING, INITIAL_PENDING_TRIPS);
  },
};

