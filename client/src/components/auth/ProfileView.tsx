import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertTitle } from '@/components/ui/Alert';
import { Edit, GraduationCap, Mail } from 'lucide-react';
import ApiClient, { UserProfile, Credential } from '@/lib/ApiClient';

const ProfileView = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User not found');
      }

      const [profileResponse, credentialsResponse] = await Promise.all([
        ApiClient.profiles.get(userId),
        ApiClient.credentials.list(userId)
      ]);

      setProfile(profileResponse.data);
      setCredentials(credentialsResponse.data);
    } catch (err) {
      setError('Error loading profile');
      console.error(err);
    } finally {
      setLoading(false);
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

  if (!profile) {
    return (
      <Card className="max-w-2xl mx-auto my-8">
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertTitle>Error loading profile</AlertTitle>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto my-8 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Profile</CardTitle>
          <Button 
            variant="outline" 
            onClick={() => router.push('/profile/edit')}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-medium">
              {profile.firstName} {profile.lastName}
            </h3>
            <div className="flex items-center text-sm text-gray-500">
              <Mail className="w-4 h-4 mr-2" />
              {profile.email}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Roles</h4>
            <div className="flex gap-2">
              {profile.roles.map(role => (
                <Badge key={role} variant="secondary">
                  {role}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Biography</h4>
            <p className="text-sm text-gray-600">{profile.biography}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Credentials</CardTitle>
          <Button 
            variant="outline"
            onClick={() => router.push('/profile/credentials/new')}
          >
            <GraduationCap className="w-4 h-4 mr-2" />
            Add Credential
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {credentials.map(credential => (
              <div
                key={credential.id}
                className="p-4 border rounded-lg space-y-2"
              >
                <div className="flex justify-between items-start">
                  <h4 className="font-medium">{credential.title}</h4>
                  <Badge>{credential.field}</Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {credential.institution} ({credential.yearObtained})
                </p>
                {credential.description && (
                  <p className="text-sm text-gray-500">
                    {credential.description}
                  </p>
                )}
              </div>
            ))}
            {credentials.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No credentials added yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileView;