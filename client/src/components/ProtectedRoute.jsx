import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { status } = useAuth();

  if (status === 'loading') {
    return <div className="centered-placeholder">Loading…</div>;
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
