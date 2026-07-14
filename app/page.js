'use client';
import { useState } from 'react';

const EXAMPLES = [
  'backup camera for 2015 Chevy Silverado',
  '2019 Ford F150 reverse camera',
  'tailgate cam for chevy silverado',
  'backup camera for 2022 GMC Sierra',
  'best camera for camping',
  '2016 Toyota Tacoma dashcam',
];

export default function Home() {
  const [query, setQuery]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');

  async function search(q) {
    const sentence = q || query;
    if (!sentence.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res  = await fetch('/api/search', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ sentence }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'API error'); }
      else         { setResult(data); }
    } catch (e) {
      setError('Request failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={s.main}>
      <div style={s.container}>
        <div style={s.header}>
          <h1 style={s.title}>Camera Source — AI Search API</h1>
          <p style={s.sub}>Test the vehicle search endpoint</p>
        </div>

        <div style={s.card}>
          <label style={s.label}>Search query</label>
          <div style={s.row}>
            <input
              style={s.input}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="e.g. backup camera for 2015 Chevy Silverado"
            />
            <button style={s.btn} onClick={() => search()} disabled={loading}>
              {loading ? 'Searching…' : 'Search'}
            </button>
          </div>

          <div style={s.chips}>
            {EXAMPLES.map(ex => (
              <button key={ex} style={s.chip} onClick={() => { setQuery(ex); search(ex); }}>
                {ex}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={s.errorBox}>{error}</div>
        )}

        {result && (
          <div style={s.card}>
            <div style={s.grid4}>
              <Metric label="Make"    value={result.fields?.make  || '—'} />
              <Metric label="Model"   value={result.fields?.model || '—'} />
              <Metric label="Year"    value={result.fields?.year  || '—'} />
              <Metric label="Context" value={result.fields?.context} badge />
            </div>

            <div style={s.divider} />

            <Row label="Search query built" value={result.searchQuery || '—'} mono />
            <Row label="Fallback"           value={result.isFallback ? 'Yes — redirects to search page' : 'No — direct match'} />
            <Row label="Fallback URL"       value={result.fallbackUrl || '—'} mono />

            <p style={s.rawLabel}>Raw JSON response</p>
            <pre style={s.pre}>{JSON.stringify(result, null, 2)}</pre>
          </div>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value, badge }) {
  const isIn  = value === 'IN';
  const isOut = value === 'OUT';
  return (
    <div style={s.metric}>
      <div style={s.metricLabel}>{label}</div>
      {badge ? (
        <span style={isIn ? s.badgeIn : isOut ? s.badgeOut : s.badgeNeutral}>
          {value || '—'}
        </span>
      ) : (
        <div style={s.metricValue}>{value}</div>
      )}
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div style={s.rowItem}>
      <span style={s.rowLabel}>{label}</span>
      <span style={mono ? s.rowMono : s.rowValue}>{value}</span>
    </div>
  );
}

const s = {
  main:         { minHeight: '100vh', background: '#f5f5f4', fontFamily: 'system-ui, sans-serif', padding: '2rem 1rem' },
  container:    { maxWidth: 680, margin: '0 auto' },
  header:       { marginBottom: '1.5rem' },
  title:        { fontSize: 22, fontWeight: 600, color: '#1c1c1a', margin: '0 0 4px' },
  sub:          { fontSize: 14, color: '#6b6b68', margin: 0 },
  card:         { background: '#fff', border: '1px solid #e5e5e2', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' },
  label:        { fontSize: 13, color: '#6b6b68', display: 'block', marginBottom: 6 },
  row:          { display: 'flex', gap: 8, marginBottom: 12 },
  input:        { flex: 1, height: 38, padding: '0 12px', border: '1px solid #d4d4d0', borderRadius: 8, fontSize: 14, outline: 'none', color: '#1c1c1a', background: '#fff' },
  btn:          { height: 38, padding: '0 18px', background: '#1c1c1a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  chips:        { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip:         { fontSize: 12, padding: '4px 10px', borderRadius: 20, border: '1px solid #d4d4d0', background: '#f5f5f4', color: '#6b6b68', cursor: 'pointer' },
  errorBox:     { background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem 1rem', color: '#dc2626', fontSize: 13, marginBottom: '1rem' },
  grid4:        { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: '1rem' },
  metric:       { background: '#f5f5f4', borderRadius: 8, padding: '0.75rem' },
  metricLabel:  { fontSize: 11, color: '#9ca3a0', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' },
  metricValue:  { fontSize: 16, fontWeight: 500, color: '#1c1c1a' },
  badgeIn:      { display: 'inline-block', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#16a34a' },
  badgeOut:     { display: 'inline-block', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: '#fee2e2', color: '#dc2626' },
  badgeNeutral: { display: 'inline-block', fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: '#f5f5f4', color: '#6b6b68' },
  divider:      { borderTop: '1px solid #e5e5e2', margin: '1rem 0' },
  rowItem:      { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '5px 0', borderBottom: '1px solid #f5f5f4', gap: 16 },
  rowLabel:     { fontSize: 13, color: '#6b6b68', flexShrink: 0 },
  rowValue:     { fontSize: 13, color: '#1c1c1a', textAlign: 'right' },
  rowMono:      { fontSize: 12, color: '#1c1c1a', fontFamily: 'monospace', textAlign: 'right', wordBreak: 'break-all' },
  rawLabel:     { fontSize: 12, color: '#9ca3a0', margin: '1rem 0 4px' },
  pre:          { background: '#f5f5f4', border: '1px solid #e5e5e2', borderRadius: 8, padding: '0.75rem', fontSize: 12, fontFamily: 'monospace', overflow: 'auto', margin: 0, color: '#1c1c1a', whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
};
