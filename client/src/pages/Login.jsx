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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-dark-800 to-dark-900 px-4 py-8">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">
            <span className="text-primary-400">Lak</span><span className="text-accent-400">shya</span>
          </h1>
          <p className="text-gray-400 mt-2 text-sm tracking-wide uppercase">Tech-Fest Management Portal</p>
        </div>

        {/* Role Selector */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {roles.map(({ key, label, description, icon: Icon, gradient, ring, bg, text }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setSelectedRole(key); setEmail(''); setPassword(''); }}
              className={`relative group p-5 rounded-2xl border-2 transition-all duration-300 text-left backdrop-blur-xl
                ${selectedRole === key
                  ? `border-transparent ${ring} ring-2 bg-white/10 scale-[1.02] shadow-2xl`
                  : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 hover:scale-[1.01]'}`}
            >
              <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110`}>
                <Icon className={`w-6 h-6 ${text}`} />
              </div>
              <h3 className="text-white font-bold text-lg">{label}</h3>
              <p className="text-gray-400 text-xs mt-1 leading-relaxed">{description}</p>
              {selectedRole === key && (
                <div className={`absolute top-3 right-3 w-3 h-3 rounded-full bg-gradient-to-r ${gradient} animate-pulse`} />
              )}
            </button>
          ))}
        </div>

        {/* Login Form — slides in when a role is selected */}
        <div className={`transition-all duration-500 ease-out overflow-hidden ${selectedRole ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/10">
            <h2 className="text-xl font-bold text-white mb-1">Sign in as {activeRole?.label}</h2>
            <p className="text-gray-400 text-sm mb-6">{activeRole?.description}</p>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={activeRole?.placeholder}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 outline-none transition"
                />
              </div>
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-lg text-white font-semibold transition-all duration-200 disabled:opacity-50 shadow-lg ${activeRole?.btnClass}`}
              >
                {loading ? 'Signing in...' : `Sign In as ${activeRole?.label}`}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedRole(null)}
              className="w-full mt-4 text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Choose a different role
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
