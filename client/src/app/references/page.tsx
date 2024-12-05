'use client';

import ReferenceList from '@/components/references/ReferenceList';
import { withAuth } from '@/components/auth/WithAuth';

function ReferencesPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ReferenceList />
    </div>
  );
}

export default withAuth(ReferencesPage);