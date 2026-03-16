import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { HiOutlineMenuAlt2 } from 'react-icons/hi';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile top-bar with hamburger */}
      <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900 mr-3">
            <HiOutlineMenuAlt2 className="w-6 h-6" />
          </button>
          <span className="text-lg font-extrabold text-primary-600 tracking-tight">Lakshya</span>
          <span className="ml-1 text-[10px] uppercase tracking-wider text-gray-400 font-semibold mt-0.5">Admin</span>
        </div>
      </div>

      <main className="lg:ml-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
