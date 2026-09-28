import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout = () => {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#0b0f19',
        backgroundImage: `
          radial-gradient(circle at 15% 50%, rgba(79, 70, 229, 0.15) 0%, transparent 45%),
          radial-gradient(circle at 85% 30%, rgba(124, 58, 237, 0.15) 0%, transparent 45%)
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative'
      }}
    >
      <Outlet />
    </div>
  );
};
