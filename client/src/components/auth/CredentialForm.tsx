import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertTitle } from '@/components/ui/Alert';
import { Save, X } from 'lucide-react';
import ApiClient, { Credential } from '@/lib/ApiClient';

interface CredentialFormData {
  title: string;
  institution: string;
  yearObtained: string;
  field: string;
  description?: string;
}

const CredentialForm = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<CredentialFormData>({
    title: '',
    institution: '',
    yearObtained: new Date().getFullYear().toString(),
    field: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      // Validation
      if (!formData.title.trim() || !formData.institution.trim() || !formData.field.trim()) {
        throw new Error('Please fill in all required fields');
      }

      const year = parseInt(formData.yearObtained);
      if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) {
        throw new Error('Please enter a valid year');
      }

      await ApiClient.credentials.create({
        ...formData,
        yearObtained: year
      });

      router.push('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving credential');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Add Credential</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title/Degree</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                title: e.target.value
              }))}
              placeholder="e.g., Ph.D. in Political Science"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution">Institution</Label>
            <Input
              id="institution"
              value={formData.institution}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                institution: e.target.value
              }))}
              placeholder="e.g., Harvard University"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="yearObtained">Year Obtained</Label>
              <Input
                id="yearObtained"
                type="number"
                min="1900"
                max={new Date().getFullYear()}
                value={formData.yearObtained}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  yearObtained: e.target.value
                }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field">Field</Label>
              <Input
                id="field"
                value={formData.field}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  field: e.target.value
                }))}
                placeholder="e.g., Political Science"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                description: e.target.value
              }))}
              placeholder="Describe your degree/credential and any specializations..."
              className="min-h-[100px]"
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
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
            Save Credential
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default CredentialForm;