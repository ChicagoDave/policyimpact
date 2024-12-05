import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Alert, AlertTitle } from '@/components/ui/Alert';
import { Save, Send } from 'lucide-react';

interface PolicyFormData {
  title: string;
  description: string;
  type: PolicyType;
  jurisdiction: string;
  agency?: string;
  tags: string[];
  effectiveDate?: string;
}

export default function PolicyEditor() {
  const [formData, setFormData] = useState<PolicyFormData>({
    title: '',
    description: '',
    type: 'LEGISLATION',
    jurisdiction: '',
    tags: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { id } = router.query;
  const isEditing = Boolean(id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`https://api.policyimpact.us/policies${id ? `/${id}` : ''}`, {
        method: id ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save policy');
      }

      router.push('/policies');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-4xl mx-auto my-8">
      <CardHeader>
        <h2 className="text-2xl font-bold">
          {isEditing ? 'Edit Policy' : 'Create New Policy'}
        </h2>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={formData.title}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                title: e.target.value 
              }))}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                description: e.target.value 
              }))}
              className="h-32"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={formData.type}
                onValueChange={value => setFormData(prev => ({ 
                  ...prev, 
                  type: value as PolicyType 
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEGISLATION">Legislation</SelectItem>
                  <SelectItem value="REGULATION">Regulation</SelectItem>
                  <SelectItem value="EXECUTIVE_ORDER">Executive Order</SelectItem>
                  <SelectItem value="COURT_RULING">Court Ruling</SelectItem>
                  <SelectItem value="AGENCY_GUIDANCE">Agency Guidance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Jurisdiction</label>
              <Input
                value={formData.jurisdiction}
                onChange={e => setFormData(prev => ({ 
                  ...prev, 
                  jurisdiction: e.target.value 
                }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Agency (optional)</label>
            <Input
              value={formData.agency}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                agency: e.target.value 
              }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tags</label>
            <Input
              value={formData.tags.join(', ')}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                tags: e.target.value.split(',').map(t => t.trim()) 
              }))}
              placeholder="Enter tags separated by commas"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Effective Date (optional)</label>
            <Input
              type="date"
              value={formData.effectiveDate}
              onChange={e => setFormData(prev => ({ 
                ...prev, 
                effectiveDate: e.target.value 
              }))}
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? (
              'Saving...'
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Policy
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}