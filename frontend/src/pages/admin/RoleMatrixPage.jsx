import React from 'react';
import { ROLE_PERMISSIONS_MATRIX } from '../../api/mockData';
import { ROLES, ROLE_LABELS } from '../../routes/roleNavigation';
import { RoleBadge } from '../../components/common/Badge';
import { Check, X, Shield, Info } from 'lucide-react';

export const RoleMatrixPage = () => {
  const rolesList = [ROLES.ADMIN, ROLES.MANAGER, ROLES.DRIVER, ROLES.PASSENGER];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Ma trận Phân quyền Hệ thống</h1>
          <p>Bảng tổng hợp quyền hạn truy cập và thao tác theo từng vai trò trong hệ thống SmartBus</p>
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          backgroundColor: '#eff6ff',
          borderColor: '#bfdbfe',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#1e40af'
        }}
      >
        <Info size={20} style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.875rem' }}>
          Hệ thống áp dụng mô hình phân quyền dựa trên vai trò (<strong>Role-Based Access Control - RBAC</strong>). 
          Mỗi tài khoản được gán vai trò tương ứng và tự động áp dụng các quyền hạn trong bảng dưới đây.
        </span>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid var(--border-light)',
                  color: 'var(--text-main)',
                  fontSize: '0.825rem'
                }}
              >
                <th style={{ padding: '1rem 1.25rem', width: '40%' }}>Chức năng / Quyền hạn</th>
                {rolesList.map(r => (
                  <th key={r} style={{ padding: '1rem 0.75rem', textAlign: 'center', width: '15%' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                      <RoleBadge role={r} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLE_PERMISSIONS_MATRIX.map((moduleGroup, mIdx) => (
                <React.Fragment key={mIdx}>
                  <tr
                    style={{
                      backgroundColor: '#f1f5f9',
                      borderBottom: '1px solid var(--border-light)'
                    }}
                  >
                    <td
                      colSpan={5}
                      style={{
                        padding: '0.65rem 1.25rem',
                        fontSize: '0.825rem',
                        fontWeight: 700,
                        color: 'var(--text-main)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {moduleGroup.module}
                    </td>
                  </tr>

                  {moduleGroup.permissions.map((perm) => (
                    <tr
                      key={perm.key}
                      style={{
                        borderBottom: '1px solid var(--border-light)',
                        transition: 'var(--transition)'
                      }}
                    >
                      <td style={{ padding: '0.85rem 1.25rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                        <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>{perm.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mã quyền: {perm.key}</div>
                      </td>

                      {rolesList.map(role => {
                        const hasAccess = perm.roles.includes(role);
                        return (
                          <td key={role} style={{ padding: '0.85rem 0.75rem', textAlign: 'center' }}>
                            {hasAccess ? (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  backgroundColor: 'var(--success-light)',
                                  color: 'var(--success)'
                                }}
                              >
                                <Check size={16} strokeWidth={2.5} />
                              </div>
                            ) : (
                              <div
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: '26px',
                                  height: '26px',
                                  borderRadius: '50%',
                                  backgroundColor: '#f1f5f9',
                                  color: '#cbd5e1'
                                }}
                              >
                                <X size={15} strokeWidth={2} />
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
