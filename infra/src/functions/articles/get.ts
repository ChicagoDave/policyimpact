// infra/src/functions/articles/get.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  Article, 
  UserProfile,
  Reference,
  ArticleResponse,
  get, 
  batchGet,
  verifyToken 
} from '../../lib';
import { ValidationError } from '../../lib/validation/validator';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify authentication
    await verifyToken(event);

    const articleId = event.pathParameters?.id;
    if (!articleId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Article ID is required' })
      };
    }

    // Get article
    const article = await get<Article>('ArticlesTable', { id: articleId });
    if (!article) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Article not found' })
      };
    }

    // Get authors
    const authors = await batchGet<UserProfile>(
      'AuthorsTable',
      article.authorIds.map(id => ({ id }))
    );

    // Get references
    const references = await batchGet<Reference>(
      'ReferencesTable',
      article.referenceIds.map(id => ({ id }))
    );

    const response: ArticleResponse = {
      ...article,
      authors,
      references
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error getting article:', error);

    if (error instanceof ValidationError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: error.message })
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};