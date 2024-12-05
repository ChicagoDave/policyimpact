// client/src/app/articles/[id]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ArticleView from '@/components/articles/ArticleView';
import { Card, CardContent } from '@/components/ui/Card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { Loader2 } from 'lucide-react';
import ApiClient from '@/lib/ApiClient';

export default function ArticlePage() {
  const params = useParams();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        if (!params.id) {
          throw new Error('Article ID is required');
        }

        const response = await ApiClient.articles.get(params.id as string);
        
        // Only show published articles
        if (response.data.status !== 'PUBLISHED') {
          throw new Error('Article not found');
        }

        setArticle(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading article');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [params.id]);

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto my-8">
        <CardContent className="flex justify-center items-center h-40">
          <Loader2 className="w-8 h-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (error || !article) {
    return (
      <Card className="max-w-4xl mx-auto my-8">
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error || 'Article not found'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return <ArticleView article={article} />;
}