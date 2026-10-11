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

export const voucherApi = {
  /**
   * SCRUM-66: Lấy danh sách voucher
   */
  async getVouchers(params?: VoucherQueryParams, signal?: AbortSignal): Promise<Voucher[]> {
    return api.get<Voucher[]>(
      '/api/vouchers',
      {
        search: params?.search || undefined,
        status: params?.status || undefined,
        discountType: params?.discountType || undefined,
      },
      signal
    );
  },

  /**
   * SCRUM-66: Xem chi tiết voucher theo id
   */
  async getVoucherById(id: number, signal?: AbortSignal): Promise<Voucher> {
    return api.get<Voucher>(`/api/vouchers/${id}`, undefined, signal);
  },

  /**
   * SCRUM-66 & SCRUM-67: Tạo voucher mới (chặn trùng mã, kiểm tra hạn dùng & số lượt)
   */
  async createVoucher(data: VoucherRequest): Promise<Voucher> {
    return api.post<Voucher>('/api/vouchers', data);
  },

  /**
   * SCRUM-66 & SCRUM-67: Cập nhật voucher (chặn trùng mã với voucher khác)
   */
  async updateVoucher(id: number, data: VoucherRequest): Promise<Voucher> {
    return api.put<Voucher>(`/api/vouchers/${id}`, data);
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
    return api.post<ValidateVoucherResult>('/api/vouchers/validate', {
      code: code.trim(),
      orderAmount: orderAmount !== undefined ? orderAmount : undefined,
    });
  },
};
