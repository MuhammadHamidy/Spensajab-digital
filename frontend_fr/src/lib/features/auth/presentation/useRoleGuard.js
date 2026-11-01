'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

export function useRoleGuard(allowedRoles = ['ADMIN']) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    const role = (user.roleName || 'GURU').toUpperCase();
    const formattedAllowed = allowedRoles.map((r) => r.toUpperCase());

    if (!formattedAllowed.includes(role)) {
      setIsAuthorized(false);
      // Redirect users without required role to dashboard /
      router.replace('/');
    } else {
      setIsAuthorized(true);
    }
  }, [user, loading, router, allowedRoles]);

  return { isAuthorized, loading, userRole: user?.roleName?.toUpperCase() };
}
