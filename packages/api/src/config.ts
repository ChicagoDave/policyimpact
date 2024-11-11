export const environment = {
    ARTICLES_TABLE: process.env.ARTICLES_TABLE_NAME || 'ArticlesTable',
    REVIEWS_TABLE: process.env.REVIEWS_TABLE_NAME || 'ReviewsTable',
    REGION: process.env.AWS_REGION || 'us-east-1',
  };