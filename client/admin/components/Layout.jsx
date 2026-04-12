import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { HiOutlineMenuAlt2 } from 'react-icons/hi';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-primary-500/30">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Mobile top-bar with hamburger */}
      <div className="lg:hidden sticky top-0 z-30 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 shadow-lg shadow-black/20">
        <div className="flex items-center h-16 px-6">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all mr-3">
            <HiOutlineMenuAlt2 className="w-6 h-6" />
          </button>
          <div className="flex items-center">
            <span className="text-xl font-black text-white tracking-tighter">Lakshya</span>
            <span className="ml-2 px-1 py-0.5 rounded text-[8px] font-black bg-primary-500/10 text-primary-400 uppercase tracking-widest leading-none">Admin</span>
          </div>
        </div>
      </div>

      <main className="lg:ml-64 min-h-screen transition-all duration-300">
        <div className="p-4 sm:p-8 lg:p-10 max-w-7xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
