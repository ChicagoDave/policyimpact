// infra/src/functions/workflow/submit.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  Article,
  SubmitArticleRequest,
  WorkflowEvent,
  NotificationEvent,
  get,
  update,
  verifyToken,
  validateString
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
    const token = await verifyToken(event);

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Request body is required' })
      };
    }

    const request: SubmitArticleRequest = JSON.parse(event.body);

    // Get article
    const article = await get<Article>('ArticlesTable', { id: request.articleId });
    if (!article) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Article not found' })
      };
    }

    // Validate user is an author
    if (!article.authorIds.includes(token.sub)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'Only authors can submit articles' })
      };
    }

    // Validate article is in draft state
    if (article.status !== 'DRAFT') {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: `Cannot submit article in ${article.status} status` 
        })
      };
    }

    // Validate submission notes if provided
    if (request.notes) {
      validateString(request.notes, 'notes', 1, 1000);
    }

    const now = new Date().toISOString();

    // Update article status
    const updatedArticle = await update<Article>(
      'ArticlesTable',
      { id: article.id },
      'SET #status = :status, updatedAt = :updatedAt, submissionNotes = :notes',
      {
        ':status': 'RESEARCH_REQUIRED',
        ':updatedAt': now,
        ':notes': request.notes || null
      },
      {
        '#status': 'status'
      }
    );

    // Create workflow event
    const workflowEvent: WorkflowEvent = {
      eventType: 'ARTICLE_SUBMITTED',
      articleId: article.id,
      userId: token.sub,
      timestamp: now,
      data: {
        previousStatus: 'DRAFT',
        newStatus: 'RESEARCH_REQUIRED',
        notes: request.notes
      }
    };

    // Create notification event
    const notificationEvent: NotificationEvent = {
      type: 'EMAIL',
      recipient: {
        userId: article.authorIds[0],
        email: token.email
      },
      template: 'ARTICLE_SUBMITTED',
      data: {
        articleId: article.id,
        articleTitle: article.title,
        submittedBy: token.sub,
        submittedAt: now
      }
    };

    // Publish events
    await Promise.all([
      sns.send(new PublishCommand({
        TopicArn: process.env.WORKFLOW_TOPIC_ARN,
        Message: JSON.stringify(workflowEvent),
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: workflowEvent.eventType
          }
        }
      })),
      sns.send(new PublishCommand({
        TopicArn: process.env.NOTIFICATIONS_TOPIC_ARN,
        Message: JSON.stringify(notificationEvent)
      }))
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify(updatedArticle)
    };

  } catch (error) {
    console.error('Error submitting article:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};