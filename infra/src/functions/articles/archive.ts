import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  Article,
  get,
  update,
  verifyToken,
  requireRole,
  NotificationEvent
} from '../../lib';
import { 
  PublishCommand, 
  SNSClient 
} from '@aws-sdk/client-sns';

const sns = new SNSClient({});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify authentication and role
    const token = await verifyToken(event);
    requireRole(token, 'EDITOR');

    const articleId = event.pathParameters?.id;
    if (!articleId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Article ID is required' })
      };
    }

    // Get existing article
    const article = await get<Article>('ArticlesTable', { id: articleId });
    if (!article) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Article not found' })
      };
    }

    // Check if article is already archived
    if (article.status === 'ARCHIVED') {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Article is already archived' })
      };
    }

    const now = new Date().toISOString();

    // Update article status to archived
    const updatedArticle = await update<Article>(
      'ArticlesTable',
      { id: articleId },
      'SET #status = :status, updatedAt = :updatedAt',
      {
        ':status': 'ARCHIVED',
        ':updatedAt': now
      },
      {
        '#status': 'status'
      }
    );

    // Notify authors
    const notificationEvent: NotificationEvent = {
      type: 'EMAIL',
      recipient: {
        userId: article.authorIds[0], // Primary author
        email: token.email // We should look up the author's email
      },
      template: 'ARTICLE_ARCHIVED',
      data: {
        articleId: article.id,
        articleTitle: article.title,
        archivedBy: token.sub,
        archivedAt: now
      }
    };

    await sns.send(new PublishCommand({
      TopicArn: process.env.NOTIFICATIONS_TOPIC_ARN,
      Message: JSON.stringify(notificationEvent),
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: 'ARTICLE_ARCHIVED'
        }
      }
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(updatedArticle)
    };

  } catch (error) {
    console.error('Error archiving article:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};