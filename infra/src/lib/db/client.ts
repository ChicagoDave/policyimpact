// infra/src/lib/db/client.ts
import { DynamoDB } from 'aws-sdk';

export const dynamoDB = new DynamoDB.DocumentClient();

export type TableName = 
  | 'ArticlesTable'
  | 'AuthorsTable'
  | 'CredentialsTable'
  | 'ReferencesTable';

export const getTableName = (table: TableName): string => {
  return process.env[table] || table;
};

export class DatabaseError extends Error {
  constructor(message: string, public readonly operation: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}