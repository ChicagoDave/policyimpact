// client/src/components/articles/ArticleSubmission.tsx
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { 
  ChevronRight, 
  ChevronLeft, 
  Tags, 
  Users, 
  FileText,
  Send 
} from 'lucide-react';
import ApiClient from '@/lib/ApiClient';

interface ArticleFormData {
    title: string;
    subtitle?: string;
    content: string;
    authorIds: string[];
    referenceIds: string[]; // Added this required field
    tags: string[];
  }

// Step indicator component
const StepIndicator = ({ currentStep }: { currentStep: number }) => {
  const steps = ['Content', 'Authors', 'Tags', 'Review'];
  
  return (
    <div className="flex justify-between mb-8">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center
            ${index < currentStep ? 'bg-green-500 text-white' : 
              index === currentStep ? 'bg-blue-500 text-white' : 
              'bg-gray-200 text-gray-600'}
          `}>
            {index + 1}
          </div>
          <div className="ml-2 text-sm font-medium">{step}</div>
          {index < steps.length - 1 && (
            <div className="h-px w-12 bg-gray-200 mx-4 mt-1" />
          )}
        </div>
      ))}
    </div>
  );
};

const ArticleSubmission = () => {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [article, setArticle] = useState<ArticleFormData>({
    title: '',
    subtitle: '',
    content: '',
    authorIds: [],
    referenceIds: [], // Initialize empty array
    tags: []
  });
  const [submissionNotes, setSubmissionNotes] = useState('');

  // Content step validation
  const isContentValid = (): boolean => {
    return article.title.length >= 5 && article.content.length >= 100;
  };

  // Authors step validation
  const isAuthorsValid = (): boolean => {
    return article.authorIds.length > 0;
  };

  // Tags step validation
  const isTagsValid = (): boolean => {
    return article.tags.length >= 1;
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      setSaving(true);
      setError(null);

      // First create the article
      const savedArticle = await ApiClient.articles.create(article);

      // Then submit it for research
      await ApiClient.articles.submit(savedArticle.data.id, submissionNotes);

      router.push(`/articles/${savedArticle.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error submitting article');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Article Title"
                value={article.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArticle((prev: ArticleFormData) => ({
                  ...prev,
                  title: e.target.value
                }))}
                className="text-xl font-bold mb-2"
              />
              <Input
                placeholder="Subtitle (optional)"
                value={article.subtitle}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArticle((prev: ArticleFormData) => ({
                  ...prev,
                  subtitle: e.target.value
                }))}
              />
            </div>
            <Textarea
              placeholder="Write your article content here..."
              value={article.content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setArticle((prev: ArticleFormData) => ({
                ...prev,
                content: e.target.value
              }))}
              className="min-h-[400px]"
            />
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5" />
              <h3 className="text-lg font-medium">Add Co-authors</h3>
            </div>
            {/* Author selection would go here - implement author search/select UI */}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Tags className="w-5 h-5" />
              <h3 className="text-lg font-medium">Add Tags</h3>
            </div>
            <Input
              placeholder="Add tags (press Enter to add)"
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  e.preventDefault();
                  setArticle((prev: ArticleFormData) => ({
                    ...prev,
                    tags: [...prev.tags, e.currentTarget.value]
                  }));
                  e.currentTarget.value = '';
                }
              }}
            />
            <div className="flex flex-wrap gap-2 mt-4">
              {article.tags.map((tag: string, index: number) => (
                <Badge
                  key={index}
                  className="cursor-pointer"
                  onClick={() => setArticle((prev: ArticleFormData) => ({
                    ...prev,
                    tags: prev.tags.filter((_: string, i: number) => i !== index)
                  }))}
                >
                  {tag} ×
                </Badge>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5" />
              <h3 className="text-lg font-medium">Review & Submit</h3>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium">Title</h4>
              <p>{article.title}</p>
              
              {article.subtitle && (
                <>
                  <h4 className="font-medium">Subtitle</h4>
                  <p>{article.subtitle}</p>
                </>
              )}

              <h4 className="font-medium">Content Preview</h4>
              <p className="line-clamp-4">{article.content}</p>

              <h4 className="font-medium">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag: string, index: number) => (
                  <Badge key={index}>{tag}</Badge>
                ))}
              </div>

              <div>
                <h4 className="font-medium mb-2">Submission Notes (Optional)</h4>
                <Textarea
                  placeholder="Add any notes for the research team..."
                  value={submissionNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSubmissionNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return isContentValid();
      case 1:
        return isAuthorsValid();
      case 2:
        return isTagsValid();
      default:
        return true;
    }
  };

  return (
    <Card className="max-w-4xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Submit New Article</CardTitle>
      </CardHeader>

      <CardContent>
        <StepIndicator currentStep={currentStep} />

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {renderStep()}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(prev => prev - 1)}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>

        <div className="space-x-2">
          <Button
            variant="outline"
            onClick={() => router.push('/articles')}
            disabled={saving}
          >
            Cancel
          </Button>

          {currentStep < 3 ? (
            <Button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={saving || !canProceed()}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit for Review
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
};

export default ArticleSubmission;