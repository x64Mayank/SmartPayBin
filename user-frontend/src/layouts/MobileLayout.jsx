import React from 'react';
import { Outlet } from 'react-router-dom';

const MobileLayout = () => {
  return (
    <div className="min-h-screen bg-base-100 flex flex-col items-center">
      <main className="w-full max-w-xl flex-1 flex flex-col p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default MobileLayout;
