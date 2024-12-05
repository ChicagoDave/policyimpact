import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Eye, Calendar, Clock, User, Link, ArrowLeft } from 'lucide-react';

interface Author {
  firstName: string;
  lastName: string;
  biography: string;
  credentialIds: string[];
}

interface Reference {
  id: string;
  title: string;
  url: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  type: 'ACADEMIC' | 'GOVERNMENT' | 'NEWS' | 'OTHER';
}

interface ArticleViewProps {
  article: {
    id: string;
    title: string;
    subtitle?: string;
    content: string;
    publishedAt: string;
    authors: Author[];
    references: Reference[];
    tags: string[];
    researchNotes?: string;
  };
}

const ArticleView = ({ article }: ArticleViewProps) => {
  const router = useRouter();
  const publishDate = new Date(article.publishedAt).toLocaleDateString();

  return (
    <div className="max-w-4xl mx-auto my-8 space-y-8">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={() => router.back()}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Articles
      </Button>

      {/* Main Article Content */}
      <Card>
        <CardHeader>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold">{article.title}</CardTitle>
            {article.subtitle && (
              <p className="text-xl text-gray-600">{article.subtitle}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {article.tags.map(tag => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Article Metadata */}
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-8">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              Published: {publishDate}
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              {Math.ceil(article.content.split(' ').length / 200)} min read
            </div>
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              <User className="w-4 h-4 mr-1" />
              {article.authors.length} author{article.authors.length > 1 ? 's' : ''}
            </div>
          </div>

          {/* Article Content */}
          <div className="prose max-w-none">
            {article.content.split('\n').map((paragraph, index) => (
              <p key={index} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Authors Section */}
      <Card>
        <CardHeader>
          <CardTitle>Authors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {article.authors.map((author, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <h3 className="text-lg font-semibold">
                  {author.firstName} {author.lastName}
                </h3>
                <p className="text-gray-600 mt-2">{author.biography}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* References Section */}
      <Card>
        <CardHeader>
          <CardTitle>References</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {article.references.map((reference) => (
              <div key={reference.id} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <h4 className="font-medium">{reference.title}</h4>
                    <p className="text-sm text-gray-500">
                      {reference.authors.join(', ')}
                    </p>
                    {reference.publisher && (
                      <p className="text-sm text-gray-500">
                        {reference.publisher}
                        {reference.publishedDate && 
                          ` • ${new Date(reference.publishedDate).toLocaleDateString()}`
                        }
                      </p>
                    )}
                  </div>
                  <Badge>{reference.type}</Badge>
                </div>
                <Button
                  variant="ghost"
                  className="mt-2"
                  onClick={() => window.open(reference.url, '_blank')}
                >
                  <Link className="w-4 h-4 mr-2" />
                  View Source
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Research Notes Section */}
      {article.researchNotes && (
        <Card>
          <CardHeader>
            <CardTitle>Research Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              {article.researchNotes.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ArticleView;