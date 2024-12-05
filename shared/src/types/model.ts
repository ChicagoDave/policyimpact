// shared/src/types/models.ts

// ID Types
export type UserId = string;
export type ArticleId = string;
export type CredentialId = string;
export type ReferenceId = string;
export type PolicyId = string;

// User Roles
export type UserRole = 'AUTHOR' | 'REVIEWER' | 'EDITOR' | 'RESEARCHER' | 'ADMIN';

// Base Model
export interface BaseModel {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// User & Credentials
export interface UserProfile extends BaseModel {
  userId: UserId;
  email: string;
  firstName: string;
  lastName: string;
  biography: string;
  roles: UserRole[];
  credentialIds: CredentialId[];
}

export interface Credential extends BaseModel {
  title: string;
  institution: string;
  yearObtained: number;
  field: string;
  description?: string;
  verifiedBy?: UserId;
  verifiedAt?: string;
}

// Policy Types
export type PolicyStatus = 
  | 'DRAFT'
  | 'ACTIVE' 
  | 'ARCHIVED';

export type PolicyType =
  | 'LEGISLATION'
  | 'REGULATION'
  | 'EXECUTIVE_ORDER'
  | 'COURT_RULING'
  | 'AGENCY_GUIDANCE';

export interface Policy extends BaseModel {
  title: string;
  description: string;
  type: PolicyType;
  status: PolicyStatus;
  effectiveDate?: string;
  jurisdiction: string;
  agency?: string;
  referenceIds: ReferenceId[];
  articleIds: ArticleId[];
  tags: string[];
  editorId: UserId;
  lastReviewedAt?: string;
  lastReviewedBy?: UserId;
}

// Article Types
export type ArticleStatus = 
  | 'DRAFT'
  | 'RESEARCH_REQUIRED'
  | 'RESEARCH_IN_PROGRESS'
  | 'REVIEW_REQUIRED'
  | 'REVIEW_IN_PROGRESS'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'ARCHIVED';

export type CoverageType = 
  | 'PRIMARY'   // Initial coverage of the policy
  | 'ANALYSIS'  // In-depth analysis
  | 'IMPACT_STUDY'; // Study of policy effects

export interface Article extends BaseModel {
  title: string;
  subtitle?: string;
  content: string;
  status: ArticleStatus;
  policyId: PolicyId;
  coverageType: CoverageType;
  authorIds: UserId[];
  referenceIds: ReferenceId[];
  tags: string[];
  researchNotes?: string;
  reviewNotes?: string;
  currentResearcherId?: UserId;
  currentReviewerId?: UserId;
  approvedBy?: UserId;
  approvedAt?: string;
  publishedAt?: string;
}

// Reference Types
export interface Reference extends BaseModel {
  title: string;
  url: string;
  authors: string[];
  publishedDate?: string;
  publisher?: string;
  description: string;
  type: 'ACADEMIC' | 'GOVERNMENT' | 'NEWS' | 'OTHER';
  verifiedBy?: UserId;
  verifiedAt?: string;
}

// Workflow Types
export type WorkflowEventType = 
  // Policy Events
  | 'POLICY_CREATED'
  | 'POLICY_UPDATED'
  | 'POLICY_ARCHIVED'
  | 'COVERAGE_PROPOSED'
  | 'COVERAGE_APPROVED'
  | 'COVERAGE_REJECTED'
  // Article Events
  | 'ARTICLE_SUBMITTED'
  | 'RESEARCH_STARTED'
  | 'RESEARCH_COMPLETED'
  | 'REVIEW_STARTED'
  | 'REVISION_REQUESTED'
  | 'ARTICLE_APPROVED'
  | 'ARTICLE_PUBLISHED';

export interface WorkflowEvent {
  eventType: WorkflowEventType;
  articleId?: ArticleId;
  policyId?: PolicyId;
  userId: UserId;
  timestamp: string;
  data: {
    previousStatus?: ArticleStatus | PolicyStatus;
    newStatus?: ArticleStatus | PolicyStatus;
    notes?: string;
  };
}

// Coverage Proposal
export interface CoverageProposal extends BaseModel {
  policyId: PolicyId;
  authorId: UserId;
  coverageType: CoverageType;
  outline: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewedBy?: UserId;
  reviewedAt?: string;
  reviewNotes?: string;
}