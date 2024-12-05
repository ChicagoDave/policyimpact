// client/src/app/profile/page.tsx
'use client';

import React from 'react';
import ProfileView from '@/components/auth/ProfileView';
import { withAuth } from '@/components/auth/WithAuth';

function ProfilePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ProfileView />
    </div>
  );
}

export default withAuth(ProfilePage);