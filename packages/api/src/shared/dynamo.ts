import { DynamoDB } from 'aws-sdk';

export const dynamoDB = new DynamoDB.DocumentClient();
export const ARTICLES_TABLE = process.env.ARTICLES_TABLE!;
export const REVIEW_TABLE = process.env.REVIEW_TABLE!;

// packages/api/src/shared/errors.ts
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export const handleError = (error: unknown) => {
  console.error('Error:', error);
  
  if (error instanceof APIError) {
    return {
      statusCode: error.statusCode,
      body: JSON.stringify({ message: error.message })
    };
  }

  return {
    statusCode: 500,
    body: JSON.stringify({ message: 'Internal server error' })
  };
};