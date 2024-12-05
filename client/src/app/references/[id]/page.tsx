'use client';

import ReferenceDetails from '@/components/references/ReferenceDetails';
import { withAuth } from '@/components/auth/WithAuth';

function ReferenceDetailsPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <ReferenceDetails id={params.id} />
    </div>
  );
}

export default withAuth(ReferenceDetailsPage);