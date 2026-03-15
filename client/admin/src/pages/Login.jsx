import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sidebar via-dark-800 to-sidebar-light px-4">
      <div className="w-full max-w-md">
        {/* Logo card */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-primary-400 tracking-tight">Lakshya</h1>
          <p className="text-gray-400 mt-2 text-sm tracking-wide uppercase">Admin Portal</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/10">
          <h2 className="text-xl font-bold text-white mb-6">Sign in to your account</h2>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@lakshya.com"
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 outline-none transition" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/30 outline-none transition" />
            </div>
            <button id="login-submit" type="submit" disabled={loading}
              className="w-full py-3 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-all duration-200 disabled:opacity-50 shadow-lg shadow-primary-600/30">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
