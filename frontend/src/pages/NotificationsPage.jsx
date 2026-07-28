import { useState, useEffect, useCallback } from 'react';
import notificationService from '../services/notification.service.js';
import StatusBadge from '../components/StatusBadge.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import { Bell, ChevronLeft, ChevronRight, BellOff, CheckCircle2 } from 'lucide-react';

export function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages]       = useState(1);
  const [total, setTotal]           = useState(0);
  const [isLoading, setIsLoading]       = useState(true);

  const loadNotifications = useCallback(async (p = 1) => {
    setIsLoading(true);
    try {
      const res = await notificationService.getMyNotifications({ page: p, limit: 15 });
      if (res.success && res.data) {
        setNotifications(res.data.notifications);
        setTotalPages(res.data.totalPages || 1);
        setPage(res.data.page || 1);
        setTotal(res.data.total || 0);
      }
    } catch { /* silent */ } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications(page);

    const handleFocus = () => loadNotifications(page);
    window.addEventListener('focus', handleFocus);

    const interval = setInterval(() => {
      loadNotifications(page);
    }, 10000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
  }, [loadNotifications, page]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="content-wrapper">
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            Notifications
            {unreadCount > 0 && (
              <span
                style={{
                  fontSize: '0.75rem', fontWeight: 700,
                  background: 'var(--brand-indigo)',
                  color: '#FFFFFF', padding: '0.2rem 0.65rem',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-muted">
            {total > 0 ? `${total} notification${total !== 1 ? 's' : ''} delivered via BullMQ async queue` : 'Transaction alerts & updates'}
          </p>
        </div>
      </div>

      <div className="glass-card">
        {isLoading ? (
          <SkeletonLoader count={5} height="3.5rem" />
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <BellOff size={28} />
            </div>
            <h3>All caught up!</h3>
            <p>You have no notifications yet. Complete a transaction or deposit to trigger one.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {notifications.map((notif) => (
                <div
                  key={notif._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem 1.25rem',
                    background: notif.read ? 'var(--bg-card)' : 'var(--brand-indigo-light)',
                    borderRadius: 'var(--radius-lg)',
                    border: notif.read
                      ? '1px solid var(--border-default)'
                      : '1px solid rgba(79, 70, 229, 0.25)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    {/* Unread dot */}
                    <div
                      style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: notif.read ? 'transparent' : 'var(--brand-indigo)',
                        border: notif.read ? '1.5px solid var(--border-default)' : 'none',
                      }}
                    />

                    {/* Icon */}
                    <div
                      style={{
                        width: 40, height: 40, borderRadius: 'var(--radius-md)',
                        background: notif.read ? 'var(--bg-elevated)' : '#FFFFFF',
                        color: 'var(--brand-indigo)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: 'var(--shadow-xs)',
                      }}
                    >
                      {notif.type === 'TRANSACTION_SUCCESS' ? (
                        <CheckCircle2 size={18} color="var(--color-success)" />
                      ) : (
                        <Bell size={18} color="var(--brand-indigo)" />
                      )}
                    </div>

                    <div>
                      <StatusBadge status={notif.type} />
                      {notif.transactionId && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Transaction{' '}
                          <code style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-indigo)' }}>
                            #{String(notif.transactionId).slice(-10).toUpperCase()}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                    {new Date(notif.createdAt).toLocaleString([], {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: '1.5rem', paddingTop: '1.25rem',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="btn btn-secondary btn-sm"
              >
                <ChevronLeft size={15} /> Previous
              </button>

              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Page <strong style={{ color: 'var(--text-primary)' }}>{page}</strong> of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="btn btn-secondary btn-sm"
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default NotificationsPage;
