// client/src/app/profile/credentials/new/page.tsx
'use client';

import React from 'react';
import CredentialForm from '@/components/auth/CredentialForm';
import { withAuth } from '@/components/auth/WithAuth';

function NewCredentialPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <CredentialForm />
    </div>
  );
}

// You can also specify allowed roles if needed
export default withAuth(NewCredentialPage, ['AUTHOR', 'REVIEWER', 'EDITOR']);