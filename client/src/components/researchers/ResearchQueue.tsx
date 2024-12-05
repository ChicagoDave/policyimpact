import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertTitle } from '@/components/ui/Alert';
import WorkflowStatus from '@/components/workflow/WorkflowStatus';
import { Search, Clock } from 'lucide-react';
import ApiClient from '@/lib/ApiClient';
import type { Article } from '@/lib/ApiClient';

const ResearchQueue = () => {
  const router = useRouter();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchResearchQueue();
  }, []);

  const fetchResearchQueue = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.articles.list({ 
        status: 'RESEARCH_REQUIRED'
      });
      setArticles(response.data);
    } catch (err) {
      setError('Error loading research queue');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startResearch = async (articleId: string) => {
    try {
      await ApiClient.research.start(articleId);
      router.push(`/research/${articleId}`);
    } catch (err) {
      setError('Error starting research');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Clock className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>{error}</AlertTitle>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Research Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Articles waiting for research review
          </p>
        </div>
        <Badge variant="secondary">
          {articles.length} Article{articles.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {articles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-gray-500">
            <Search className="w-12 h-12 mb-4 text-gray-400" />
            <p className="text-lg font-medium">No articles need research</p>
            <p className="text-sm">Check back later for new submissions</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {articles.map(article => (
            <Card key={article.id} className="overflow-hidden">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle>{article.title}</CardTitle>
                    {article.subtitle && (
                      <p className="text-sm text-gray-500">{article.subtitle}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <WorkflowStatus 
                    status={article.status} 
                    updatedAt={article.updatedAt} 
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" size="sm" onClick={() => router.push(`/articles/${article.id}`)}>
                    View Details
                  </Button>
                  <Button size="sm" onClick={() => startResearch(article.id)}>
                    Start Research
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ResearchQueue;