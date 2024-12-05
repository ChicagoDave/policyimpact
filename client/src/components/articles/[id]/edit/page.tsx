// client/src/app/articles/[id]/edit/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ArticleForm from '@/components/articles/ArticleForm';
import { withAuth } from '@/components/auth/WithAuth';
import { Alert, AlertTitle } from '@/components/ui/Alert';
import ApiClient from '@/lib/ApiClient';
import { Article } from '@/lib/ApiClient';

function EditArticlePage() {
  const params = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const response = await ApiClient.articles.get(params.id as string);
        setArticle(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading article');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchArticle();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTitle>Article not found</AlertTitle>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ArticleForm initialData={article} />
    </div>
  );
}

export default withAuth(EditArticlePage, ['AUTHOR', 'EDITOR']);