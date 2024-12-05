import { z } from 'zod';
import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Alert, AlertTitle } from '@/components/ui/Alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import { Reference } from '@/lib/ApiClient';

// Zod schema for reference validation
const referenceSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters'),
  url: z.string()
    .min(1, 'URL is required')
    .url('Must be a valid URL')
    .refine((url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }, 'Must be a valid URL'),
  authors: z.array(
    z.object({
      name: z.string()
        .min(1, 'Author name is required')
        .max(100, 'Author name must not exceed 100 characters')
    })
  ).min(1, 'At least one author is required'),
  publishedDate: z.string().optional(),
  publisher: z.string()
    .min(1, 'Publisher is required')
    .max(100, 'Publisher must not exceed 100 characters'),
  description: z.string()
    .min(1, 'Description is required')
    .max(1000, 'Description must not exceed 1000 characters'),
  type: z.enum(['ACADEMIC', 'GOVERNMENT', 'NEWS', 'OTHER'], {
    required_error: 'Reference type is required'
  })
});

type ReferenceFormData = z.infer<typeof referenceSchema>;

interface ReferenceFormProps {
  onSuccess?: (reference: Reference) => void;
  onCancel?: () => void;
}

const ReferenceForm = ({ onSuccess, onCancel }: ReferenceFormProps) => {
  const [saving, setSaving] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReferenceFormData>({
    resolver: zodResolver(referenceSchema),
    defaultValues: {
      authors: [{ name: '' }],
      type: 'ACADEMIC'
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'authors'
  });

  const onSubmit = async (data: ReferenceFormData) => {
    try {
      setSaving(true);

      // Transform form data to API format
      const referenceData = {
        ...data,
        authors: data.authors.map(author => author.name)
      };

      const response = await fetch('https://api.policyimpact.us/references', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(referenceData)
      });

      if (!response.ok) {
        throw new Error('Failed to save reference');
      }

      const savedReference = await response.json();
      onSuccess?.(savedReference);
    } catch (error) {
      console.error('Error saving reference:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Add Reference</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Reference title"
            />
            {errors.title && (
              <Alert variant="destructive">
                <AlertTitle>{errors.title.message}</AlertTitle>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              type="url"
              {...register('url')}
              placeholder="https://..."
            />
            {errors.url && (
              <Alert variant="destructive">
                <AlertTitle>{errors.url.message}</AlertTitle>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label>Authors</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2">
                <Input
                  {...register(`authors.${index}.name`)}
                  placeholder="Author name"
                />
                {index > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: '' })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Author
            </Button>
            {errors.authors && (
              <Alert variant="destructive">
                <AlertTitle>{errors.authors.message}</AlertTitle>
              </Alert>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="publisher">Publisher</Label>
              <Input
                id="publisher"
                {...register('publisher')}
                placeholder="Publisher name"
              />
              {errors.publisher && (
                <Alert variant="destructive">
                  <AlertTitle>{errors.publisher.message}</AlertTitle>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="publishedDate">Published Date</Label>
              <Input
                id="publishedDate"
                type="date"
                {...register('publishedDate')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={undefined}
              onValueChange={(value) => {
                const event = {
                  target: {
                    name: 'type',
                    value: value
                  }
                };
                register('type').onChange(event);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select reference type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACADEMIC">Academic</SelectItem>
                <SelectItem value="GOVERNMENT">Government</SelectItem>
                <SelectItem value="NEWS">News</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <Alert variant="destructive">
                <AlertTitle>{errors.type.message}</AlertTitle>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Brief description of the reference..."
            />
            {errors.description && (
              <Alert variant="destructive">
                <AlertTitle>{errors.description.message}</AlertTitle>
              </Alert>
            )}
          </div>
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
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Reference'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ReferenceForm;