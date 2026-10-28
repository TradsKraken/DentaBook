import React, { useState, useEffect } from 'react';
import { Activity, Database, Server, Globe, CheckCircle2, Clock } from 'lucide-react';

export default function App() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHealth(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('API health check error:', err);
        setHealth({ status: 'unreachable', error: err.message });
        setLoading(false);
      });
  }, []);

  return (
    <div className="container">
      <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
          DentaBook
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          Dental Clinic Discovery, Price Estimation & Online Appointment System
        </p>
      </header>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <CheckCircle2 color="var(--success)" size={28} />
          <h2 style={{ fontSize: '1.4rem' }}>Docker & Environment Infrastructure Initialized</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          The Docker Compose environment is properly configured with multi-stage Nginx builds, Node.js Express API, and persistent PostgreSQL database storage.
        </p>

        <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Service Connection Status:</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Globe size={20} color="var(--primary)" />
              <strong>Frontend Client</strong>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--success)' }}>Active (React + Vite + Nginx)</p>
          </div>

          <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Server size={20} color="var(--primary)" />
              <strong>Backend API</strong>
            </div>
            <p style={{ fontSize: '0.9rem', color: loading ? 'var(--text-muted)' : health?.status === 'healthy' ? 'var(--success)' : '#ef4444' }}>
              {loading ? 'Checking status...' : health?.status === 'healthy' ? 'Connected (Node 22 / Express)' : 'Connecting / Offline'}
            </p>
          </div>

          <div style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: '#f8fafc' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Database size={20} color="var(--primary)" />
              <strong>Database (PostgreSQL)</strong>
            </div>
            <p style={{ fontSize: '0.9rem', color: loading ? 'var(--text-muted)' : health?.database?.connected ? 'var(--success)' : '#ef4444' }}>
              {loading ? 'Checking status...' : health?.database?.connected ? `Connected (${health.database.database_name})` : 'Connecting / Pending'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

