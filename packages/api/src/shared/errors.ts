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
  
    if (error instanceof Error) {
      // Handle DynamoDB condition check failures and other AWS errors
      if (error.name === 'ConditionalCheckFailedException') {
        return {
          statusCode: 409,
          body: JSON.stringify({ message: 'Resource conflict' })
        };
      }
    }
  
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  };