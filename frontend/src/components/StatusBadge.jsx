export function StatusBadge({ status }) {
  if (!status) return null;

  const normalized = String(status).toUpperCase();

  let badgeClass = 'badge-neutral';

  switch (normalized) {
    case 'COMPLETED':
    case 'ACTIVE':
    case 'TRANSACTION_SUCCESS':
      badgeClass = 'badge-success';
      break;

    case 'PENDING':
    case 'PROCESSING':
    case 'IN_PROGRESS':
      badgeClass = 'badge-warning';
      break;

    case 'FAILED':
    case 'FROZEN':
    case 'TRANSACTION_FAILED':
      badgeClass = 'badge-danger';
      break;

    case 'FLAGGED':
    case 'TRANSACTION_FLAGGED':
      badgeClass = 'badge-warning';
      break;

    case 'REVERSED':
      badgeClass = 'badge-info';
      break;

    default:
      badgeClass = 'badge-neutral';
      break;
  }

  return (
    <span className={`badge ${badgeClass}`}>
      {status}
    </span>
  );
}

export default StatusBadge;
