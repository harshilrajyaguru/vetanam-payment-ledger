import { useState, useEffect, useCallback } from 'react';
import adminService from '../services/admin.service.js';
import StatusBadge from '../components/StatusBadge.jsx';
import Modal from '../components/Modal.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import { formatMinorUnits } from '../utils/currency.js';
import {
  Users,
  ShieldAlert,
  Search,
  Lock,
  Unlock,
  Activity,
  FileText,
  AlertTriangle,
} from 'lucide-react';

export function AdminPage() {
  const [activeTab, setActiveTab] = useState('users');

  const [users, setUsers]               = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [auditLogs, setAuditLogs]       = useState([]);

  const [isLoading, setIsLoading]       = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');

  // Action Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionType, setActionType]     = useState('freeze'); // 'freeze' | 'unfreeze'
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [isUpdating, setIsUpdating]     = useState(false);
  const [actionError, setActionError]   = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'users') {
        const res = await adminService.getUsers();
        if (res.success && res.data) setUsers(res.data.users || []);
      } else if (activeTab === 'transactions') {
        const res = await adminService.getTransactions();
        if (res.success && res.data) setTransactions(res.data.transactions || []);
      } else if (activeTab === 'logs') {
        const res = await adminService.getAuditLogs();
        if (res.success && res.data) setAuditLogs(res.data.auditLogs || []);
      }
    } catch {
      /* silent */
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenFreezeModal = (user, type) => {
    setSelectedUser(user);
    setActionType(type);
    setActionError('');
    setIsModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedUser) return;
    setIsUpdating(true);
    setActionError('');

    try {
      let res;
      if (actionType === 'freeze') {
        res = await adminService.freezeUser(selectedUser._id || selectedUser.id);
      } else {
        res = await adminService.unfreezeUser(selectedUser._id || selectedUser.id);
      }

      if (res.success) {
        setIsModalOpen(false);
        await loadData();
      } else {
        setActionError(res.error?.message || 'Failed to update account status.');
      }
    } catch (err) {
      setActionError(err.response?.data?.error?.message || err.message || 'Operation failed.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Filtered Lists
  const filteredUsers = users.filter(
    (u) => !searchQuery || u.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredTransactions = transactions.filter(
    (t) => !searchQuery || t._id?.includes(searchQuery),
  );

  return (
    <div className="content-wrapper">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
            <ShieldAlert size={18} color="var(--color-warning)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-warning)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              System Administration
            </span>
          </div>
          <h1>Admin Control Portal</h1>
          <p className="text-muted">
            Manage user accounts, audit ledger transactions, and review security flags.
          </p>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', background: 'var(--bg-elevated)', padding: '0.3rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)' }}>
          <button
            onClick={() => setActiveTab('users')}
            className={`btn btn-sm ${activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <Users size={15} /> Users
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`btn btn-sm ${activeTab === 'transactions' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <Activity size={15} /> Transactions
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`btn btn-sm ${activeTab === 'logs' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 'var(--radius-md)' }}
          >
            <FileText size={15} /> Audit Logs
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="glass-card">
        {/* Search Bar */}
        <div style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', pointerEvents: 'none' }}>
              <Search size={16} />
            </span>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '2.4rem', fontSize: '0.875rem' }}
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* TAB 1: USERS */}
        {activeTab === 'users' && (
          <>
            {isLoading ? (
              <SkeletonLoader count={5} height="3.25rem" />
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Users size={26} /></div>
                <h3>No users found</h3>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>User Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Registered</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr key={u._id || u.id}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)' }}>{u.email}</strong>
                        </td>
                        <td>
                          <span className={`badge ${u.role === 'ADMIN' ? 'badge-warning' : 'badge-neutral'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td><StatusBadge status={u.status} /></td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {u.status === 'frozen' ? (
                            <button
                              onClick={() => handleOpenFreezeModal(u, 'unfreeze')}
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--color-success)' }}
                            >
                              <Unlock size={14} /> Unfreeze
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenFreezeModal(u, 'freeze')}
                              className="btn btn-secondary btn-sm"
                              style={{ color: 'var(--color-error)' }}
                            >
                              <Lock size={14} /> Freeze Account
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* TAB 2: TRANSACTIONS */}
        {activeTab === 'transactions' && (
          <>
            {isLoading ? (
              <SkeletonLoader count={5} height="3.25rem" />
            ) : filteredTransactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><Activity size={26} /></div>
                <h3>No transactions recorded</h3>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Ref ID</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Risk Score</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr key={tx._id}>
                        <td>
                          <code style={{ fontSize: '0.8rem', color: 'var(--brand-indigo)', fontWeight: 600 }}>
                            #{tx._id.slice(-10).toUpperCase()}
                          </code>
                        </td>
                        <td style={{ fontWeight: 700 }}>
                          {formatMinorUnits(tx.amount, tx.currency)}
                        </td>
                        <td><StatusBadge status={tx.status} /></td>
                        <td>
                          {tx.riskScore != null ? (
                            <span style={{ fontWeight: 700, color: tx.riskScore > 60 ? 'var(--color-error)' : 'var(--color-success)' }}>
                              {tx.riskScore} / 100
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          {new Date(tx.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* TAB 3: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <>
            {isLoading ? (
              <SkeletonLoader count={5} height="3.25rem" />
            ) : auditLogs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"><FileText size={26} /></div>
                <h3>No audit logs available</h3>
              </div>
            ) : (
              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Actor ID</th>
                      <th>Target</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log._id}>
                        <td>
                          <span className="badge badge-info">{log.action}</span>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.78rem' }}>{log.actorId ? String(log.actorId).slice(-8) : 'System'}</code>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            {log.targetType}: {String(log.targetId).slice(-8)}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          {new Date(log.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Freeze/Unfreeze Confirmation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={actionType === 'freeze' ? 'Freeze User Account' : 'Unfreeze User Account'}
        subtitle={`Target User: ${selectedUser?.email}`}
        maxWidth="440px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {actionError && (
            <div className="alert alert-error">
              <AlertTriangle size={16} />
              <span>{actionError}</span>
            </div>
          )}

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {actionType === 'freeze'
              ? 'Freezing an account immediately blocks all outbound and inbound transactions for this user. Ledger history remains preserved.'
              : 'Unfreezing restores transaction capabilities for this user.'}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
              style={{ flex: 1 }}
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmAction}
              className={`btn ${actionType === 'freeze' ? 'btn-danger' : 'btn-primary'}`}
              style={{ flex: 1.5 }}
              disabled={isUpdating}
            >
              {isUpdating ? 'Updating...' : actionType === 'freeze' ? 'Confirm Freeze' : 'Confirm Unfreeze'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AdminPage;
