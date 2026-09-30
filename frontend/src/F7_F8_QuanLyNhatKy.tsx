import React, { useState, useEffect, useCallback } from 'react';

// Khai báo kiểu dữ liệu cho TypeScript
interface AuditLog {
  id: number;
  createdAt?: string;
  timestamp?: string;
  actor?: string;
  username?: string;
  action: string;
  ipAddress?: string;
  description?: string;
  detail?: string;
}

interface FilterState {
  search: string;
  action: string;
  fromDate: string;
  toDate: string;
}

const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

export default function F7_F8_QuanLyNhatKy() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Task 8: Bộ lọc thời gian, từ khóa & loại thao tác
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    action: 'ALL',
    fromDate: '',
    toDate: '',
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalItems: 0,
  });

  // Task 7: Gọi API lấy dữ liệu thật từ Backend
  const fetchAuditLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams();

      if (filters.search.trim()) queryParams.append('search', filters.search.trim());
      if (filters.action !== 'ALL') queryParams.append('action', filters.action);
      if (filters.fromDate) queryParams.append('fromDate', filters.fromDate);
      if (filters.toDate) queryParams.append('toDate', filters.toDate);
      queryParams.append('page', pagination.currentPage.toString());
      queryParams.append('limit', pagination.pageSize.toString());

      const response = await fetch(`${API_BASE_URL}/audit-logs?${queryParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('Cần quyền ADMIN để xem nhật ký hệ thống!');
        }
        throw new Error(`Lỗi server (${response.status}): Không thể tải dữ liệu`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setLogs(data);
        setPagination((prev) => ({ ...prev, totalItems: data.length }));
      } else if (data && data.data) {
        setLogs(data.data);
        setPagination((prev) => ({ ...prev, totalItems: data.total || data.data.length }));
      } else {
        setLogs([]);
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.currentPage, pagination.pageSize]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
    fetchAuditLogs();
  };

  const handleResetFilter = () => {
    setFilters({ search: '', action: 'ALL', fromDate: '', toDate: '' });
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '--';
    try {
      return new Date(isoString).toLocaleString('vi-VN');
    } catch {
      return isoString;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: 0 }}>Quản Lý Nhật Ký Hệ Thống (Audit Logs)</h1>
          <p style={{ color: '#666', fontSize: '14px', margin: '4px 0 0 0' }}>Task 7 & 8: Theo dõi lịch sử thao tác & Lọc nhật ký</p>
        </div>
        <button onClick={fetchAuditLogs} disabled={loading} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>

      {error && <div style={{ padding: '12px', background: '#fee2e2', color: '#991b1b', marginBottom: '16px', borderRadius: '6px' }}>{error}</div>}

      {/* Form bộ lọc Task 8 */}
      <form onSubmit={handleApplyFilter} style={{ background: '#f8fafc', padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Từ khóa / User</label>
            <input type="text" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Nhập tên, IP..." style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Loại thao tác</label>
            <select name="action" value={filters.action} onChange={handleFilterChange} style={{ width: '100%', padding: '8px' }}>
              <option value="ALL">-- Tất cả --</option>
              <option value="LOGIN">Đăng nhập</option>
              <option value="LOGOUT">Đăng xuất</option>
              <option value="USER_CREATE">Tạo tài khoản</option>
              <option value="USER_DELETE">Xóa tài khoản</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Từ ngày</label>
            <input type="datetime-local" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>Đến ngày</label>
            <input type="datetime-local" name="toDate" value={filters.toDate} onChange={handleFilterChange} style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }} />
          </div>
        </div>
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="submit" style={{ background: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>Lọc nhật ký</button>
          <button type="button" onClick={handleResetFilter} style={{ padding: '8px 16px', cursor: 'pointer' }}>Đặt lại</button>
        </div>
      </form>

      {/* Bảng danh sách Task 7 */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}>
        <thead>
          <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
            <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>ID</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Thời gian</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Người thực hiện</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Thao tác</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Địa chỉ IP</th>
            <th style={{ padding: '10px', borderBottom: '1px solid #cbd5e1' }}>Nội dung chi tiết</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>⏳ Đang tải dữ liệu...</td></tr>
          ) : logs.length === 0 ? (
            <tr><td colSpan={6} style={{ textAlign: 'center', padding: '20px' }}>📭 Không có nhật ký nào.</td></tr>
          ) : (
            logs.map((log) => (
              <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '10px' }}>#{log.id}</td>
                <td style={{ padding: '10px', fontSize: '13px' }}>{formatDateTime(log.createdAt || log.timestamp)}</td>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{log.actor || log.username || 'System'}</td>
                <td style={{ padding: '10px' }}><span style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{log.action}</span></td>
                <td style={{ padding: '10px', fontFamily: 'monospace' }}>{log.ipAddress || '127.0.0.1'}</td>
                <td style={{ padding: '10px' }}>{log.description || log.detail || '--'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
