'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Lock, User, Eye, EyeOff } from 'lucide-react';
import { settingsDB, usersDB } from '@/lib/db';
import { User as UserType } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore(s => s.login);
  const [role, setRole] = useState<'admin' | 'cashier'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shopName, setShopName] = useState('LaundryTO');
  const [dbUsers, setDbUsers] = useState<UserType[]>([]);

  useEffect(() => {
    setShopName(settingsDB.get().name);
    setDbUsers(usersDB.getAll());
  }, []);

  const handleRoleChange = (r: 'admin' | 'cashier') => {
    setRole(r);
    const user = dbUsers.find(u => u.role === r);
    setUsername(user ? user.username : r);
    
    const defaultPasswords = { admin: 'admin123', cashier: 'cashier123' };
    if (user && user.password === defaultPasswords[r]) {
      setPassword(user.password);
    } else {
      setPassword('');
    }
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 500));
    const ok = login(username, password);
    if (ok) router.push('/dashboard');
    else setError('Invalid username or password.');
    setLoading(false);
  };

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">
          <div className="login-logo-icon" style={{ overflow: 'hidden', background: '#ffffff', border: '1px solid var(--border-light)', borderRadius: '50%' }}>
            <img src="/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1>{shopName}</h1>
          <p>Premium Laundry & Dry Clean Management</p>
        </div>

        <div className="role-selector">
          <button type="button" className={`role-btn ${role === 'admin' ? 'active' : ''}`} onClick={() => handleRoleChange('admin')}>
            🛡️ Admin
          </button>
          <button type="button" className={`role-btn ${role === 'cashier' ? 'active' : ''}`} onClick={() => handleRoleChange('cashier')}>
            💼 Cashier
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group">
            <label className="input-label">Username</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input" style={{ paddingLeft: 38 }} value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" required />
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input className="input" style={{ paddingLeft: 38, paddingRight: 44 }} type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && <p style={{ color: 'var(--danger)', fontSize: 13, background: 'var(--danger-light)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--danger-border)' }}>{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 8, justifyContent: 'center', width: '100%', padding: '12px' }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            Demo: admin / admin123 &nbsp;|&nbsp; cashier / cashier123
          </p>
        </div>
      </form>
    </div>
  );
}
