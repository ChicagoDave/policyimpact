import { dynamoDB, TableName, getTableName, DatabaseError } from './client';
import { DynamoDB } from 'aws-sdk';

export async function get<T>(
  table: TableName,
  key: Record<string, any>
): Promise<T | null> {
  try {
    const result = await dynamoDB.get({
      TableName: getTableName(table),
      Key: key,
    }).promise();

    return (result.Item as T) || null;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get item from ${table}: ${error.message}`,
      'GET'
    );
  }
}

export async function put<T extends Record<string, any>>(
  table: TableName,
  item: T
): Promise<T> {
  try {
    await dynamoDB.put({
      TableName: getTableName(table),
      Item: item,
    }).promise();

    return item;
  } catch (error) {
    throw new DatabaseError(
      `Failed to put item in ${table}: ${error.message}`,
      'PUT'
    );
  }
}

export async function query<T>(
  table: TableName,
  keyConditionExpression: string,
  expressionAttributeValues: Record<string, any>,
  indexName?: string
): Promise<T[]> {
  try {
    const params: DynamoDB.DocumentClient.QueryInput = {
      TableName: getTableName(table),
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    };

    if (indexName) {
      params.IndexName = indexName;
    }

    const result = await dynamoDB.query(params).promise();
    return (result.Items as T[]) || [];
  } catch (error) {
    throw new DatabaseError(
      `Failed to query ${table}: ${error.message}`,
      'QUERY'
    );
  }
}

export async function update<T>(
  table: TableName,
  key: Record<string, any>,
  updateExpression: string,
  expressionAttributeValues: Record<string, any>,
  expressionAttributeNames?: Record<string, string>,
  conditionExpression?: string
): Promise<T> {
  try {
    const params: DynamoDB.DocumentClient.UpdateInput = {
      TableName: getTableName(table),
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    };

    if (expressionAttributeNames) {
      params.ExpressionAttributeNames = expressionAttributeNames;
    }

    if (conditionExpression) {
      params.ConditionExpression = conditionExpression;
    }

    const result = await dynamoDB.update(params).promise();
    return result.Attributes as T;
  } catch (error) {
    throw new DatabaseError(
      `Failed to update item in ${table}: ${error.message}`,
      'UPDATE'
    );
  }
}

export async function remove(
  table: TableName,
  key: Record<string, any>,
  conditionExpression?: string
): Promise<void> {
  try {
    const params: DynamoDB.DocumentClient.DeleteInput = {
      TableName: getTableName(table),
      Key: key,
    };

    if (conditionExpression) {
      params.ConditionExpression = conditionExpression;
    }

    await dynamoDB.delete(params).promise();
  } catch (error) {
    throw new DatabaseError(
      `Failed to delete item from ${table}: ${error.message}`,
      'DELETE'
    );
  }
}

export async function batchGet<T>(
  table: TableName,
  keys: Record<string, any>[]
): Promise<T[]> {
  try {
    const params: DynamoDB.DocumentClient.BatchGetItemInput = {
      RequestItems: {
        [getTableName(table)]: {
          Keys: keys
        }
      }
    };

    const result = await dynamoDB.batchGet(params).promise();
    return (result.Responses?.[getTableName(table)] as T[]) || [];
  } catch (error) {
    throw new DatabaseError(
      `Failed to batch get items from ${table}: ${error.message}`,
      'BATCH_GET'
    );
  }
}