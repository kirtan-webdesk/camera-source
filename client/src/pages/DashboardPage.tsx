import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useLogout } from '../hooks/useAuth';
import { useCameras, useCreateCamera, useDeleteCamera } from '../hooks/useCameras';

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { data: cameras = [], isLoading } = useCameras();
  const { mutate: createCamera } = useCreateCamera();
  const { mutate: deleteCamera } = useDeleteCamera();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', brand: '', model: '', resolution: '1080p', frameRate: 30, isActive: true });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createCamera(form);
    setShowForm(false);
    setForm({ name: '', brand: '', model: '', resolution: '1080p', frameRate: 30, isActive: true });
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <span style={styles.logo}>Camera Source</span>
        <div style={styles.userRow}>
          <span style={styles.userName}>{user?.name}</span>
          <button style={styles.logoutBtn} onClick={logout}>Logout</button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.titleRow}>
          <h2 style={styles.heading}>My Cameras</h2>
          <button style={styles.addBtn} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Camera'}
          </button>
        </div>

        {showForm && (
          <form style={styles.form} onSubmit={handleCreate}>
            {(['name', 'brand', 'model', 'resolution'] as const).map((field) => (
              <div key={field} style={styles.field}>
                <label style={styles.label}>{field.charAt(0).toUpperCase() + field.slice(1)}</label>
                <input
                  style={styles.input}
                  required
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                />
              </div>
            ))}
            <div style={styles.field}>
              <label style={styles.label}>Frame Rate</label>
              <input
                style={styles.input}
                type="number"
                value={form.frameRate}
                onChange={(e) => setForm({ ...form, frameRate: Number(e.target.value) })}
              />
            </div>
            <button style={styles.addBtn} type="submit">Save Camera</button>
          </form>
        )}

        {isLoading ? (
          <p>Loading cameras…</p>
        ) : cameras.length === 0 ? (
          <p style={styles.empty}>No cameras yet. Add one above.</p>
        ) : (
          <div style={styles.grid}>
            {cameras.map((cam) => (
              <div key={cam.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <strong>{cam.name}</strong>
                  <span style={{ ...styles.badge, background: cam.isActive ? '#d1fae5' : '#fee2e2', color: cam.isActive ? '#065f46' : '#991b1b' }}>
                    {cam.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p style={styles.cardText}>{cam.brand} · {cam.model}</p>
                <p style={styles.cardText}>{cam.resolution} @ {cam.frameRate}fps</p>
                {cam.location && <p style={styles.cardText}>📍 {cam.location}</p>}
                <button style={styles.deleteBtn} onClick={() => deleteCamera(cam.id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#f3f4f6', fontFamily: 'system-ui, sans-serif' },
  header: { background: '#1d4ed8', color: '#fff', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontWeight: 700, fontSize: '1.25rem' },
  userRow: { display: 'flex', alignItems: 'center', gap: '1rem' },
  userName: { fontSize: '0.9rem' },
  logoutBtn: { padding: '0.35rem 0.75rem', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: '6px', cursor: 'pointer' },
  main: { maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem' },
  titleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  heading: { margin: 0, fontSize: '1.5rem', color: '#111827' },
  addBtn: { padding: '0.5rem 1rem', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 },
  form: { background: '#fff', padding: '1.5rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: '1 1 180px' },
  label: { fontSize: '0.8rem', fontWeight: 600, color: '#374151' },
  input: { padding: '0.45rem 0.65rem', border: '1px solid #d1d5db', borderRadius: '6px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' },
  card: { background: '#fff', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: { fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: '999px' },
  cardText: { margin: 0, fontSize: '0.875rem', color: '#6b7280' },
  deleteBtn: { marginTop: '0.5rem', padding: '0.35rem', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: '3rem' },
};
