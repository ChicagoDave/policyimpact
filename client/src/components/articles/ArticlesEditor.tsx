import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Save, Send } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import ApiClient from '@/lib/ApiClient';
import useAuth from '@/hooks/UseAuth';

interface ArticleEditorProps {
  id?: string;
  initialData?: {
    title: string;
    subtitle?: string;
    content: string;
    tags: string[];
    authorIds: string[];
    referenceIds: string[];
  };
}

export default function ArticleEditor({ id, initialData }: ArticleEditorProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    subtitle: initialData?.subtitle || '',
    content: initialData?.content || '',
    tags: initialData?.tags || [],
    authorIds: initialData?.authorIds || (user ? [user.sub] : []),
    referenceIds: initialData?.referenceIds || []
  });

  // Handle form changes
  const handleChange = (
    field: keyof typeof formData,
    value: string | string[]
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    setIsDirty(true);
  };

  // Handle tag input
  const handleTagInput = (value: string) => {
    const tags = value.split(',').map(tag => tag.trim());
    handleChange('tags', tags);
  };

  // Save as draft
  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        title: formData.title,
        subtitle: formData.subtitle,
        content: formData.content,
        tags: formData.tags,
        authorIds: formData.authorIds,
        referenceIds: formData.referenceIds
      };

      if (id) {
        await ApiClient.articles.update(id, payload);
      } else {
        const response = await ApiClient.articles.create(payload);
        id = response.data.id;
      }

      setIsDirty(false);
      router.push(`/articles/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save article');
    } finally {
      setLoading(false);
    }
  };

  // Submit for review
  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      // First save the latest changes
      const payload = {
        title: formData.title,
        subtitle: formData.subtitle,
        content: formData.content,
        tags: formData.tags,
        authorIds: formData.authorIds,
        referenceIds: formData.referenceIds
      };

      let articleId = id;
      if (!articleId) {
        const response = await ApiClient.articles.create(payload);
        articleId = response.data.id;
      } else {
        await ApiClient.articles.update(articleId, payload);
      }

      // Then submit for review
      await ApiClient.articles.submit(articleId);
      router.push(`/articles/${articleId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit article');
    } finally {
      setLoading(false);
    }
  };

  // Form validation
  const isValid = formData.title.trim().length > 0 && 
                 formData.content.trim().length > 0 &&
                 formData.tags.length > 0 &&
                 formData.authorIds.length > 0;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{id ? 'Edit Article' : 'New Article'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={e => handleChange('title', e.target.value)}
            placeholder="Enter article title"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subtitle">Subtitle (Optional)</Label>
          <Input
            id="subtitle"
            value={formData.subtitle}
            onChange={e => handleChange('subtitle', e.target.value)}
            placeholder="Enter article subtitle"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            value={formData.content}
            onChange={e => handleChange('content', e.target.value)}
            placeholder="Write your article content here..."
            className="min-h-[400px]"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={formData.tags.join(', ')}
            onChange={e => handleTagInput(e.target.value)}
            placeholder="policy, research, analysis"
            disabled={loading}
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.tags.map(tag => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
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
          variant="secondary"
          onClick={handleSaveDraft}
          disabled={loading || !isValid}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Draft
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading || !isValid}
        >
          <Send className="w-4 h-4 mr-2" />
          Submit for Review
        </Button>
      </CardFooter>
    </Card>
  );
}