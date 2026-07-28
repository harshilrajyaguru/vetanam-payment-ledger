import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';

export function AdminRoute() {
  const { user, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="content-wrapper" style={{ paddingTop: '5rem' }}>
        <SkeletonLoader count={3} height="3rem" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default AdminRoute;
