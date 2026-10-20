import { api } from './client';
import {
  Voucher,
  VoucherRequest,
  ValidateVoucherResult,
  CheckVoucherCodeResult,
  VoucherDiscountType,
} from '../types';

export interface VoucherQueryParams {
  search?: string;
  status?: string;
  discountType?: VoucherDiscountType;
}

// Backend trả và nhận enum DiscountType dạng số (0 = Percent, 1 = Fixed), còn giao diện dùng tên 'Percent' | 'Fixed'.
// Chuẩn hóa tại đây để mọi trang dùng chung một dạng; không chuẩn hóa thì `.toLowerCase()` trên số làm sập trang
// voucher của hành khách, và chuỗi 'Percent' gửi lên bị backend từ chối khi tạo/sửa voucher.
const toDiscountType = (raw: unknown): VoucherDiscountType =>
  raw === 1 || (typeof raw === 'string' && raw.toLowerCase() === 'fixed') ? 'Fixed' : 'Percent';
const fromWire = (v: Voucher): Voucher => ({ ...v, discountType: toDiscountType(v.discountType) });
const listFromWire = (list: Voucher[]): Voucher[] => (Array.isArray(list) ? list.map(fromWire) : list);
const toWire = (data: VoucherRequest) => ({ ...data, discountType: data.discountType === 'Fixed' ? 1 : 0 });

export const voucherApi = {
  /**
   * SCRUM-66: Lấy danh sách voucher
   */
  async getVouchers(params?: VoucherQueryParams, signal?: AbortSignal): Promise<Voucher[]> {
    return listFromWire(
      await api.get<Voucher[]>(
        '/api/vouchers',
        {
          search: params?.search || undefined,
          status: params?.status || undefined,
          discountType: params?.discountType || undefined,
        },
        signal
      )
    );
  },

  /**
   * Voucher đang dùng được (trong hạn, còn lượt). Mọi người dùng đã đăng nhập đều gọi được, dùng cho kho voucher của hành khách.
   */
  async getAvailableVouchers(signal?: AbortSignal): Promise<Voucher[]> {
    return listFromWire(await api.get<Voucher[]>('/api/vouchers/available', undefined, signal));
  },

  /**
   * SCRUM-66: Xem chi tiết voucher theo id
   */
  async getVoucherById(id: number, signal?: AbortSignal): Promise<Voucher> {
    return fromWire(await api.get<Voucher>(`/api/vouchers/${id}`, undefined, signal));
  },

  /**
   * SCRUM-66 & SCRUM-67: Tạo voucher mới (chặn trùng mã, kiểm tra hạn dùng & số lượt)
   */
  async createVoucher(data: VoucherRequest): Promise<Voucher> {
    return fromWire(await api.post<Voucher>('/api/vouchers', toWire(data)));
  },

  /**
   * SCRUM-66 & SCRUM-67: Cập nhật voucher (chặn trùng mã với voucher khác)
   */
  async updateVoucher(id: number, data: VoucherRequest): Promise<Voucher> {
    return fromWire(await api.put<Voucher>(`/api/vouchers/${id}`, toWire(data)));
  },

  /**
   * SCRUM-66: Xóa voucher (chặn xóa nếu đã có vé sử dụng)
   */
  async deleteVoucher(id: number): Promise<void> {
    return api.del(`/api/vouchers/${id}`);
  },

  /**
   * SCRUM-67: Kiểm tra nhanh mã voucher có bị trùng không
   */
  async checkCode(code: string, excludeId?: number, signal?: AbortSignal): Promise<CheckVoucherCodeResult> {
    return api.get<CheckVoucherCodeResult>(
      '/api/vouchers/check-code',
      {
        code: code.trim(),
        excludeId: excludeId !== undefined ? String(excludeId) : undefined,
      },
      signal
    );
  },

  /**
   * SCRUM-67: Kiểm tra toàn diện voucher (hạn dùng, số lượt còn lại, mức giảm giá)
   */
  async validateVoucher(code: string, orderAmount?: number): Promise<ValidateVoucherResult> {
    const res = await api.post<ValidateVoucherResult>('/api/vouchers/validate', {
      code: code.trim(),
      orderAmount: orderAmount !== undefined ? orderAmount : undefined,
    });
    return res.voucher ? { ...res, voucher: fromWire(res.voucher) } : res;
  },
};
