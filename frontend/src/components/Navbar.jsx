import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import VetanamLogo from './VetanamLogo.jsx';
import AddFundsModal from './AddFundsModal.jsx';
import {
  LayoutDashboard,
  Send,
  PlusCircle,
  History,
  Bell,
  ShieldAlert,
  LogOut,
} from 'lucide-react';

export function Navbar() {
  const { user, logout, account, fetchAccount } = useAuth();
  const navigate = useNavigate();
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);

  if (!user) return null;

  const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'U';

  const handleDepositSuccess = async () => {
    await fetchAccount();
  };

  return (
    <>
      <nav className="navbar" aria-label="Main Navigation">
        <div className="navbar-inner">
          {/* Logo & Brand Tagline */}
          <div
            onClick={() => navigate('/dashboard')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <VetanamLogo size={34} textSize="1.25rem" showTagline={true} />
          </div>

          {/* Navigation Links */}
          <ul className="nav-links">
            <li>
              <NavLink
                to="/dashboard"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <LayoutDashboard size={17} />
                <span className="nav-label">Dashboard</span>
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/transfer"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Send size={17} />
                <span className="nav-label">Send Money</span>
              </NavLink>
            </li>

            {/* Add Funds Button (Triggers Modal) */}
            <li>
              <button
                type="button"
                onClick={() => setIsAddFundsOpen(true)}
                className="nav-link"
                style={{ border: 'none', background: 'none', cursor: 'pointer' }}
              >
                <PlusCircle size={17} color="var(--brand-indigo)" />
                <span className="nav-label" style={{ color: 'var(--brand-indigo)', fontWeight: 600 }}>
                  Add Funds
                </span>
              </button>
            </li>

            <li>
              <NavLink
                to="/history"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <History size={17} />
                <span className="nav-label">History</span>
              </NavLink>
            </li>

            <li>
              <NavLink
                to="/notifications"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <Bell size={17} />
                <span className="nav-label">Notifications</span>
              </NavLink>
            </li>

            {user?.role === 'admin' && (
              <li>
                <NavLink
                  to="/admin"
                  className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                >
                  <ShieldAlert size={17} color="var(--color-warning)" />
                  <span className="nav-label" style={{ color: 'var(--color-warning)' }}>
                    Admin
                  </span>
                </NavLink>
              </li>
            )}
          </ul>

          {/* Right Action: User Avatar & Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div className="user-badge" title={user?.email}>
              <div className="user-avatar">{userInitial}</div>
              <span className="nav-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                {user?.email?.split('@')[0]}
              </span>
            </div>

            <button
              onClick={logout}
              className="btn btn-ghost btn-sm"
              title="Log out"
              aria-label="Log out"
              style={{ color: 'var(--text-secondary)' }}
            >
              <LogOut size={16} />
              <span className="nav-label">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Add Funds Modal */}
      <AddFundsModal
        isOpen={isAddFundsOpen}
        onClose={() => setIsAddFundsOpen(false)}
        currentBalance={account?.cachedBalance || 0}
        onDepositSuccess={handleDepositSuccess}
      />
    </>
  );
}

export default Navbar;
