// infra/src/functions/articles/put.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { 
  Article,
  UpdateArticleRequest,
  get,
  update,
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
    // Verify authentication
    const token = await verifyToken(event);
    
    const articleId = event.pathParameters?.id;
    if (!articleId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Article ID is required' })
      };
    }

    // Get existing article
    const article = await get<Article>('ArticlesTable', { id: articleId });
    if (!article) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Article not found' })
      };
    }

    // Check if user has permission to update
    const isAuthor = article.authorIds.includes(token.sub);
    const isEditor = token['custom:role'] === 'EDITOR';
    if (!isAuthor && !isEditor) {
      return {
        statusCode: 403,
        body: JSON.stringify({ 
          message: 'Only authors and editors can update articles' 
        })
      };
    }

    // Check if article is in an editable state
    const editableStatuses: Article['status'][] = ['DRAFT', 'REVISION_REQUIRED'];
    if (!editableStatuses.includes(article.status) && !isEditor) {
      return {
        statusCode: 403,
        body: JSON.stringify({ 
          message: `Articles in ${article.status} status can only be edited by editors` 
        })
      };
    }

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Request body is required' })
      };
    }

    const request: UpdateArticleRequest = JSON.parse(event.body);

    // Build update expression and attributes
    let updateExpression = 'SET updatedAt = :updatedAt';
    const expressionAttributeValues: Record<string, any> = {
      ':updatedAt': new Date().toISOString()
    };

    // Validate and add fields to update
    if (request.title !== undefined) {
      validateString(request.title, 'title', 1, 200);
      updateExpression += ', title = :title';
      expressionAttributeValues[':title'] = request.title;
    }

    if (request.subtitle !== undefined) {
      if (request.subtitle) {
        validateString(request.subtitle, 'subtitle', 1, 500);
      }
      updateExpression += ', subtitle = :subtitle';
      expressionAttributeValues[':subtitle'] = request.subtitle;
    }

    if (request.content !== undefined) {
      validateString(request.content, 'content', 1, 50000);
      updateExpression += ', content = :content';
      expressionAttributeValues[':content'] = request.content;
    }

    if (request.tags !== undefined) {
      validateArray(request.tags, 'tags', 1, 10);
      updateExpression += ', tags = :tags';
      expressionAttributeValues[':tags'] = request.tags;
    }

    // Update the article
    const updatedArticle = await update<Article>(
      'ArticlesTable',
      { id: articleId },
      updateExpression,
      expressionAttributeValues
    );

    return {
      statusCode: 200,
      body: JSON.stringify(updatedArticle)
    };

  } catch (error) {
    console.error('Error updating article:', error);

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