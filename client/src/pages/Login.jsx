import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlineShieldCheck, HiOutlineClipboardList } from 'react-icons/hi';

const roles = [
  {
    key: 'admin',
    label: 'Admin',
    description: 'Full access to manage events, coordinators, users & analytics',
    icon: HiOutlineShieldCheck,
    gradient: 'from-primary-600 to-primary-800',
    ring: 'ring-primary-400',
    bg: 'bg-primary-600/20',
    text: 'text-primary-400',
    btnClass: 'bg-primary-600 hover:bg-primary-700 shadow-primary-600/30',
    placeholder: 'admin@lakshya.com',
  },
  {
    key: 'coordinator',
    label: 'Coordinator',
    description: 'Manage assigned events, participants & scan QR tickets',
    icon: HiOutlineClipboardList,
    gradient: 'from-accent-600 to-accent-800',
    ring: 'ring-accent-400',
    bg: 'bg-accent-600/20',
    text: 'text-accent-400',
    btnClass: 'bg-accent-600 hover:bg-accent-700 shadow-accent-600/30',
    placeholder: 'coordinator@lakshya.com',
  },
];

export default function Login() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true);
    try {
      await login(email, password, selectedRole);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error('Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const activeRole = roles.find((r) => r.key === selectedRole);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden px-4 py-8">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 -left-48 w-96 h-96 bg-primary-600/10 rounded-full blur-[128px] animate-pulse"></div>
      <div className="absolute bottom-0 -right-48 w-96 h-96 bg-primary-600/10 rounded-full blur-[128px] animate-pulse delay-1000"></div>
      
      <div className="w-full max-w-lg relative z-10 animate-fade-in py-12">
        {/* Logo Section */}
        <div className="text-center mb-12">
          <div className="inline-block p-4 rounded-3xl bg-white/[0.03] border border-white/5 backdrop-blur-xl mb-6 shadow-2xl">
            <h1 className="text-5xl font-black tracking-tighter">
              <span className="text-white">LAK</span>
              <span className="bg-gradient-to-tr from-primary-400 to-primary-600 bg-clip-text text-transparent">SHYA</span>
            </h1>
          </div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em]">Core Command Interface</p>
        </div>

        {/* Role Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10 px-2 sm:px-0">
          {roles.map(({ key, label, description, icon: Icon, bg, text }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setSelectedRole(key); setEmail(''); setPassword(''); }}
              className={`relative group p-6 rounded-[32px] border transition-all duration-500 text-left backdrop-blur-3xl
                ${selectedRole === key
                  ? `border-primary-500/50 bg-primary-500/10 shadow-[0_0_40px_-10px_rgba(59,130,246,0.3)] scale-[1.05]`
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 hover:scale-[1.02]'}`}
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${selectedRole === key ? 'bg-primary-500 text-white shadow-lg shadow-primary-900/40' : `${bg} ${text}`} flex items-center justify-center mb-4 sm:mb-6 transition-all duration-500 group-hover:rotate-6`}>
                <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h3 className="text-white font-black text-lg tracking-tight leading-none">{label}</h3>
              <p className="text-slate-400 text-[9px] sm:text-[10px] font-bold mt-2 uppercase tracking-wider leading-relaxed">{description.slice(0, 40)}...</p>
              
              {selectedRole === key && (
                <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary-400 animate-ping" />
              )}
            </button>
          ))}
        </div>

        {/* Auth Interface */}
        <div className={`transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden ${selectedRole ? 'max-h-[600px] opacity-100 mt-8' : 'max-h-0 opacity-0'}`}>
          <form onSubmit={handleSubmit} className="bg-slate-900/60 backdrop-blur-3xl rounded-[40px] p-8 sm:p-10 shadow-2xl border border-slate-700/50 relative group">
            <div className="flex justify-center mb-8">
              <div className="px-6 py-2 rounded-2xl bg-primary-500/10 border border-primary-500/30 text-primary-400 text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                Authenticating {activeRole?.label}
              </div>
            </div>
            
            <div className="space-y-6 sm:space-y-8 mt-4">
              <div className="space-y-2">
                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Identity Token (Email)</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={activeRole?.placeholder}
                  className="input-field py-3 sm:py-4 px-5 sm:px-6 text-xs sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Master Key (Password)</label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="input-field py-3 sm:py-4 px-5 sm:px-6 text-xs sm:text-sm"
                />
              </div>
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="w-full py-3 sm:py-4 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-300 disabled:opacity-50 shadow-2xl shadow-primary-900/40 active:scale-95"
              >
                {loading ? 'Initializing Session...' : 'Authorize Login'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRole(null)}
              className="w-full mt-8 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-[0.3em] transition-all py-2 rounded-xl hover:bg-white/5"
            >
              ← Terminate Role selection
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
