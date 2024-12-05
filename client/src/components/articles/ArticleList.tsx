// client/src/components/articles/ArticleList.tsx
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Eye, Edit, Plus, Search } from 'lucide-react';
import { useAuth } from '@/hooks/UseAuth';

interface Author {
  id: string;
  firstName: string;
  lastName: string;
}

interface Article {
  id: string;
  title: string;
  subtitle?: string;
  status: ArticleStatus;
  authors: Author[];
  tags: string[];
  updatedAt: string;
}

type ArticleStatus = 
  | 'DRAFT'
  | 'RESEARCH_REQUIRED'
  | 'RESEARCH_IN_PROGRESS'
  | 'REVIEW_REQUIRED'
  | 'REVIEW_IN_PROGRESS'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED';

interface ListResponse {
  items: Article[];
  lastEvaluatedKey?: string;
}

const ArticleList: React.FC = () => {
  const router = useRouter();
  const { user, token } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | ''>('');
  const [lastKey, setLastKey] = useState<string | undefined>();

  const fetchArticles = async (reset: boolean = false) => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      
      if (statusFilter) queryParams.append('status', statusFilter);
      if (searchTerm) queryParams.append('search', searchTerm);
      if (!reset && lastKey) queryParams.append('lastEvaluatedKey', lastKey);
      
      const response = await fetch(
        `https://api.policyimpact.us/articles?${queryParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Failed to fetch articles');
      
      const data: ListResponse = await response.json();
      
      setArticles(prev => reset ? data.items : [...prev, ...data.items]);
      setLastKey(data.lastEvaluatedKey);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading articles');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchArticles(true);
    }
  }, [statusFilter, token]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchArticles(true);
  };

  const getStatusColor = (status: ArticleStatus): string => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-500';
      case 'RESEARCH_REQUIRED': return 'bg-blue-500';
      case 'RESEARCH_IN_PROGRESS': return 'bg-yellow-500';
      case 'REVIEW_REQUIRED': return 'bg-purple-500';
      case 'REVIEW_IN_PROGRESS': return 'bg-orange-500';
      case 'REVISION_REQUIRED': return 'bg-red-500';
      case 'APPROVED': return 'bg-green-500';
      case 'PUBLISHED': return 'bg-emerald-500';
      case 'ARCHIVED': return 'bg-gray-700';
      default: return 'bg-gray-500';
    }
  };

  const canEditArticle = (article: Article): boolean => {
    if (!user) return false;
    if (user.role === 'EDITOR') return true;
    if (user.role === 'AUTHOR') {
      return article.authors.some(author => author.id === user.sub);
    }
    return false;
  };

  const getFormattedDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!token) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-gray-500">Please log in to view articles.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Articles</h1>
        {user && ['AUTHOR', 'EDITOR'].includes(user.role) && (
          <Button onClick={() => router.push('/articles/new')}>
            <Plus className="w-4 h-4 mr-2" />
            New Article
          </Button>
        )}
      </div>

      <div className="mb-6 flex gap-4">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Input
              type="text"
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
            <Search className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </form>

        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as ArticleStatus | '')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="RESEARCH_REQUIRED">Research Required</SelectItem>
            <SelectItem value="RESEARCH_IN_PROGRESS">Research In Progress</SelectItem>
            <SelectItem value="REVIEW_REQUIRED">Review Required</SelectItem>
            <SelectItem value="REVIEW_IN_PROGRESS">Under Review</SelectItem>
            <SelectItem value="REVISION_REQUIRED">Revision Required</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="mb-6 text-red-500 p-4 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {articles.map(article => (
          <Card key={article.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">{article.title}</CardTitle>
                  {article.subtitle && (
                    <p className="text-gray-500 mt-1">{article.subtitle}</p>
                  )}
                </div>
                <Badge className={`${getStatusColor(article.status)} text-white`}>
                  {article.status.replace(/_/g, ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  <p>By: {article.authors.map(a => `${a.firstName} ${a.lastName}`).join(', ')}</p>
                  <p>Updated: {getFormattedDate(article.updatedAt)}</p>
                  {article.tags.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {article.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/articles/${article.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  {canEditArticle(article) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/articles/${article.id}/edit`)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && articles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No articles found.
          </div>
        )}

        {lastKey && articles.length > 0 && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={() => fetchArticles()}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArticleList;