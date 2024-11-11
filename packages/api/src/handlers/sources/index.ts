// packages/api/src/handlers/sources/index.ts
import { DynamoDB } from 'aws-sdk';
import { dynamoDB, ARTICLES_TABLE } from '../../shared/dynamo';
import { APIError, handleError } from '../../shared/errors';
import { ArticleHandler } from '../articles/types';

export const validateSource: ArticleHandler = async (event) => {
  try {
    const { id, sourceId } = event.pathParameters || {};
    const { userId } = event.requestContext.authorizer || {};
    const body = JSON.parse(event.body || '{}');

    if (!id || !sourceId) {
      throw new APIError(400, 'Article ID and Source ID are required');
    }

    if (!userId) {
      throw new APIError(401, 'Unauthorized');
    }

    const result = await dynamoDB.update({
      TableName: ARTICLES_TABLE,
      Key: { id },
      UpdateExpression: 
        'SET sources[index_of_source].status = :status, ' +
        'sources[index_of_source].validatedBy = :validatedBy, ' +
        'sources[index_of_source].validatedAt = :validatedAt, ' +
        'sources[index_of_source].validationNotes = :validationNotes, ' +
        '#updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#updatedAt': 'updatedAt'
      },
      ExpressionAttributeValues: {
        ':status': body.status,
        ':validatedBy': userId,
        ':validatedAt': new Date().toISOString(),
        ':validationNotes': body.notes,
        ':updatedAt': new Date().toISOString(),
        ':sourceId': sourceId
      },
      ConditionExpression: 'contains(sources[*].id, :sourceId)',
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