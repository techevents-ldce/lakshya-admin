import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HiOutlineChartBar, HiOutlineCalendar, HiOutlineUsers, HiOutlineUserGroup, HiOutlineTicket, HiOutlineCreditCard, HiOutlineDocumentDownload, HiOutlineShieldCheck, HiOutlineMail, HiOutlineLogout, HiOutlineX, HiOutlineTag, HiOutlineInboxIn, HiOutlineReceiptTax, HiOutlineClipboardCheck, HiOutlineSparkles, HiOutlineLightningBolt } from 'react-icons/hi';

const links = [
  { type: 'divider', label: 'Systems Intelligence' },
  { to: '/dashboard', label: 'Dashboard Control', icon: HiOutlineChartBar },
  
  { type: 'divider', label: 'Personnel Registry' },
  { to: '/users', label: 'User Directory', icon: HiOutlineUsers },
  { to: '/coordinators', label: 'Coordinator Network', icon: HiOutlineUserGroup },
  { to: '/alumni', label: 'Alumni Network', icon: HiOutlineSparkles },
  
  { type: 'divider', label: 'Event Logistics' },
  { to: '/events', label: 'Event Specifications', icon: HiOutlineCalendar },
  { to: '/registrations', label: 'Participant Registry', icon: HiOutlineTicket },
  { to: '/teams', label: 'Active Teams', icon: HiOutlineUserGroup },
  { to: '/tickets-list', label: 'Credential List', icon: HiOutlineClipboardCheck },
  
  { type: 'divider', label: 'Financial Audit' },
  { to: '/payments', label: 'Payment Records', icon: HiOutlineCreditCard },
  { to: '/orders', label: 'Transaction Nexus', icon: HiOutlineReceiptTax },
  { to: '/referrals', label: 'Referral Alpha', icon: HiOutlineTag },
  
  { type: 'divider', label: 'Communication Hub' },
  { to: '/bulk-email', label: 'Institutional Dispatch', icon: HiOutlineMail, superadminOnly: true },
  { to: '/bulk-email/jobs', label: 'Dispatch Logs', icon: HiOutlineInboxIn, superadminOnly: true },
  
  { type: 'divider', label: 'Security & Export' },
  { to: '/audit-logs', label: 'System Audit Logs', icon: HiOutlineShieldCheck, superadminOnly: true },
  { to: '/export', label: 'Data Export Nexus', icon: HiOutlineDocumentDownload },
  { to: '/hackathon', label: 'Hackathon Core', icon: HiOutlineLightningBolt, superadminOnly: true },
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
        <div className="h-20 flex items-center justify-between px-8 border-b border-white/[0.05]">
          <div className="flex items-center group cursor-pointer">
            <div className="relative">
              <span className="text-xl font-bold text-white tracking-tight">Lakshya</span>
            </div>
            <span className="ml-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-400 uppercase tracking-wider border border-indigo-500/20">Admin</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-white hover:bg-slate-900 transition-all">
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1.5 custom-scrollbar">
          {links.map((item, idx) => {
            if (item.superadminOnly && user?.role !== 'superadmin') return null;
            if (item.type === 'divider') {
              return (
                <div key={`divider-${idx}`} className="pt-8 pb-3 px-4 first:pt-2">
                  <p className="text-[10px] font-bold text-slate-700 uppercase tracking-[0.2em] border-b border-white/[0.03] pb-2">{item.label}</p>
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
                  `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-indigo-500/10 text-indigo-400'
                      : 'text-slate-400 hover:bg-white/[0.03] hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                    <span className="relative z-10">{label}</span>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-6 border-t border-white/[0.05] bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm shadow-sm group-hover:border-indigo-500/50 group-hover:text-indigo-400 transition-all">
                {user?.name?.[0] || 'A'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full shadow-sm"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] font-bold text-slate-500 truncate uppercase tracking-wider">{user?.role || 'Admin'}</p>
            </div>
            <button onClick={handleLogout} className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Logout">
              <HiOutlineLogout className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
