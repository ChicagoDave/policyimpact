import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Eye, Plus, Search } from 'lucide-react';
import ApiClient, { Reference } from '@/lib/ApiClient';

const REFERENCES_PER_PAGE = 10;

const ReferenceList = () => {
  const router = useRouter();
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchReferences();
  }, []);

  const fetchReferences = async () => {
    try {
      setLoading(true);
      const response = await ApiClient.references.list();
      setReferences(response.data);
    } catch (err) {
      setError('Failed to load references');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReferences = references.filter(reference => {
    const matchesSearch = searchTerm === '' ||
      reference.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reference.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reference.authors.some(author => author.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = selectedType === '' || reference.type === selectedType;

    return matchesSearch && matchesType;
  });

  const paginatedReferences = filteredReferences.slice(
    (currentPage - 1) * REFERENCES_PER_PAGE,
    currentPage * REFERENCES_PER_PAGE
  );

  const totalPages = Math.ceil(filteredReferences.length / REFERENCES_PER_PAGE);

  const getVerificationBadge = (reference: Reference) => {
    if (reference.verifiedAt) {
      return (
        <Badge className="bg-green-500">
          Verified
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        Unverified
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <CardTitle>References</CardTitle>
        <Button onClick={() => router.push('/references/new')}>
          <Plus className="w-4 h-4 mr-2" />
          Add Reference
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search references..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select
              value={selectedType}
              onValueChange={setSelectedType}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="ACADEMIC">Academic</SelectItem>
                <SelectItem value="GOVERNMENT">Government</SelectItem>
                <SelectItem value="NEWS">News</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading references...</div>
          ) : error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : (
            <div className="space-y-4">
              {paginatedReferences.map(reference => (
                <div
                  key={reference.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-medium">{reference.title}</h3>
                      <p className="text-sm text-gray-500">
                        {reference.authors.join(', ')}
                      </p>
                      <p className="text-sm text-blue-500">{reference.url}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getVerificationBadge(reference)}
                      <Badge variant="outline">{reference.type}</Badge>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-between items-center">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {reference.description}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/references/${reference.id}`)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              ))}

              {paginatedReferences.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No references found
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="py-2">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReferenceList;