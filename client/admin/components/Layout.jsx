import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { HiOutlineMenuAlt2 } from 'react-icons/hi';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f172a]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile top-bar with hamburger */}
      <div className="lg:hidden sticky top-0 z-30 bg-slate-900 border-b border-slate-700/60 shadow-sm">
        <div className="flex items-center h-14 px-4">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-400 hover:text-slate-200 mr-3">
            <HiOutlineMenuAlt2 className="w-6 h-6" />
          </button>
          <span className="text-lg font-extrabold text-primary-400 tracking-tight">Lakshya</span>
          <span className="ml-1 text-[10px] uppercase tracking-wider text-slate-500 font-semibold mt-0.5">Admin</span>
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
