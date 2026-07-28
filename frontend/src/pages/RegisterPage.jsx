import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import VetanamLogo from '../components/VetanamLogo.jsx';
import { Mail, Lock, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await register({ email, password });
      if (res.success) {
        navigate('/dashboard');
      } else {
        const errObj = res.error;
        if (errObj?.details?.issues?.length) {
          setError(errObj.details.issues.map((i) => i.message).join(' • '));
        } else {
          setError(errObj?.message || (typeof errObj === 'string' ? errObj : 'Registration failed.'));
        }
      }
    } catch (err) {
      const errObj = err.response?.data?.error;
      if (errObj?.details?.issues?.length) {
        setError(errObj.details.issues.map((i) => i.message).join(' • '));
      } else {
        setError(errObj?.message || err.message || 'Registration failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const passwordsMatch = confirmPassword && password === confirmPassword;

  return (
    <div
      style={{
        minHeight: '88vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1rem',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <VetanamLogo size={44} textSize="1.5rem" showTagline={true} />
          <h2 style={{ marginTop: '1.25rem', fontSize: '1.4rem', fontWeight: 800 }}>
            Create Your Account
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Instant double-entry wallet creation
          </p>
        </div>

        {/* Register Card */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Email Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute', left: '1rem', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)',
                    display: 'flex', pointerEvents: 'none',
                  }}
                >
                  <Mail size={18} />
                </span>
                <input
                  id="reg-email"
                  type="email"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute', left: '1rem', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)',
                    display: 'flex', pointerEvents: 'none',
                  }}
                >
                  <Lock size={18} />
                </span>
                <input
                  id="reg-password"
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm-password">
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute', left: '1rem', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)',
                    display: 'flex', pointerEvents: 'none',
                  }}
                >
                  <Lock size={18} />
                </span>
                <input
                  id="reg-confirm-password"
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '2.5rem' }}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {passwordsMatch && (
                  <span
                    style={{
                      position: 'absolute', right: '1rem', top: '50%',
                      transform: 'translateY(-50%)', color: 'var(--color-success)',
                      display: 'flex', pointerEvents: 'none',
                    }}
                  >
                    <CheckCircle2 size={18} />
                  </span>
                )}
              </div>
            </div>

            {/* Role Notice */}
            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                background: 'var(--bg-elevated)',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              🔒 Security policy: All public registrations are assigned standard <strong>USER</strong> role.
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>Creating Account...</>
              ) : (
                <>
                  <UserPlus size={18} /> Register Account
                </>
              )}
            </button>
          </form>

          {/* Footer Link */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '1.75rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
            }}
          >
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--brand-indigo)', fontWeight: 600 }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
