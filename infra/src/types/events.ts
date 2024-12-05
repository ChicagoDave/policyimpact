// infra/src/types/events.ts
import { ArticleId, UserId, ArticleStatus } from './models';

export type WorkflowEventType = 
  | 'ARTICLE_SUBMITTED'
  | 'RESEARCH_STARTED'
  | 'RESEARCH_COMPLETED'
  | 'REVIEW_STARTED'
  | 'REVISION_REQUESTED'
  | 'ARTICLE_APPROVED'
  | 'ARTICLE_PUBLISHED';

export interface WorkflowEvent {
  eventType: WorkflowEventType;
  articleId: ArticleId;
  userId: UserId;
  timestamp: string;
  data: {
    previousStatus: ArticleStatus;
    newStatus: ArticleStatus;
    notes?: string;
  };
}

export interface NotificationEvent {
  type: 'EMAIL' | 'SMS';
  recipient: {
    userId: UserId;
    email?: string;
    phone?: string;
  };
  template: string;
  data: Record<string, any>;
}