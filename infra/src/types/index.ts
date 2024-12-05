// infra/src/types/index.ts
export * from './api';
export * from './events';
export * from './models';

// Re-export commonly used types from AWS Lambda
export type {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler
} from 'aws-lambda';