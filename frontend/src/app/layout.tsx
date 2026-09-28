import type { Metadata } from 'next';
import './globals.css';
import { RouteProvider } from '@/context/RouteContext';
import { ToastContainer } from '@/components/common/Toast';

export const metadata: Metadata = {
  title: 'Hệ thống Quản lý Vận hành Xe khách - Tuyến đường & Giá vé',
  description: 'Module điều hành tuyến đường, trạm dừng và ma trận giá vé xe khách liên tỉnh chuyên nghiệp',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="bg-slate-50 text-slate-900 antialiased selection:bg-brand-500 selection:text-white">
        <RouteProvider>
          {children}
          <ToastContainer />
        </RouteProvider>
      </body>
    </html>
  );
}
