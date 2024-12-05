// client/components/researchers/ResearchSubmission.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { Link2, Plus, Save, Send } from 'lucide-react';
import ApiClient, { Article as ApiArticle, Reference } from '@/lib/ApiClient';

// Extended Article type that includes author details
interface Article extends ApiArticle {
  authors: Array<{
    firstName: string;
    lastName: string;
  }>;
}

const ResearchSubmission = () => {
  const router = useRouter();
  const { id: articleId } = router.query;

  const [article, setArticle] = useState<Article | null>(null);
  const [references, setReferences] = useState<Reference[]>([]);
  const [selectedReferences, setSelectedReferences] = useState<string[]>([]);
  const [researchNotes, setResearchNotes] = useState('');
  const [showReferenceForm, setShowReferenceForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (articleId) {
      fetchArticleAndReferences();
    }
  }, [articleId]);

  const fetchArticleAndReferences = async () => {
    try {
      setLoading(true);
      const [articleResponse, referencesResponse] = await Promise.all([
        ApiClient.articles.get(articleId as string),
        ApiClient.references.list()
      ]);

      // Fetch author details for the article
      const authorProfiles = await Promise.all(
        articleResponse.data.authorIds.map(id => ApiClient.profiles.get(id))
      );

      // Combine article data with author details
      const articleWithAuthors: Article = {
        ...articleResponse.data,
        authors: authorProfiles.map(profile => ({
          firstName: profile.data.firstName,
          lastName: profile.data.lastName
        }))
      };

      setArticle(articleWithAuthors);
      setReferences(referencesResponse.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading research data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReferenceToggle = (referenceId: string) => {
    setSelectedReferences(prev => 
      prev.includes(referenceId)
        ? prev.filter(id => id !== referenceId)
        : [...prev, referenceId]
    );
  };

  const handleSubmitResearch = async () => {
    try {
      setLoading(true);
      setError(null);

      if (selectedReferences.length < 2) {
        setError('At least two references are required');
        return;
      }

      if (!researchNotes.trim()) {
        setError('Research notes are required');
        return;
      }

      await ApiClient.research.complete(articleId as string, {
        referenceIds: selectedReferences,
        researchNotes
      });

      router.push('/dashboard');
    } catch (err) {
      setError('Error submitting research');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !article) {
    return (
      <Card className="max-w-4xl mx-auto my-8">
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <p>Loading...</p>
          </div>
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
        <CardTitle>Research Submission</CardTitle>
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
            <p className="text-sm text-gray-500 mt-1">
              By: {article.authors.map(a => `${a.firstName} ${a.lastName}`).join(', ')}
            </p>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">References</h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowReferenceForm(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Reference
            </Button>
          </div>
          <div className="space-y-2">
            {references.map(reference => (
              <div
                key={reference.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedReferences.includes(reference.id)
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white hover:bg-gray-50'
                }`}
                onClick={() => handleReferenceToggle(reference.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{reference.title}</h4>
                    <p className="text-sm text-gray-500">{reference.publisher}</p>
                    <p className="text-sm text-blue-500">{reference.url}</p>
                  </div>
                  <Badge className="ml-2">{reference.type}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Research Notes</h3>
          <Textarea
            value={researchNotes}
            onChange={(e) => setResearchNotes(e.target.value)}
            placeholder="Enter your research findings and methodology..."
            className="min-h-[200px]"
          />
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
          onClick={handleSubmitResearch}
          disabled={loading || selectedReferences.length < 2 || !researchNotes.trim()}
        >
          <Send className="w-4 h-4 mr-2" />
          Submit Research
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ResearchSubmission;