import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import { CalendarDays, Edit, ExternalLink, FileText, Globe, Shield, User } from 'lucide-react';
import ApiClient, { Reference, Article, UserProfile } from '@/lib/ApiClient';
import useAuth from '@/hooks/UseAuth';

const ReferenceDetails = ({ id }: { id: string }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [reference, setReference] = useState<Reference | null>(null);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);
  const [verifier, setVerifier] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReferenceData();
  }, [id]);

  const fetchReferenceData = async () => {
    try {
      setLoading(true);
      const [referenceResponse, articlesResponse] = await Promise.all([
        ApiClient.references.get(id),
        ApiClient.articles.list()
      ]);

      const reference = referenceResponse.data;
      setReference(reference);

      // Filter articles that use this reference
      const relatedArticles = articlesResponse.data.filter(
        article => article.referenceIds.includes(id)
      );
      setRelatedArticles(relatedArticles);

      // If reference is verified, fetch verifier details
      if (reference.verifiedBy) {
        const verifierResponse = await ApiClient.profiles.get(reference.verifiedBy);
        setVerifier(verifierResponse.data);
      }
    } catch (err) {
      setError('Failed to load reference details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    try {
      setLoading(true);
      await ApiClient.references.verify(id);
      await fetchReferenceData(); // Refresh data
    } catch (err) {
      setError('Failed to verify reference');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        Loading reference details...
      </div>
    );
  }

  if (error || !reference) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error || 'Reference not found'}
        </AlertDescription>
      </Alert>
    );
  }

  const isEditor = user?.role === 'EDITOR';
  const canVerify = isEditor && !reference.verifiedBy;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold">{reference.title}</h1>
          <p className="text-gray-500 mt-1">
            Added on {new Date(reference.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          {canVerify && (
            <Button onClick={handleVerify}>
              <Shield className="w-4 h-4 mr-2" />
              Verify Reference
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push(`/references/${id}/edit`)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Reference Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={reference.verifiedBy ? "default" : "secondary"}>
                {reference.verifiedBy ? "Verified" : "Unverified"}
              </Badge>
              <Badge variant="outline">{reference.type}</Badge>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-2">
                <Globe className="w-4 h-4 mt-1 flex-shrink-0" />
                <a 
                  href={reference.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline flex items-center gap-1"
                >
                  {reference.url}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-start gap-2">
                <User className="w-4 h-4 mt-1 flex-shrink-0" />
                <div>
                  <div className="font-medium">Authors</div>
                  <div>{reference.authors.join(', ')}</div>
                </div>
              </div>

              {reference.publisher && (
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Publisher</div>
                    <div>{reference.publisher}</div>
                  </div>
                </div>
              )}

              {reference.publishedDate && (
                <div className="flex items-start gap-2">
                  <CalendarDays className="w-4 h-4 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium">Published Date</div>
                    <div>{new Date(reference.publishedDate).toLocaleDateString()}</div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4">
              <h4 className="font-medium mb-2">Description</h4>
              <p className="text-gray-600">{reference.description}</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Verification Status</CardTitle>
            </CardHeader>
            <CardContent>
              {reference.verifiedBy ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span className="font-medium">Verified Reference</span>
                  </div>
                  {verifier && (
                    <>
                      <p className="text-sm text-gray-500">
                        Verified by {verifier.firstName} {verifier.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        on {new Date(reference.verifiedAt!).toLocaleDateString()}
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-gray-500">
                  This reference has not been verified yet.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Used In Articles</CardTitle>
              <CardDescription>
                Articles that cite this reference
              </CardDescription>
            </CardHeader>
            <CardContent>
              {relatedArticles.length > 0 ? (
                <div className="space-y-3">
                  {relatedArticles.map(article => (
                    <div 
                      key={article.id}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/articles/${article.id}`)}
                    >
                      <div className="font-medium">{article.title}</div>
                      <div className="text-sm text-gray-500">
                        Status: {article.status.replace(/_/g, ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">
                  This reference is not currently used in any articles.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReferenceDetails;