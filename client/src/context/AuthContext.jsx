import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState(localStorage.getItem('selectedRole') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const storedRole = localStorage.getItem('selectedRole');
    if (token) {
      api.get('/auth/me')
        .then(({ data }) => {
          setUser(data.user);
          setSelectedRole(storedRole);
        })
        .catch(() => { localStorage.clear(); setUser(null); setSelectedRole(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email, password, role) => {
    const { data } = await api.post('/auth/login', { email, password });

    if (role === 'admin' && data.user.role !== 'admin' && data.user.role !== 'superadmin') {
      throw new Error('Access denied. Admin credentials required.');
    }
    if (role === 'coordinator' && data.user.role !== 'coordinator' && data.user.role !== 'admin' && data.user.role !== 'superadmin') {
      throw new Error('Access denied. Coordinator credentials required.');
    }

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('selectedRole', role);
    setUser(data.user);
    setSelectedRole(role);
    return data;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setSelectedRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, selectedRole, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}
