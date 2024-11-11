// packages/api/src/handlers/types.ts
import { APIGatewayProxyHandler } from 'aws-lambda';

export type ArticleHandler = APIGatewayProxyHandler;

// Review related types
export interface ReviewHandlers {
  submitReview: ArticleHandler;
  getReviews: ArticleHandler;
}

// Workflow related types
export interface WorkflowHandlers {
  submitForReview: ArticleHandler;
  publish: ArticleHandler;
}

// Source related types
export interface SourceHandlers {
  validateSource: ArticleHandler;
}

export interface QueryParams {
  status?: string;
  keyword?: string;
  lastEvaluatedKey?: string;
  limit?: string;
}