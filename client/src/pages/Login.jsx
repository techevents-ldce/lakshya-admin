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
      const message = err.response?.data?.message || 'Invalid credentials';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const activeRole = roles.find((r) => r.key === selectedRole);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] relative overflow-hidden px-4 py-8">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 -left-48 w-96 h-96 bg-primary-600/10 rounded-full blur-[128px]"></div>
      <div className="absolute bottom-0 -right-48 w-96 h-96 bg-primary-600/10 rounded-full blur-[128px]"></div>
      
      <div className="w-full max-w-lg relative z-10 animate-fade-in py-12">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-block p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md mb-4 shadow-xl">
            <h1 className="text-4xl font-bold tracking-tight">
              <span className="text-white">LAK</span>
              <span className="bg-gradient-to-tr from-indigo-400 to-indigo-600 bg-clip-text text-transparent">SHYA</span>
            </h1>
          </div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Admin Portal</p>
        </div>

        {/* Role Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 px-2 sm:px-0">
          {roles.map(({ key, label, description, icon: Icon, bg, text }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setSelectedRole(key); setEmail(''); setPassword(''); }}
              className={`relative group p-6 rounded-2xl border transition-all duration-300 text-left backdrop-blur-lg
                ${selectedRole === key
                  ? `border-indigo-500/50 bg-indigo-500/10 shadow-lg scale-[1.02]`
                  : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'}`}
            >
              <div className={`w-12 h-12 rounded-xl ${selectedRole === key ? 'bg-indigo-600 text-white shadow-md' : `${bg} ${text}`} flex items-center justify-center mb-4 transition-all duration-300`}>
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-white font-bold text-lg tracking-tight leading-none">{label}</h3>
              <p className="text-slate-400 text-xs font-medium mt-2 leading-relaxed">{description.slice(0, 50)}...</p>
            </button>
          ))}
        </div>

        {/* Auth Interface */}
        <div className={`transition-all duration-500 ease-out overflow-hidden ${selectedRole ? 'max-h-[600px] opacity-100 mt-6' : 'max-h-0 opacity-0'}`}>
          <form onSubmit={handleSubmit} className="bg-slate-900/80 backdrop-blur-xl rounded-2xl p-8 sm:p-10 shadow-2xl border border-white/[0.05] relative group">
            <div className="flex justify-center mb-6">
              <div className="px-5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold flex items-center gap-2">
                Authenticating as {activeRole?.label}
              </div>
            </div>
            
            <div className="space-y-6 mt-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={activeRole?.placeholder}
                  className="input-field py-3 px-5 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="input-field py-3 px-5 text-sm"
                />
              </div>
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-xs uppercase tracking-wider shadow-sm"
              >
                {loading ? 'Verifying Credentials...' : 'Sign In to Dashboard'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRole(null)}
              className="w-full mt-6 text-xs font-semibold text-slate-500 hover:text-white transition-all py-2 rounded-lg hover:bg-white/[0.02]"
            >
              ← Back to roles
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
