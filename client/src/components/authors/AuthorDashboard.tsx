// client/src/components/authors/AuthorDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertTitle } from '@/components/ui/Alert';
import { FileEdit, Plus } from 'lucide-react';
import ArticleStatus from '@/components/articles/ArticleStatus';
import ApiClient, { Article } from '@/lib/ApiClient';

interface DashboardArticle extends Article {
  authors: Array<{
    firstName: string;
    lastName: string;
  }>;
  researchCompletedAt?: string;
  reviewCompletedAt?: string;
}

const AuthorDashboard = () => {
  const router = useRouter();
  const [articles, setArticles] = useState<DashboardArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      // Get userId from localStorage with type safety
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }

      const response = await ApiClient.articles.list({ 
        authorId: userId 
      });

      // Fetch author details for each article
      const articlesWithAuthors = await Promise.all(
        response.data.map(async (article) => {
          const authorProfiles = await Promise.all(
            article.authorIds.map(id => ApiClient.profiles.get(id))
          );
          
          return {
            ...article,
            authors: authorProfiles.map(profile => ({
              firstName: profile.data.firstName,
              lastName: profile.data.lastName
            })),
            researchCompletedAt: article.status === 'REVIEW_REQUIRED' ? article.updatedAt : undefined,
            reviewCompletedAt: article.approvedAt
          };
        })
      );
      
      setArticles(articlesWithAuthors);
    } catch (err) {
      setError('Error loading articles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getArticlesByStatus = () => {
    const drafts = articles.filter(a => a.status === 'DRAFT');
    const inProgress = articles.filter(a => 
      ['RESEARCH_REQUIRED', 'RESEARCH_IN_PROGRESS', 'REVIEW_REQUIRED', 'REVIEW_IN_PROGRESS'].includes(a.status)
    );
    const needsRevision = articles.filter(a => a.status === 'REVISION_REQUIRED');
    const published = articles.filter(a => a.status === 'PUBLISHED');

    return { drafts, inProgress, needsRevision, published };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  const { drafts, inProgress, needsRevision, published } = getArticlesByStatus();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Articles</h2>
        <Button onClick={() => router.push('/articles/new')}>
          <Plus className="w-4 h-4 mr-2" />
          New Article
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      {needsRevision.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Needs Revision</h3>
          <div className="space-y-4">
            {needsRevision.map(article => (
              <Card key={article.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-medium">{article.title}</h4>
                      {article.subtitle && (
                        <p className="text-gray-500 mt-1">{article.subtitle}</p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/articles/${article.id}/edit`)}
                    >
                      <FileEdit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                  <ArticleStatus status={article.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {inProgress.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">In Progress</h3>
          <div className="space-y-4">
            {inProgress.map(article => (
              <Card key={article.id}>
                <CardContent className="p-6">
                  <h4 className="text-lg font-medium mb-4">{article.title}</h4>
                  <ArticleStatus 
                    status={article.status}
                    researchCompletedAt={article.researchCompletedAt}
                    reviewCompletedAt={article.reviewCompletedAt}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {drafts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Drafts</h3>
          <div className="space-y-4">
            {drafts.map(article => (
              <Card key={article.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-medium">{article.title}</h4>
                      <p className="text-sm text-gray-500">
                        Last updated: {new Date(article.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/articles/${article.id}/edit`)}
                    >
                      <FileEdit className="w-4 h-4 mr-2" />
                      Continue Editing
                    </Button>
                  </div>
                  <ArticleStatus status={article.status} />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {published.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Published</h3>
          <div className="space-y-4">
            {published.map(article => (
              <Card key={article.id}>
                <CardContent className="p-6">
                  <h4 className="text-lg font-medium mb-4">{article.title}</h4>
                  <ArticleStatus 
                    status={article.status}
                    researchCompletedAt={article.researchCompletedAt}
                    reviewCompletedAt={article.reviewCompletedAt}
                    publishedAt={article.publishedAt}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorDashboard;