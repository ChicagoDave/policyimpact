// packages/api/src/handlers/workflow/index.ts
import { DynamoDB } from 'aws-sdk';
import { Article } from '@policyimpact/shared/types';
import { dynamoDB, ARTICLES_TABLE } from '../../shared/dynamo';
import { APIError, handleError } from '../../shared/errors';
import { ArticleHandler } from '../articles/types';

export const submitForReview: ArticleHandler = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    const { userId } = event.requestContext.authorizer || {};

    if (!id) {
      throw new APIError(400, 'Article ID is required');
    }

    if (!userId) {
      throw new APIError(401, 'Unauthorized');
    }

    const result = await dynamoDB.get({
      TableName: ARTICLES_TABLE,
      Key: { id }
    }).promise();

    if (!result.Item) {
      throw new APIError(404, 'Article not found');
    }

    const article = result.Item as Article;

    if (article.status !== 'draft') {
      throw new APIError(400, 'Only draft articles can be submitted for review');
    }

    const updatedArticle = await dynamoDB.update({
      TableName: ARTICLES_TABLE,
      Key: { id },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':status': 'in_review',
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(updatedArticle.Attributes)
    };
  } catch (error) {
    return handleError(error);
  }
};

export const publish: ArticleHandler = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    const { userId, userRole } = event.requestContext.authorizer || {};

    if (!id) {
      throw new APIError(400, 'Article ID is required');
    }

    if (!userId || userRole !== 'admin') {
      throw new APIError(401, 'Unauthorized - only admins can publish articles');
    }

    const article = await dynamoDB.get({
      TableName: ARTICLES_TABLE,
      Key: { id }
    }).promise();

    if (!article.Item) {
      throw new APIError(404, 'Article not found');
    }

    if (article.Item.status !== 'approved') {
      throw new APIError(400, 'Only approved articles can be published');
    }

    const hasUnvalidatedSources = article.Item.sources?.some(
      (source: any) => source.status !== 'validated'
    );

    if (hasUnvalidatedSources) {
      throw new APIError(400, 'All sources must be validated before publishing');
    }

    const result = await dynamoDB.update({
      TableName: ARTICLES_TABLE,
      Key: { id },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':status': 'published',
        ':updatedAt': new Date().toISOString()
      },
      ReturnValues: 'ALL_NEW'
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(result.Attributes)
    };
  } catch (error) {
    return handleError(error);
  }
};