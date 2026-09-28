import React from 'react';
import { Search, X, Plus, Filter } from 'lucide-react';
import { Button } from '../common/Button';
import { ROLES, ROLE_LABELS } from '../../routes/roleNavigation';

export const UserFilterBar = ({
  searchTerm,
  onSearchChange,
  onClearSearch,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  onAddNewUser
}) => {
  return (
    <div
      className="card"
      style={{
        padding: '1.15rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}
    >
      {/* Left Search and Filters */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '320px' }}>
        {/* Search Input */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.25rem', paddingRight: searchTerm ? '2rem' : '0.85rem' }}
            placeholder="Tìm theo tên, email, sđt..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={onClearSearch}
              style={{
                position: 'absolute',
                right: '0.6rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                padding: '2px'
              }}
              title="Xóa tìm kiếm"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Role Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '150px' }}
            value={roleFilter}
            onChange={(e) => onRoleFilterChange(e.target.value)}
          >
            <option value="ALL">Tất cả vai trò</option>
            <option value={ROLES.ADMIN}>Admin</option>
            <option value={ROLES.MANAGER}>Quản lý</option>
            <option value={ROLES.DRIVER}>Tài xế</option>
            <option value={ROLES.PASSENGER}>Hành khách</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '140px' }}
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="INACTIVE">Tạm khóa</option>
          </select>
        </div>
      </div>

      {/* Right Add User Button */}
      <div>
        <Button
          variant="primary"
          icon={Plus}
          onClick={onAddNewUser}
        >
          Thêm tài khoản
        </Button>
      </div>
    </div>
  );
};
