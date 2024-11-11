import { APIGatewayProxyHandler } from 'aws-lambda';

export type ArticleHandler = APIGatewayProxyHandler;

export interface ArticleHandlers {
  create: ArticleHandler;
  get: ArticleHandler;
  list: ArticleHandler;
  update: ArticleHandler;
  delete: ArticleHandler;
  submitForReview: ArticleHandler;
  submitReview: ArticleHandler;
  getReviews: ArticleHandler;
  validateSource: ArticleHandler;
  publish: ArticleHandler;
}

export interface QueryParams {
  status?: string;
  keyword?: string;
  lastEvaluatedKey?: string;
  limit?: string;
}