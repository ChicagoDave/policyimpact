// packages/api/src/handlers/reviews/index.ts
import { DynamoDB } from 'aws-sdk';
import { Article, ReviewRecord, User } from '@policyimpact/shared/types';
import { dynamoDB, ARTICLES_TABLE, REVIEW_TABLE } from '../../shared/dynamo';
import { APIError, handleError } from '../../shared/errors';
import { ArticleHandler } from '../articles/types';

export const submitReview: ArticleHandler = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    const { userId, userRole } = event.requestContext.authorizer || {};
    const body = JSON.parse(event.body || '{}');

    if (!id || !body.decision || !body.comments) {
      throw new APIError(400, 'Missing required fields');
    }

    if (!userId || !userRole) {
      throw new APIError(401, 'Unauthorized');
    }

    // Verify article exists and is in review
    const article = await dynamoDB.get({
      TableName: ARTICLES_TABLE,
      Key: { id }
    }).promise();

    if (!article.Item) {
      throw new APIError(404, 'Article not found');
    }

    if (article.Item.status !== 'in_review') {
      throw new APIError(400, 'Article is not in review status');
    }

    // Create review record
    const review: ReviewRecord = {
      articleId: id,
      reviewerId: userId,
      role: userRole as User['role'],
      decision: body.decision,
      comments: body.comments,
      timestamp: new Date().toISOString()
    };

    await dynamoDB.put({
      TableName: REVIEW_TABLE,
      Item: review
    }).promise();

    // Check if all required reviews are complete
    const reviews = await dynamoDB.query({
      TableName: REVIEW_TABLE,
      KeyConditionExpression: 'articleId = :articleId',
      ExpressionAttributeValues: {
        ':articleId': id
      }
    }).promise();

    // Logic to check if we have all required reviews
    const hasEditorReview = reviews.Items?.some(r => r.role === 'editor');
    const hasProofreaderReview = reviews.Items?.some(r => r.role === 'proofreader');
    const allApproved = reviews.Items?.every(r => r.decision === 'approved');

    if (hasEditorReview && hasProofreaderReview && allApproved) {
      // Update article status to approved
      await dynamoDB.update({
        TableName: ARTICLES_TABLE,
        Key: { id },
        UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status',
          '#updatedAt': 'updatedAt'
        },
        ExpressionAttributeValues: {
          ':status': 'approved',
          ':updatedAt': new Date().toISOString()
        }
      }).promise();
    }

    return {
      statusCode: 201,
      body: JSON.stringify(review)
    };
  } catch (error) {
    return handleError(error);
  }
};

export const getReviews: ArticleHandler = async (event) => {
  try {
    const { id } = event.pathParameters || {};

    if (!id) {
      throw new APIError(400, 'Article ID is required');
    }

    const result = await dynamoDB.query({
      TableName: REVIEW_TABLE,
      KeyConditionExpression: 'articleId = :articleId',
      ExpressionAttributeValues: {
        ':articleId': id
      }
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(result.Items)
    };
  } catch (error) {
    return handleError(error);
  }
};