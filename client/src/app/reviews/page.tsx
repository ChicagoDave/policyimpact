// client/src/app/reviews/page.tsx
'use client';

import React from 'react';
import ReviewQueue from '@/components/reviewers/ReviewQueue';
import { withAuth } from '@/components/auth/WithAuth';

function ReviewsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ReviewQueue />
    </div>
  );
}

// Only allow reviewers and editors to access this page
export default withAuth(ReviewsPage, ['REVIEWER', 'EDITOR']);