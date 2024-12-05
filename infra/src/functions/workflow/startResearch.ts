// infra/src/functions/workflow/startResearch.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { 
  Article,
  WorkflowEvent,
  NotificationEvent,
  get,
  update,
  verifyToken,
  requireRole
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
    requireRole(token, 'RESEARCHER');

    const articleId = event.pathParameters?.id;
    if (!articleId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Article ID is required' })
      };
    }

    // Get article
    const article = await get<Article>('ArticlesTable', { id: articleId });
    if (!article) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Article not found' })
      };
    }

    // Validate article status
    if (article.status !== 'RESEARCH_REQUIRED') {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: `Cannot start research for article in ${article.status} status` 
        })
      };
    }

    const now = new Date().toISOString();

    // Update article status
    const updatedArticle = await update<Article>(
      'ArticlesTable',
      { id: article.id },
      'SET #status = :status, updatedAt = :updatedAt, currentResearcherId = :researcherId',
      {
        ':status': 'RESEARCH_IN_PROGRESS',
        ':updatedAt': now,
        ':researcherId': token.sub
      },
      {
        '#status': 'status'
      }
    );

    // Create and publish events
    await publishWorkflowEvents(article, token.sub, 'RESEARCH_STARTED', now);

    return {
      statusCode: 200,
      body: JSON.stringify(updatedArticle)
    };
  } catch (error) {
    console.error('Error starting research:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};

// infra/src/functions/workflow/completeResearch.ts
import { ResearchRequest } from '../../lib';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const token = await verifyToken(event);
    requireRole(token, 'RESEARCHER');

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Request body is required' })
      };
    }

    const request: ResearchRequest = JSON.parse(event.body);

    // Get article
    const article = await get<Article>('ArticlesTable', { id: request.articleId });
    if (!article) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Article not found' })
      };
    }

    // Validate article state and researcher
    if (article.status !== 'RESEARCH_IN_PROGRESS') {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: `Cannot complete research for article in ${article.status} status` 
        })
      };
    }

    if (article.currentResearcherId !== token.sub) {
      return {
        statusCode: 403,
        body: JSON.stringify({ 
          message: 'Only the assigned researcher can complete research' 
        })
      };
    }

    // Validate minimum references requirement
    if (request.referenceIds.length < 2) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: 'Articles must have at least two references' 
        })
      };
    }

    const now = new Date().toISOString();

    // Update article
    const updatedArticle = await update<Article>(
      'ArticlesTable',
      { id: article.id },
      `SET #status = :status, 
          updatedAt = :updatedAt, 
          referenceIds = :referenceIds, 
          researchNotes = :notes,
          researchCompletedAt = :completedAt`,
      {
        ':status': 'REVIEW_REQUIRED',
        ':updatedAt': now,
        ':referenceIds': request.referenceIds,
        ':notes': request.researchNotes,
        ':completedAt': now
      },
      {
        '#status': 'status'
      }
    );

    // Create and publish events
    await publishWorkflowEvents(article, token.sub, 'RESEARCH_COMPLETED', now);

    return {
      statusCode: 200,
      body: JSON.stringify(updatedArticle)
    };
  } catch (error) {
    console.error('Error completing research:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};

// Helper function for publishing workflow events
async function publishWorkflowEvents(
  article: Article, 
  userId: string, 
  eventType: WorkflowEvent['eventType'],
  timestamp: string
) {
  const workflowEvent: WorkflowEvent = {
    eventType,
    articleId: article.id,
    userId,
    timestamp,
    data: {
      previousStatus: article.status,
      newStatus: eventType === 'RESEARCH_STARTED' ? 
        'RESEARCH_IN_PROGRESS' : 'REVIEW_REQUIRED'
    }
  };

  const notificationEvent: NotificationEvent = {
    type: 'EMAIL',
    recipient: {
      userId: article.authorIds[0]
    },
    template: eventType === 'RESEARCH_STARTED' ? 
      'RESEARCH_STARTED' : 'RESEARCH_COMPLETED',
    data: {
      articleId: article.id,
      articleTitle: article.title,
      researcherId: userId,
      timestamp
    }
  };

  await Promise.all([
    sns.send(new PublishCommand({
      TopicArn: process.env.WORKFLOW_TOPIC_ARN,
      Message: JSON.stringify(workflowEvent)
    })),
    sns.send(new PublishCommand({
      TopicArn: process.env.NOTIFICATIONS_TOPIC_ARN,
      Message: JSON.stringify(notificationEvent)
    }))
  ]);
}