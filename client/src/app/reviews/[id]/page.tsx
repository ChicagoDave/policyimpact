// client/src/app/reviews/[id]/page.tsx
'use client';

import React from 'react';
import ReviewSubmission from '@/components/reviewers/ReviewSubmission';
import { withAuth } from '@/components/auth/WithAuth';

function ReviewPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ReviewSubmission />
    </div>
  );
}

// Only allow reviewers and editors to access this page
export default withAuth(ReviewPage, ['REVIEWER', 'EDITOR']);