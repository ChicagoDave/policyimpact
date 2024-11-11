import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { Article } from '@policyimpact/shared/types';
import { dynamoDB, ARTICLES_TABLE } from '../../shared/dynamo';
import { APIError, handleError } from '../../shared/errors';
import { ArticleHandler, QueryParams } from './types';

export const create: ArticleHandler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const timestamp = new Date().toISOString();
    
    const article: Article = {
      id: uuidv4(),
      title: body.title,
      subtitle: body.subtitle,
      authors: body.authors,
      editors: body.editors,
      researchers: body.researchers,
      body: body.body,
      tags: body.tags,
      decisionKeyword: body.decisionKeyword,
      status: 'draft',
      sources: body.sources,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await dynamoDB.put({
      TableName: ARTICLES_TABLE,
      Item: article,
      ConditionExpression: 'attribute_not_exists(id)'
    }).promise();

    return {
      statusCode: 201,
      body: JSON.stringify(article)
    };
  } catch (error) {
    return handleError(error);
  }
};

export const get: ArticleHandler = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    
    if (!id) {
      throw new APIError(400, 'Article ID is required');
    }

    const result = await dynamoDB.get({
      TableName: ARTICLES_TABLE,
      Key: { id }
    }).promise();

    if (!result.Item) {
      throw new APIError(404, 'Article not found');
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result.Item)
    };
  } catch (error) {
    return handleError(error);
  }
};

export const list: ArticleHandler = async (event) => {
    try {
      const { status, keyword, lastEvaluatedKey, limit } = event.queryStringParameters as QueryParams || {};
      const queryLimit = limit ? parseInt(limit) : 20;
  
      if (status) {
        // Query by status
        const params: DynamoDB.DocumentClient.QueryInput = {
          TableName: ARTICLES_TABLE,
          IndexName: 'StatusIndex',
          KeyConditionExpression: '#status = :status',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':status': status
          },
          Limit: queryLimit
        };
  
        if (lastEvaluatedKey) {
          params.ExclusiveStartKey = JSON.parse(lastEvaluatedKey);
        }
  
        const result = await dynamoDB.query(params).promise();
        return {
          statusCode: 200,
          body: JSON.stringify({
            items: result.Items,
            lastEvaluatedKey: result.LastEvaluatedKey ? 
              JSON.stringify(result.LastEvaluatedKey) : undefined
          })
        };
      } 
      
      if (keyword) {
        // Query by keyword
        const params: DynamoDB.DocumentClient.QueryInput = {
          TableName: ARTICLES_TABLE,
          IndexName: 'KeywordIndex',
          KeyConditionExpression: 'decisionKeyword = :keyword',
          ExpressionAttributeValues: {
            ':keyword': keyword
          },
          Limit: queryLimit
        };
  
        if (lastEvaluatedKey) {
          params.ExclusiveStartKey = JSON.parse(lastEvaluatedKey);
        }
  
        const result = await dynamoDB.query(params).promise();
        return {
          statusCode: 200,
          body: JSON.stringify({
            items: result.Items,
            lastEvaluatedKey: result.LastEvaluatedKey ? 
              JSON.stringify(result.LastEvaluatedKey) : undefined
          })
        };
      }
  
      // Scan all articles if no filters
      const params: DynamoDB.DocumentClient.ScanInput = {
        TableName: ARTICLES_TABLE,
        Limit: queryLimit
      };
  
      if (lastEvaluatedKey) {
        params.ExclusiveStartKey = JSON.parse(lastEvaluatedKey);
      }
  
      const result = await dynamoDB.scan(params).promise();
      return {
        statusCode: 200,
        body: JSON.stringify({
          items: result.Items,
          lastEvaluatedKey: result.LastEvaluatedKey ? 
            JSON.stringify(result.LastEvaluatedKey) : undefined
        })
      };
    } catch (error) {
      return handleError(error);
    }
  };

export const update: ArticleHandler = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    const body = JSON.parse(event.body || '{}');

    if (!id) {
      throw new APIError(400, 'Article ID is required');
    }

    const updateExpr: string[] = [];
    const exprNames: { [key: string]: string } = {};
    const exprValues: { [key: string]: any } = {};

    Object.entries(body).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        updateExpr.push(`#${key} = :${key}`);
        exprNames[`#${key}`] = key;
        exprValues[`:${key}`] = value;
      }
    });

    updateExpr.push('#updatedAt = :updatedAt');
    exprNames['#updatedAt'] = 'updatedAt';
    exprValues[':updatedAt'] = new Date().toISOString();

    const params = {
      TableName: ARTICLES_TABLE,
      Key: { id },
      UpdateExpression: `SET ${updateExpr.join(', ')}`,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ReturnValues: 'ALL_NEW'
    };

    const result = await dynamoDB.update(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify(result.Attributes)
    };
  } catch (error) {
    return handleError(error);
  }
};

export const deleteArticle: ArticleHandler = async (event) => {
  try {
    const { id } = event.pathParameters || {};
    
    if (!id) {
      throw new APIError(400, 'Article ID is required');
    }

    await dynamoDB.delete({
      TableName: ARTICLES_TABLE,
      Key: { id },
      ConditionExpression: 'attribute_exists(id)'
    }).promise();

    return {
      statusCode: 204,
      body: ''
    };
  } catch (error) {
    return handleError(error);
  }
};