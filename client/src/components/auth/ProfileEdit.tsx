import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertTitle } from '@/components/ui/Alert';
import { Save, X } from 'lucide-react';
import ApiClient, { UserProfile } from '@/lib/ApiClient';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  biography: string;
}

const ProfileEdit = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    biography: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User not found');
      }

      const response = await ApiClient.profiles.get(userId);
      const profile = response.data;

      setFormData({
        firstName: profile.firstName,
        lastName: profile.lastName,
        biography: profile.biography
      });
    } catch (err) {
      setError('Error loading profile');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      // Validation
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        throw new Error('First name and last name are required');
      }

      if (!formData.biography.trim()) {
        throw new Error('Biography is required');
      }

      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User not found');
      }

      await ApiClient.profiles.update(userId, formData);
      router.push('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving profile');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="max-w-2xl mx-auto my-8">
        <CardContent className="p-6">
          <div className="flex justify-center">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto my-8">
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>{error}</AlertTitle>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  firstName: e.target.value
                }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  lastName: e.target.value
                }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="biography">Biography</Label>
            <Textarea
              id="biography"
              value={formData.biography}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                biography: e.target.value
              }))}
              placeholder="Tell us about your background and expertise..."
              className="min-h-[200px]"
              required
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
            Save Changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default ProfileEdit;