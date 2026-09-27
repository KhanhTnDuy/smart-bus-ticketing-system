import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { RouteProvider } from './context/RouteContext';
import { AppRoutes } from './routes/AppRoutes';
import './styles/index.css';
import './styles/layout.css';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <RouteProvider>
            <AppRoutes />
          </RouteProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
