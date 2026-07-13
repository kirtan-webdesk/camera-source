import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLogin } from '../hooks/useAuth';

export default function LoginPage() {
  const { mutate: login, isPending, error } = useLogin();
  const [form, setForm] = useState({ email: '', password: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(form);
  };

  return (
    <div style={styles.wrapper}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h1 style={styles.title}>Camera Source</h1>
        <h2 style={styles.subtitle}>Sign in</h2>

        {error && <p style={styles.error}>Invalid email or password</p>}

        <label style={styles.label}>Email</label>
        <input
          style={styles.input}
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        <label style={styles.label}>Password</label>
        <input
          style={styles.input}
          type="password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button style={styles.btn} type="submit" disabled={isPending}>
          {isPending ? 'Signing in…' : 'Sign in'}
        </button>

        <p style={styles.link}>
          No account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f3f4f6' },
  card: { background: '#fff', padding: '2rem', borderRadius: '8px', width: '100%', maxWidth: '400px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  title: { margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1d4ed8' },
  subtitle: { margin: 0, fontSize: '1.1rem', color: '#374151' },
  label: { fontSize: '0.875rem', fontWeight: 600, color: '#374151' },
  input: { padding: '0.5rem 0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' },
  btn: { padding: '0.6rem', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '1rem', cursor: 'pointer', marginTop: '0.25rem' },
  error: { color: '#dc2626', fontSize: '0.875rem', margin: 0 },
  link: { textAlign: 'center', fontSize: '0.875rem', color: '#6b7280', margin: 0 },
};
