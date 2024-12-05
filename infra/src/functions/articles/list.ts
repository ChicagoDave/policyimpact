// infra/src/functions/articles/list.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  Article, 
  UserProfile,
  ArticleResponse,
  query, 
  batchGet,
  verifyToken 
} from '../../lib';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify authentication
    const token = await verifyToken(event);

    // Parse query parameters
    const status = event.queryStringParameters?.status;
    const authorId = event.queryStringParameters?.authorId;
    const tag = event.queryStringParameters?.tag;

    // Base query parameters
    let keyConditionExpression = 'id > :empty';
    let expressionAttributeValues: Record<string, any> = {
      ':empty': ''
    };

    // Add filters if provided
    if (status) {
      keyConditionExpression += ' AND status = :status';
      expressionAttributeValues[':status'] = status;
    }

    if (authorId) {
      keyConditionExpression += ' AND contains(authorIds, :authorId)';
      expressionAttributeValues[':authorId'] = authorId;
    }

    if (tag) {
      keyConditionExpression += ' AND contains(tags, :tag)';
      expressionAttributeValues[':tag'] = tag;
    }

    // Query articles
    const articles = await query<Article>(
      'ArticlesTable',
      keyConditionExpression,
      expressionAttributeValues
    );

    // Get all unique author IDs
    const authorIds = [...new Set(articles.flatMap(a => a.authorIds))];

    // Get authors
    const authors = await batchGet<UserProfile>(
      'AuthorsTable',
      authorIds.map(id => ({ id }))
    );

    // Get all unique reference IDs
    const referenceIds = [...new Set(articles.flatMap(a => a.referenceIds))];

    // Get references if there are any
    const references = referenceIds.length > 0 
      ? await batchGet('ReferencesTable', referenceIds.map(id => ({ id })))
      : [];

    // Build response
    const response: ArticleResponse[] = articles.map(article => ({
      ...article,
      authors: authors.filter(author => 
        article.authorIds.includes(author.id)
      ),
      references: references.filter(ref => 
        article.referenceIds.includes(ref.id)
      )
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error listing articles:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};