import React from 'react';
import AuthGate from '@client/src/components/AuthGate';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles: string[];
  fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRoles,
}) => {
  return (
    <AuthGate requiredRoles={requiredRoles}>
      {children}
    </AuthGate>
  );
};

export default ProtectedRoute;
