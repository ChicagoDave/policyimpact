// client/src/app/profile/edit/page.tsx
'use client';

import React from 'react';
import ProfileEdit from '@/components/auth/ProfileEdit';
import { withAuth } from '@/components/auth/WithAuth';

function ProfileEditPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ProfileEdit />
    </div>
  );
}

export default withAuth(ProfileEditPage);