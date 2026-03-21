import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineChartBar, HiOutlineCalendar, HiOutlineUsers, HiOutlineUserGroup, HiOutlineIdentification, HiOutlineTicket, HiOutlineCreditCard, HiOutlineClipboardList, HiOutlineDocumentDownload, HiOutlineShieldCheck, HiOutlineMail, HiOutlineLogout, HiOutlineX, HiOutlineTag } from 'react-icons/hi';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: HiOutlineChartBar },
  { to: '/events', label: 'Events', icon: HiOutlineCalendar },
  { to: '/coordinators', label: 'Coordinators', icon: HiOutlineUserGroup },
  { to: '/organizers', label: 'Organizers', icon: HiOutlineIdentification },
  { to: '/users', label: 'Users', icon: HiOutlineUsers },
  { to: '/registrations', label: 'Registrations', icon: HiOutlineTicket },
  { to: '/referrals', label: 'Referrals', icon: HiOutlineTag },
  { to: '/payments', label: 'Payments', icon: HiOutlineCreditCard },
  { to: '/audit-logs', label: 'Audit Logs', icon: HiOutlineShieldCheck },
  { to: '/export', label: 'Export', icon: HiOutlineDocumentDownload },
  { to: '/bulk-email', label: 'Bulk Email', icon: HiOutlineMail },
];

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-sidebar flex flex-col z-50 transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo + close button */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-light">
          <div className="flex items-center">
            <span className="text-2xl font-extrabold text-primary-400 tracking-tight">Lakshya</span>
            <span className="ml-1.5 text-xs font-medium text-gray-400 uppercase tracking-widest mt-1">Admin</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-white transition-colors">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'text-gray-400 hover:bg-sidebar-hover hover:text-gray-200'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-sidebar-light">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.name?.[0] || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="text-gray-400 hover:text-red-400 transition-colors" title="Logout">
              <HiOutlineLogout className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
