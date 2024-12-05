// client/src/app/articles/[id]/review/page.tsx
'use client';

import React from 'react';
import ArticleReview from '@/components/articles/ArticleReview';
import { withAuth } from '@/components/auth/WithAuth';

function ReviewPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <ArticleReview articleId={params.id} />
    </div>
  );
}

// Only reviewers and editors can access this page
export default withAuth(ReviewPage, ['REVIEWER', 'EDITOR']);