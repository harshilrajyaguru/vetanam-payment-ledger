import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import VetanamLogo from '../components/VetanamLogo.jsx';

export function NotFoundPage() {
  return (
    <div
      className="app-container"
      style={{ justifyContent: 'center', alignItems: 'center', padding: '2rem', textAlign: 'center' }}
    >
      <div style={{ maxWidth: '420px', width: '100%' }}>
        <VetanamLogo size={44} textSize="1.5rem" showTagline={true} />

        <div
          style={{
            width: 76, height: 76, borderRadius: '50%',
            background: 'var(--color-warning-bg)',
            border: '1px solid var(--color-warning-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '2rem auto 1.5rem',
            color: 'var(--color-warning)',
          }}
        >
          <AlertTriangle size={36} />
        </div>

        <h1 style={{ fontSize: '3.75rem', fontWeight: 800, letterSpacing: '-0.04em', margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
          404
        </h1>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.75rem', color: 'var(--text-primary)' }}>
          Page Not Found
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '2rem' }}>
          The page you requested does not exist or has been moved.
        </p>

        <Link to="/dashboard" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
          <Home size={18} /> Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
