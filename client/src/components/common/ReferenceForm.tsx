// client/src/components/common/ReferenceForm.tsx
import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert, AlertTitle } from '@/components/ui/Alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Save, X } from 'lucide-react';
import apiClient from '@/lib/ApiClient';

interface ReferenceFormProps {
  onSuccess?: (reference: Reference) => void;
  onCancel?: () => void;
}

interface Reference {
  id?: string;
  title: string;
  url: string;
  authors: string[];
  publishedDate?: string;
  publisher?: string;
  description: string;
  type: 'ACADEMIC' | 'GOVERNMENT' | 'NEWS' | 'OTHER';
}

// Define API response type
interface ApiResponse<T> {
  data: T;
  error?: string;
}

const ReferenceForm = ({ onSuccess, onCancel }: ReferenceFormProps) => {
  const [reference, setReference] = useState<Omit<Reference, 'id'>>({
    title: '',
    url: '',
    authors: [''],
    description: '',
    type: 'ACADEMIC',
    publisher: '',
    publishedDate: ''
  });
  
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const validateUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!reference.title.trim()) {
      setError('Title is required');
      return;
    }

    if (!validateUrl(reference.url)) {
      setError('Please enter a valid URL');
      return;
    }

    if (!reference.authors.some(author => author.trim())) {
      setError('At least one author is required');
      return;
    }

    if (!reference.description.trim()) {
      setError('Description is required');
      return;
    }

    try {
      setSaving(true);
      const response = await apiClient.references.create({
        ...reference,
        authors: reference.authors.filter(author => author.trim())
      });

      // Type assertion to ensure response matches expected type
      const apiResponse = response as ApiResponse<Reference>;
      
      if (apiResponse.data && onSuccess) {
        onSuccess(apiResponse.data);
      }
    } catch (err) {
      setError('Error saving reference');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleAuthorChange = (index: number, value: string) => {
    const newAuthors = [...reference.authors];
    newAuthors[index] = value;
    
    // Add new empty field if last field has content
    if (index === newAuthors.length - 1 && value.trim()) {
      newAuthors.push('');
    }
    
    setReference(prev => ({
      ...prev,
      authors: newAuthors
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add Reference</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={reference.title}
              onChange={e => setReference(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Reference title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              value={reference.url}
              onChange={e => setReference(prev => ({ ...prev, url: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Authors</Label>
            {reference.authors.map((author, index) => (
              <Input
                key={index}
                value={author}
                onChange={e => handleAuthorChange(index, e.target.value)}
                placeholder="Author name"
                className="mb-2"
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="publisher">Publisher</Label>
              <Input
                id="publisher"
                value={reference.publisher}
                onChange={e => setReference(prev => ({ ...prev, publisher: e.target.value }))}
                placeholder="Publisher name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="publishedDate">Published Date</Label>
              <Input
                id="publishedDate"
                type="date"
                value={reference.publishedDate}
                onChange={e => setReference(prev => ({ ...prev, publishedDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={reference.type}
              onValueChange={value => setReference(prev => ({ ...prev, type: value as Reference['type'] }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACADEMIC">Academic</SelectItem>
                <SelectItem value="GOVERNMENT">Government</SelectItem>
                <SelectItem value="NEWS">News</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={reference.description}
              onChange={e => setReference(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the reference..."
            />
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={saving}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={saving}
          onClick={handleSubmit}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Reference
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ReferenceForm;