// client/src/app/articles/new/page.tsx
'use client';

import ArticleForm from '@/components/articles/ArticleForm';
import { withAuth } from '@/components/auth/WithAuth';

function NewArticlePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ArticleForm />
    </div>
  );
}

export default withAuth(NewArticlePage, ['AUTHOR', 'EDITOR']);