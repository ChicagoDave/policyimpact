// infra/src/functions/articles/post.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { 
  Article,
  CreateArticleRequest,
  get,
  put,
  verifyToken,
  requireRole,
  validateString,
  validateArray
} from '../../lib';
import { ValidationError } from '../../lib/validation/validator';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify authentication and role
    const token = await verifyToken(event);
    requireRole(token, 'AUTHOR');

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Request body is required' })
      };
    }

    const request: CreateArticleRequest = JSON.parse(event.body);

    // Validate request
    validateString(request.title, 'title', 1, 200);
    validateString(request.content, 'content', 1, 50000);
    validateArray(request.authorIds, 'authorIds', 1, 5);
    validateArray(request.tags, 'tags', 1, 10);

    // Ensure the current user is one of the authors
    if (!request.authorIds.includes(token.sub)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ 
          message: 'Current user must be one of the authors' 
        })
      };
    }

    // Verify all authors exist
    for (const authorId of request.authorIds) {
      const author = await get('AuthorsTable', { id: authorId });
      if (!author) {
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            message: `Author with ID ${authorId} not found` 
          })
        };
      }
    }

    const now = new Date().toISOString();
    const article: Article = {
      id: uuidv4(),
      title: request.title,
      subtitle: request.subtitle,
      content: request.content,
      status: 'DRAFT',
      authorIds: request.authorIds,
      referenceIds: [],
      tags: request.tags,
      createdAt: now,
      updatedAt: now
    };

    await put('ArticlesTable', article);

    return {
      statusCode: 201,
      body: JSON.stringify(article)
    };

  } catch (error) {
    console.error('Error creating article:', error);

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