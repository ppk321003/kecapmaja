import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const isPml = String(user?.role || '').toLowerCase().startsWith('pml ');
  const pmlAllowedPaths = [
    '/monitoringlapangandash',
    '/sensus-ekonomi-2026/monitoring-lapangan-dash',
    '/sensus-ekonomi-2026/verifikasi-akhir',
    '/sensus-ekonomi-2026/outlier',
  ];

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (isPml && !pmlAllowedPaths.includes(location.pathname)) {
    return <Navigate to="/sensus-ekonomi-2026/verifikasi-akhir" replace />;
  }

  return <>{children}</>;
}
