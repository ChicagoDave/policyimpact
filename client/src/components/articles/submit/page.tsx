// client/src/app/articles/submit/page.tsx
'use client';

import React from 'react';
import ArticleSubmission from '@/components/articles/ArticleSubmission';
import { withAuth } from '@/components/auth/WithAuth';

function SubmitArticlePage() {
  return <ArticleSubmission />;
}

// Wrap with auth HOC to ensure only authors can access this page
export default withAuth(SubmitArticlePage, ['AUTHOR']);