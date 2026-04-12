import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineChartBar, HiOutlineCalendar, HiOutlineUsers, HiOutlineUserGroup, HiOutlineTicket, HiOutlineCreditCard, HiOutlineDocumentDownload, HiOutlineShieldCheck, HiOutlineMail, HiOutlineLogout, HiOutlineX, HiOutlineTag, HiOutlineInboxIn, HiOutlineReceiptTax, HiOutlineClipboardCheck, HiOutlineSparkles, HiOutlineLightningBolt } from 'react-icons/hi';

const links = [
  { to: '/dashboard', label: 'Dashboard', icon: HiOutlineChartBar },
  { to: '/events', label: 'Events', icon: HiOutlineCalendar },
  { to: '/coordinators', label: 'Coordinators', icon: HiOutlineUserGroup },
  { to: '/users', label: 'Users', icon: HiOutlineUsers },
  { to: '/registrations', label: 'Registrations', icon: HiOutlineTicket },
  { to: '/referrals', label: 'Referrals', icon: HiOutlineTag },
  { to: '/payments', label: 'Payments', icon: HiOutlineCreditCard },
  { to: '/orders', label: 'Orders', icon: HiOutlineReceiptTax },
  { to: '/tickets-list', label: 'Tickets', icon: HiOutlineClipboardCheck },
  { to: '/teams', label: 'Teams', icon: HiOutlineUserGroup },
  { to: '/alumni', label: 'Alumni', icon: HiOutlineSparkles },
  { to: '/hackathon', label: 'Hackathon', icon: HiOutlineLightningBolt, superadminOnly: true },
  { to: '/audit-logs', label: 'Audit Logs', icon: HiOutlineShieldCheck, superadminOnly: true },
  { to: '/export', label: 'Export', icon: HiOutlineDocumentDownload },
  { to: '/bulk-email', label: 'Bulk Email', icon: HiOutlineMail, superadminOnly: true },
  { to: '/bulk-email/jobs', label: 'Email Jobs', icon: HiOutlineInboxIn, superadminOnly: true },
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
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-950 border-r border-slate-900 flex flex-col z-50 transform transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        {/* Logo + close button */}
        <div className="h-20 flex items-center justify-between px-8 border-b border-slate-900">
          <div className="flex items-center group cursor-pointer">
            <div className="relative">
              <span className="text-xl font-bold text-white tracking-tight group-hover:text-primary-400 transition-colors">Lakshya</span>
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary-500 group-hover:w-full transition-all duration-300"></div>
            </div>
            <span className="ml-2 px-2 py-0.5 rounded-lg text-[10px] font-black bg-primary-500/10 text-primary-400 uppercase tracking-widest border border-primary-500/20">Admin</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-900 transition-all">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
          {links.map((item, idx) => {
            if (item.superadminOnly && user?.role !== 'superadmin') return null;
            if (item.type === 'divider') {
              return (
                <div key={`divider-${idx}`} className="pt-6 pb-2 px-4">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{item.label}</p>
                </div>
              );
            }
            const { to, label, icon: Icon } = item;
            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-400'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span className="relative z-10">{label}</span>
                    {isActive && (
                      <div className="absolute left-0 w-1 h-5 bg-primary-500 rounded-r-full"></div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-6 border-t border-slate-900 bg-slate-950">
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm shadow-sm group-hover:border-primary-500/50 group-hover:text-primary-400 transition-all">
                {user?.name?.[0] || 'A'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full shadow-sm"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-widest">{user?.role || 'Admin'}</p>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Logout">
              <HiOutlineLogout className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
