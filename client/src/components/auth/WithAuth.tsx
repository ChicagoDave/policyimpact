// client/src/components/auth/WithAuth.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuth from '@/hooks/UseAuth';
import { Loader2 } from 'lucide-react';

export function withAuth<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  allowedRoles?: string[]
) {
  return function WithAuthComponent(props: T) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !user) {
        const returnUrl = encodeURIComponent(window.location.pathname);
        router.push(`/login?returnUrl=${returnUrl}`);
      }

      if (
        !loading && 
        user && 
        allowedRoles && 
        !allowedRoles.includes(user.role)
      ) {
        router.push('/unauthorized');
      }
    }, [user, loading, router]);

    if (loading) {
      return (
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      );
    }

    if (!user) {
      return null;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
}