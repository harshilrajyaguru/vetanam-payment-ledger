import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';

export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="content-wrapper" style={{ paddingTop: '5rem' }}>
        <SkeletonLoader count={3} height="3rem" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
