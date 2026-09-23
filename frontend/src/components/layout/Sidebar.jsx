import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAuthorizedMenu, ROLE_LABELS } from '../../routes/roleNavigation';
import { BusFront, ShieldAlert } from 'lucide-react';
import { RoleBadge } from '../common/Badge';

export const Sidebar = ({ isOpen, onClose }) => {
  const { user, role } = useAuth();
  const authorizedSections = getAuthorizedMenu(role);

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 35
          }}
        />
      )}

      <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <BusFront size={22} />
          </div>
          <div className="sidebar-logo-text">
            <h2>SmartBus</h2>
            <span>Quản trị & Điều hành</span>
          </div>
        </div>

        {/* Dynamic Navigation Menu */}
        <nav className="sidebar-nav">
          {authorizedSections.map((section, idx) => (
            <div key={idx} style={{ marginBottom: '0.75rem' }}>
              <div className="nav-section-title">{section.section}</div>
              {section.items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={() => {
                      if (window.innerWidth <= 768 && onClose) onClose();
                    }}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? 'active' : ''}`
                    }
                  >
                    <IconComponent size={18} />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Card at Footer */}
        {user && (
          <div className="sidebar-footer">
            <div className="user-badge-card">
              <div className="user-avatar-sm">
                {(user.name || user.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'white',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden'
                  }}
                  title={user.name}
                >
                  {user.name}
                </div>
                <div style={{ marginTop: '0.15rem' }}>
                  <RoleBadge role={role} />
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
