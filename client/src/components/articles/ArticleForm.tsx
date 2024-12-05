import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertTitle } from '@/components/ui/Alert';
import { Label } from '@/components/ui/Label';
import { Save, Send } from 'lucide-react';
import ApiClient from '@/lib/ApiClient';
import useAuth from '@/hooks/UseAuth';
import { Article } from '@/lib/ApiClient';

interface ArticleFormProps {
  initialData?: Partial<Article>;
}

export default function ArticleForm({ initialData }: ArticleFormProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    subtitle: initialData?.subtitle || '',
    content: initialData?.content || '',
    tags: initialData?.tags?.join(', ') || ''
  });

  const handleSubmit = async (isDraft: boolean) => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.sub) {
        throw new Error('User not authenticated');
      }

      const tags = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      const articleData = {
        title: formData.title,
        subtitle: formData.subtitle || undefined,
        content: formData.content,
        tags,
        authorIds: initialData?.authorIds || [user.sub],
        referenceIds: initialData?.referenceIds || []
      };

      if (initialData?.id) {
        // Update existing article
        await ApiClient.articles.update(initialData.id, articleData);
        if (!isDraft) {
          await ApiClient.articles.submit(initialData.id);
        }
      } else {
        // Create new article
        const response = await ApiClient.articles.create(articleData);
        if (!isDraft) {
          await ApiClient.articles.submit(response.data.id);
        }
      }

      router.push('/articles');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {initialData?.id ? 'Edit Article' : 'New Article'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>{error}</AlertTitle>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={e => setFormData(prev => ({ 
              ...prev, 
              title: e.target.value 
            }))}
            placeholder="Enter article title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subtitle">Subtitle (Optional)</Label>
          <Input
            id="subtitle"
            value={formData.subtitle}
            onChange={e => setFormData(prev => ({ 
              ...prev, 
              subtitle: e.target.value 
            }))}
            placeholder="Enter article subtitle"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            value={formData.content}
            onChange={e => setFormData(prev => ({ 
              ...prev, 
              content: e.target.value 
            }))}
            placeholder="Write your article content here..."
            className="min-h-[400px]"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags (comma-separated)</Label>
          <Input
            id="tags"
            value={formData.tags}
            onChange={e => setFormData(prev => ({ 
              ...prev, 
              tags: e.target.value 
            }))}
            placeholder="policy, research, analysis"
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button
          variant="outline"
          onClick={() => handleSubmit(true)}
          disabled={loading}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Draft
        </Button>
        <Button
          onClick={() => handleSubmit(false)}
          disabled={loading}
        >
          <Send className="w-4 h-4 mr-2" />
          Submit for Review
        </Button>
      </CardFooter>
    </Card>
  );
}