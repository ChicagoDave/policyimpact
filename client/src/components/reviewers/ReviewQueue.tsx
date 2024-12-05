// client/src/components/reviewers/ReviewQueue.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertTitle } from '@/components/ui/Alert';
import { ClipboardCheck, BookOpen } from 'lucide-react';
import ApiClient, { Article } from '@/lib/ApiClient';

interface ReviewQueueItem extends Article {
  authors: Array<{
    firstName: string;
    lastName: string;
  }>;
  references: Array<{
    title: string;
    url: string;
    type: string;
  }>;
}

const ReviewQueue = () => {
  const router = useRouter();
  const [articles, setArticles] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReviewQueue();
  }, []);

  const fetchReviewQueue = async () => {
    try {
      const response = await ApiClient.articles.list({ 
        status: 'REVIEW_REQUIRED'
      });
      
      // Fetch author and reference details for each article
      const articlesWithDetails = await Promise.all(
        response.data.map(async (article) => {
          const [authorProfiles, references] = await Promise.all([
            Promise.all(article.authorIds.map(id => ApiClient.profiles.get(id))),
            Promise.all(article.referenceIds.map(id => ApiClient.references.get(id)))
          ]);
          
          return {
            ...article,
            authors: authorProfiles.map(profile => ({
              firstName: profile.data.firstName,
              lastName: profile.data.lastName
            })),
            references: references.map(ref => ({
              title: ref.data.title,
              url: ref.data.url,
              type: ref.data.type
            }))
          };
        })
      );
      
      setArticles(articlesWithDetails);
    } catch (err) {
      setError('Error loading review queue');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartReview = async (articleId: string) => {
    try {
      setLoading(true);
      await ApiClient.reviews.start(articleId);
      router.push(`/reviews/${articleId}`);
    } catch (err) {
      setError('Error starting review');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto my-8">
        <CardContent className="p-6">
          <div className="flex justify-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Review Queue</h2>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}

      {articles.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No articles currently require review</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {articles.map(article => (
            <Card key={article.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">{article.title}</h3>
                    {article.subtitle && (
                      <p className="text-gray-500 mt-1">{article.subtitle}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-2">
                      By: {article.authors.map(a => `${a.firstName} ${a.lastName}`).join(', ')}
                    </p>
                  </div>
                  <Badge className="bg-purple-500 text-white">
                    Ready for Review
                  </Badge>
                </div>
                
                <div className="mt-4 mb-4">
                  <h4 className="text-sm font-medium mb-2">References ({article.references.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {article.references.map((ref, index) => (
                      <Badge key={index} variant="secondary">
                        {ref.type}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    Research completed: {new Date(article.updatedAt).toLocaleDateString()}
                  </div>
                  <Button
                    onClick={() => handleStartReview(article.id)}
                    disabled={loading}
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Start Review
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

export default ReviewQueue;