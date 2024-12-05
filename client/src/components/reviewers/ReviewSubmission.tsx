// client/src/components/reviewers/ReviewSubmission.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { ThumbsUp, ThumbsDown, FileEdit, ExternalLink } from 'lucide-react';
import ApiClient, { Article, Reference } from '@/lib/ApiClient';

interface ReviewArticle extends Article {
  authors: Array<{
    firstName: string;
    lastName: string;
  }>;
  references: Reference[];
}

type ReviewDecision = 'APPROVE' | 'REVISE' | 'REJECT';

const ReviewSubmission = () => {
  const router = useRouter();
  const { id: articleId } = router.query;

  const [article, setArticle] = useState<ReviewArticle | null>(null);
  const [decision, setDecision] = useState<ReviewDecision>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (articleId) {
      fetchArticleDetails();
    }
  }, [articleId]);

  const fetchArticleDetails = async () => {
    try {
      setLoading(true);
      const articleResponse = await ApiClient.articles.get(articleId as string);
      const article = articleResponse.data;

      // Fetch authors and references in parallel
      const [authorProfiles, references] = await Promise.all([
        Promise.all(article.authorIds.map(id => ApiClient.profiles.get(id))),
        Promise.all(article.referenceIds.map(id => ApiClient.references.get(id)))
      ]);

      setArticle({
        ...article,
        authors: authorProfiles.map(profile => ({
          firstName: profile.data.firstName,
          lastName: profile.data.lastName
        })),
        references: references.map(ref => ref.data)
      });
    } catch (err) {
      setError('Error loading article details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!reviewNotes.trim()) {
        setError('Review notes are required');
        return;
      }

      await ApiClient.reviews.submit(articleId as string, {
        decision,
        reviewNotes
      });

      router.push('/reviews');
    } catch (err) {
      setError('Error submitting review');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !article) {
    return (
      <Card className="max-w-4xl mx-auto my-8">
        <CardContent className="p-6">
          <div className="flex justify-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (!article) {
    return (
      <Card className="max-w-4xl mx-auto my-8">
        <CardContent>
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Article not found</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Review Article</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div>
          <h3 className="text-lg font-semibold mb-2">Article Information</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium">{article.title}</h4>
            {article.subtitle && (
              <p className="text-gray-500 mt-1">{article.subtitle}</p>
            )}
            <p className="text-sm text-gray-600 mt-2">
              By: {article.authors.map(a => `${a.firstName} ${a.lastName}`).join(', ')}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Content</h3>
          <div className="prose max-w-none bg-white p-4 rounded-lg border">
            {article.content}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">References</h3>
          <div className="space-y-2">
            {article.references.map((reference, index) => (
              <div
                key={reference.id}
                className="p-4 rounded-lg border bg-white"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{reference.title}</h4>
                    <p className="text-sm text-gray-500">
                      {reference.publisher} • {reference.publishedDate}
                    </p>
                    <a
                      href={reference.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 flex items-center mt-1"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View Source
                    </a>
                  </div>
                  <Badge>{reference.type}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Review Decision</h3>
            <Select
              value={decision}
              onValueChange={(value) => setDecision(value as ReviewDecision)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVE">Approve</SelectItem>
                <SelectItem value="REVISE">Request Revisions</SelectItem>
                <SelectItem value="REJECT">Reject</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Review Notes</h3>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Enter your review comments, suggestions, and decision rationale..."
              className="min-h-[200px]"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmitReview}
          disabled={loading || !reviewNotes.trim()}
          variant={decision === 'APPROVE' ? 'default' : (
            decision === 'REJECT' ? 'destructive' : 'secondary'
          )}
        >
          {decision === 'APPROVE' ? (
            <ThumbsUp className="w-4 h-4 mr-2" />
          ) : decision === 'REJECT' ? (
            <ThumbsDown className="w-4 h-4 mr-2" />
          ) : (
            <FileEdit className="w-4 h-4 mr-2" />
          )}
          Submit Review
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ReviewSubmission;