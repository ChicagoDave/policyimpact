// infra/src/types/index.ts
export * from './models';
export * from './api';
export * from './events';

// Re-export commonly used types from AWS Lambda
export type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler
} from 'aws-lambda';