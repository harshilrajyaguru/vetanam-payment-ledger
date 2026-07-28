import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import transactionService from '../services/transaction.service.js';
import notificationService from '../services/notification.service.js';
import BalanceCard from '../components/BalanceCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import AddFundsModal from '../components/AddFundsModal.jsx';
import { formatMinorUnits } from '../utils/currency.js';
import {
  Bell,
  ArrowRight,
  Send,
  History,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  ShieldCheck,
} from 'lucide-react';

function QuickStatCard({ icon: Icon, iconColor, iconBg, label, value, sub }) {
  return (
    <div className="stat-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--radius-sm)',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={18} color={iconColor} />
        </div>
        <span className="stat-label">{label}</span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function DashboardPage() {
  const { account, user, fetchAccount } = useAuth();
  const navigate = useNavigate();

  const [recentTransactions, setRecentTransactions] = useState([]);
  const [notifications, setNotifications]           = useState([]);
  const [isLoadingData, setIsLoadingData]           = useState(true);
  const [isAddFundsOpen, setIsAddFundsOpen]         = useState(false);

  const loadDashboardData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const [txRes, notifRes] = await Promise.all([
        transactionService.getMyTransactions({ page: 1, limit: 6 }),
        notificationService.getMyNotifications({ page: 1, limit: 4 }),
      ]);
      if (txRes.success && txRes.data?.transactions) setRecentTransactions(txRes.data.transactions);
      if (notifRes.success && notifRes.data?.notifications) setNotifications(notifRes.data.notifications);
    } catch {
      /* silent */
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    const handleFocus = () => {
      fetchAccount();
      loadDashboardData();
    };
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      loadDashboardData();
    }, 10000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [loadDashboardData, fetchAccount, account?.cachedBalance]);

  const handleRefresh = async () => {
    await fetchAccount();
    await loadDashboardData();
  };

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Compute quick stats
  const completed  = recentTransactions.filter((t) => t.status === 'COMPLETED');
  const totalCount = recentTransactions.length;
  const successRate = totalCount > 0 ? Math.round((completed.length / totalCount) * 100) : 100;

  const totalSentMinor = completed.reduce((acc, t) => acc + (t.amount || 0), 0);

  return (
    <div className="content-wrapper">
      {/* Page Header with Greeting & Tagline */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--brand-indigo)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>
            Secure. Fast. Accountable.
          </div>
          <h1>
            {getGreeting()}, {user?.email?.split('@')[0]}
          </h1>
          <p className="text-muted" style={{ marginTop: '0.25rem', fontSize: '0.9rem' }}>
            Here is your financial summary and double-entry ledger status.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => setIsAddFundsOpen(true)}
            className="btn btn-secondary"
          >
            <PlusCircle size={17} color="var(--brand-indigo)" /> Add Funds
          </button>
          <button
            onClick={() => navigate('/transfer')}
            className="btn btn-primary"
          >
            <Send size={16} /> Send Money
          </button>
        </div>
      </div>

      {/* Top Row: Balance Card + Notifications Panel */}
      <div className="grid-2" style={{ marginBottom: '1.5rem' }}>
        <BalanceCard account={account} onRefresh={handleRefresh} onSendClick={() => navigate('/transfer')} />

        {/* Notifications Card */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div className="card-title">
              <div className="card-icon"><Bell size={17} /></div>
              Recent Notifications
            </div>
            <Link to="/notifications" style={{ fontSize: '0.825rem', color: 'var(--brand-indigo)', fontWeight: 600 }}>
              View all <ArrowRight size={13} style={{ display: 'inline', verticalAlign: 'middle' }} />
            </Link>
          </div>

          {isLoadingData ? (
            <SkeletonLoader count={3} height="2.75rem" />
          ) : notifications.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem 1rem' }}>
              <div className="empty-state-icon"><Bell size={22} /></div>
              <p>No new notifications</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
              {notifications.map((notif) => (
                <div
                  key={notif._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    background: notif.read ? 'var(--bg-card)' : 'var(--brand-indigo-light)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    {!notif.read && (
                      <span
                        style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: 'var(--brand-indigo)',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <StatusBadge status={notif.type} />
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats Grid (4 Metrics) */}
      <div className="grid-4" style={{ marginBottom: '1.5rem' }}>
        <QuickStatCard
          icon={TrendingUp}
          iconColor="var(--color-error)"
          iconBg="var(--color-error-bg)"
          label="Money Sent"
          value={formatMinorUnits(totalSentMinor, account?.currency)}
          sub="Recent total transfers"
        />
        <QuickStatCard
          icon={TrendingDown}
          iconColor="var(--color-success)"
          iconBg="var(--color-success-bg)"
          label="Money Received"
          value="₹0.00"
          sub="Inbound credits"
        />
        <QuickStatCard
          icon={Activity}
          iconColor="var(--brand-indigo)"
          iconBg="var(--brand-indigo-light)"
          label="Transactions"
          value={String(totalCount)}
          sub="Total activity count"
        />
        <QuickStatCard
          icon={ShieldCheck}
          iconColor="var(--color-success)"
          iconBg="var(--color-success-bg)"
          label="Success Rate"
          value={`${successRate}%`}
          sub="Double-entry verified"
        />
      </div>

      {/* Recent Transactions Table */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-title">
            <div className="card-icon"><History size={17} /></div>
            Recent Transfers
          </div>
          <Link to="/history" className="btn btn-secondary btn-sm">
            Full History <ArrowRight size={14} />
          </Link>
        </div>

        {isLoadingData ? (
          <SkeletonLoader count={4} height="3rem" />
        ) : recentTransactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Send size={24} /></div>
            <h3>No transfers recorded yet</h3>
            <p>Send your first payment or add funds to get started</p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button onClick={() => setIsAddFundsOpen(true)} className="btn btn-secondary">
                <PlusCircle size={16} /> Add Funds
              </button>
              <button onClick={() => navigate('/transfer')} className="btn btn-primary">
                <Send size={16} /> Send Money
              </button>
            </div>
          </div>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Ref ID</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => (
                  <tr key={tx._id}>
                    <td>
                      <code style={{ fontSize: '0.8rem', color: 'var(--brand-indigo)', fontWeight: 600 }}>
                        #{tx._id.slice(-8).toUpperCase()}
                      </code>
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      <span className="tx-amount-debit">
                        {formatMinorUnits(tx.amount, tx.currency)}
                      </span>
                    </td>
                    <td><StatusBadge status={tx.status} /></td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Funds Modal */}
      <AddFundsModal
        isOpen={isAddFundsOpen}
        onClose={() => setIsAddFundsOpen(false)}
        currentBalance={account?.cachedBalance || 0}
        onDepositSuccess={async () => {
          await handleRefresh();
        }}
      />
    </div>
  );
}

export default DashboardPage;
