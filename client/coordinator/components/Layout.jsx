import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineCalendar, HiOutlineLogout, HiOutlineMenuAlt2, HiOutlineX } from 'react-icons/hi';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-3 sm:gap-6">
              <span className="text-xl font-extrabold tracking-tight"><span className="text-primary-600">Lak</span><span className="text-accent-600">shya</span></span>
              <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold hidden sm:inline">Coordinator</span>
              <NavLink to="/dashboard" className={({ isActive }) => `text-sm font-medium px-3 py-1.5 rounded-md hidden sm:flex items-center gap-1.5 ${isActive ? 'bg-accent-50 text-accent-700' : 'text-gray-600 hover:text-gray-900'}`}>
                <HiOutlineCalendar className="w-4 h-4" /> My Events
              </NavLink>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-accent-600 flex items-center justify-center text-white font-bold text-sm">{user?.name?.[0] || 'C'}</div>
                <span className="text-sm font-medium text-gray-700">{user?.name}</span>
              </div>
              <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 transition-colors hidden sm:block" title="Logout">
                <HiOutlineLogout className="w-5 h-5" />
              </button>
              {/* Mobile hamburger */}
              <button onClick={() => setMenuOpen(!menuOpen)} className="sm:hidden text-gray-600 hover:text-gray-900">
                {menuOpen ? <HiOutlineX className="w-6 h-6" /> : <HiOutlineMenuAlt2 className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        {menuOpen && (
          <div className="sm:hidden border-t border-gray-100 bg-white shadow-lg">
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="w-8 h-8 rounded-full bg-accent-600 flex items-center justify-center text-white font-bold text-sm">{user?.name?.[0] || 'C'}</div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              <NavLink to="/dashboard" onClick={() => setMenuOpen(false)} className={({ isActive }) => `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium ${isActive ? 'bg-accent-50 text-accent-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                <HiOutlineCalendar className="w-4 h-4" /> My Events
              </NavLink>
              <button onClick={() => { setMenuOpen(false); handleLogout(); }} className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 w-full text-left">
                <HiOutlineLogout className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        )}
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
}
