import React, { useEffect } from 'react';
import { useRouteContext, TabType } from '@/context/RouteContext';
import { RouteTab } from '@/components/routes/RouteTab';
import { StopTab } from '@/components/routes/StopTab';
import { PricingTab } from '@/components/routes/PricingTab';
import { Route as RouteIcon, MapPin, DollarSign } from 'lucide-react';

interface RouteManagementPageProps {
  // SCRUM-17/18/19 dùng chung một trang, chỉ khác tab mặc định khi vào trang
  defaultTab?: TabType;
}

// SCRUM-17: Quản lý tuyến đường, trạm dừng & giá vé (thay cho ManagerPlaceholder).
// Chuyển thể từ src/app/admin/routes/page.tsx (Next.js, đã xóa) sang Vite + React Router.
export const RouteManagementPage: React.FC<RouteManagementPageProps> = ({ defaultTab = 'routes' }) => {
  const { activeTab, setActiveTab, routes, stops, prices } = useRouteContext();

  useEffect(() => {
    setActiveTab(defaultTab);
    // Chỉ đặt tab mặc định khi vào trang (đổi route), không ép lại mỗi lần re-render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTab]);

  const tabs: { id: TabType; label: string; icon: React.ComponentType<{ size?: number }>; count: number }[] = [
    { id: 'routes', label: 'Quản lý Tuyến đường', icon: RouteIcon, count: routes.length },
    { id: 'stops', label: 'Quản lý Trạm dừng', icon: MapPin, count: stops.length },
    { id: 'pricing', label: 'Thiết lập Giá vé', icon: DollarSign, count: prices.length },
  ];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div className="page-title-group">
          <h1>Quản lý Tuyến đường, Trạm dừng & Giá vé</h1>
          <p>Thêm/sửa/xóa tuyến, sắp xếp trạm dừng theo tuyến và thiết lập giá vé cho từng chặng.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <nav
          style={{
            display: 'flex',
            gap: '0.25rem',
            borderBottom: '1px solid var(--border-color, #e2e8f0)',
            padding: '0 1rem',
          }}
          aria-label="Tabs"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.85rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '0.05rem 0.5rem',
                    borderRadius: '999px',
                    background: isActive ? 'var(--primary-light)' : 'var(--bg-muted, #f1f5f9)',
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </nav>

        <div style={{ padding: '1.25rem' }}>
          {activeTab === 'routes' && <RouteTab />}
          {activeTab === 'stops' && <StopTab />}
          {activeTab === 'pricing' && <PricingTab />}
        </div>
      </div>
    </div>
  );
};
