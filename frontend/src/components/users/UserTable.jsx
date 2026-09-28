import React from 'react';
import { Eye, Edit2, Trash2, Mail, Phone } from 'lucide-react';
import { RoleBadge, StatusBadge } from '../common/Badge';
import { Button } from '../common/Button';

export const UserTable = ({
  users = [],
  onViewDetail,
  onEditUser,
  onDeleteUser,
  currentUserId
}) => {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr
              style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid var(--border-light)',
                color: 'var(--text-secondary)',
                fontSize: '0.785rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              <th style={{ padding: '0.9rem 1rem', width: '60px', textAlign: 'center' }}>STT</th>
              <th style={{ padding: '0.9rem 1.25rem' }}>Người dùng</th>
              <th style={{ padding: '0.9rem 1.25rem' }}>Liên hệ</th>
              <th style={{ padding: '0.9rem 1rem' }}>Vai trò</th>
              <th style={{ padding: '0.9rem 1rem' }}>Trạng thái</th>
              <th style={{ padding: '0.9rem 1rem' }}>Ngày tạo</th>
              <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => {
              const isCurrentUser = user.id === currentUserId;
              const dateFormatted = user.createdAt
                ? new Date(user.createdAt).toLocaleDateString('vi-VN')
                : '---';

              return (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: '1px solid var(--border-light)',
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* STT */}
                  <td
                    style={{
                      padding: '0.9rem 1rem',
                      textAlign: 'center',
                      fontSize: '0.85rem',
                      color: 'var(--text-muted)',
                      fontWeight: 600
                    }}
                  >
                    {index + 1}
                  </td>

                  {/* Họ tên & Username */}
                  <td style={{ padding: '0.9rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          backgroundColor: '#eef2ff',
                          color: 'var(--primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          flexShrink: 0
                        }}
                      >
                        {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.925rem' }}>
                          {user.name}
                          {isCurrentUser && (
                            <span
                              style={{
                                marginLeft: '0.5rem',
                                fontSize: '0.7rem',
                                backgroundColor: '#ede9fe',
                                color: 'var(--primary)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 700
                              }}
                            >
                              Bạn
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.785rem', color: 'var(--text-muted)' }}>
                          @{user.username}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Liên hệ: Email & Phone */}
                  <td style={{ padding: '0.9rem 1.25rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.825rem',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <Mail size={13} color="var(--text-muted)" />
                        <span>{user.email || 'Chưa cập nhật'}</span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.825rem',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <Phone size={13} color="var(--text-muted)" />
                        <span>{user.phone || 'Chưa cập nhật'}</span>
                      </div>
                    </div>
                  </td>

                  {/* Vai trò */}
                  <td style={{ padding: '0.9rem 1rem' }}>
                    <RoleBadge role={user.role} />
                  </td>

                  {/* Trạng thái */}
                  <td style={{ padding: '0.9rem 1rem' }}>
                    <StatusBadge status={user.status} />
                  </td>

                  {/* Ngày tạo */}
                  <td style={{ padding: '0.9rem 1rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    {dateFormatted}
                  </td>

                  {/* Thao tác */}
                  <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => onViewDetail(user)}
                        title="Xem chi tiết tài khoản"
                      >
                        <Eye size={16} color="var(--info)" />
                      </button>

                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => onEditUser(user)}
                        title="Chỉnh sửa tài khoản"
                      >
                        <Edit2 size={16} color="var(--primary)" />
                      </button>

                      <button
                        className="btn btn-ghost btn-sm btn-icon"
                        onClick={() => onDeleteUser(user)}
                        disabled={isCurrentUser}
                        style={isCurrentUser ? { opacity: 0.35, cursor: 'not-allowed' } : undefined}
                        title={isCurrentUser ? 'Không thể tự xóa tài khoản của mình' : 'Xóa tài khoản'}
                      >
                        <Trash2 size={16} color="var(--danger)" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
