import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRegister } from '../hooks/useAuth';

export default function RegisterPage() {
  const { mutate: register, isPending, error } = useRegister();
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register(form);
  };

  return (
    <div style={styles.wrapper}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <h1 style={styles.title}>Camera Source</h1>
        <h2 style={styles.subtitle}>Create account</h2>

        {error && <p style={styles.error}>Registration failed. Please try again.</p>}

        <label style={styles.label}>Name</label>
        <input
          style={styles.input}
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

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
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />

        <button style={styles.btn} type="submit" disabled={isPending}>
          {isPending ? 'Creating account…' : 'Register'}
        </button>

        <p style={styles.link}>
          Have an account? <Link to="/login">Sign in</Link>
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
