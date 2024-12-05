import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { ThumbsUp, ThumbsDown, RotateCcw, Save, Send } from 'lucide-react';
import ApiClient, { Article, Reference, UserProfile } from '@/lib/ApiClient';

type ReviewDecision = 'APPROVE' | 'REVISE' | 'REJECT';

const ArticleReview = ({ articleId }: { articleId: string }) => {
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [authors, setAuthors] = useState<UserProfile[]>([]);
  const [references, setReferences] = useState<Reference[]>([]);
  const [decision, setDecision] = useState<ReviewDecision>('REVISE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchArticleData();
  }, [articleId]);

  const fetchArticleData = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.articles.get(articleId);
      const articleData = response.data;

      // Fetch author profiles
      const authorProfiles = await Promise.all(
        articleData.authorIds.map(id => ApiClient.profiles.get(id))
      );

      // Fetch references
      const referenceData = await Promise.all(
        articleData.referenceIds.map(id => ApiClient.references.get(id))
      );

      setArticle(articleData);
      setAuthors(authorProfiles.map(res => res.data));
      setReferences(referenceData.map(res => res.data));
    } catch (err) {
      setError('Error loading article data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      setSubmitting(true);
      setError(null);

      if (!reviewNotes.trim()) {
        throw new Error('Review notes are required');
      }

      await ApiClient.reviews.submit(articleId, {
        decision,
        reviewNotes: reviewNotes.trim()
      });

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error submitting review');
      console.error(err);
    } finally {
      setSubmitting(false);
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

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold">{article.title}</h3>
            {article.subtitle && (
              <p className="text-gray-600 mt-1">{article.subtitle}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              By: {authors.map(a => `${a.firstName} ${a.lastName}`).join(', ')}
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h4 className="font-medium mb-2">Article Content</h4>
            <div className="prose max-w-none">
              {article.content}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">References ({references.length})</h4>
            <div className="space-y-2">
              {references.map(reference => (
                <div
                  key={reference.id}
                  className="border rounded-lg p-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="font-medium">{reference.title}</h5>
                      <p className="text-sm text-gray-500">{reference.publisher}</p>
                      <a 
                        href={reference.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:text-blue-600"
                      >
                        View Source
                      </a>
                    </div>
                    <Badge>{reference.type}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Review Decision</h4>
            <Select
              value={decision}
              onValueChange={(value: ReviewDecision) => setDecision(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APPROVE">
                  <div className="flex items-center">
                    <ThumbsUp className="w-4 h-4 mr-2 text-green-500" />
                    Approve
                  </div>
                </SelectItem>
                <SelectItem value="REVISE">
                  <div className="flex items-center">
                    <RotateCcw className="w-4 h-4 mr-2 text-yellow-500" />
                    Request Revision
                  </div>
                </SelectItem>
                <SelectItem value="REJECT">
                  <div className="flex items-center">
                    <ThumbsDown className="w-4 h-4 mr-2 text-red-500" />
                    Reject
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Review Notes</h4>
            <Textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Enter your review comments, suggestions, and feedback..."
              className="min-h-[200px]"
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmitReview()}
          disabled={submitting}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Draft
        </Button>
        <Button
          onClick={() => handleSubmitReview()}
          disabled={submitting || !reviewNotes.trim()}
        >
          <Send className="w-4 h-4 mr-2" />
          Submit Review
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ArticleReview;