// infra/src/types/api.ts
import { 
    Article, 
    UserProfile, 
    Reference, 
    Credential,
    ArticleStatus 
  } from './models';
  
  // Generic API Response type
  export interface ApiResponse<T> {
    statusCode: number;
    body: T;
  }
  
  export interface ErrorResponse {
    message: string;
    code: string;
    details?: any;
  }
  
  // Article API Types
  export interface CreateArticleRequest {
    title: string;
    subtitle?: string;
    content: string;
    authorIds: string[];
    tags: string[];
  }
  
  export interface UpdateArticleRequest {
    title?: string;
    subtitle?: string;
    content?: string;
    tags?: string[];
  }
  
  export interface ArticleResponse extends Article {
    authors: UserProfile[];
    references: Reference[];
  }
  
  // Workflow API Types
  export interface SubmitArticleRequest {
    articleId: string;
    notes?: string;
  }
  
  export interface ResearchRequest {
    articleId: string;
    researchNotes: string;
    referenceIds: string[];
  }
  
  export interface ReviewRequest {
    articleId: string;
    reviewNotes: string;
    decision: 'APPROVE' | 'REVISE' | 'REJECT';
  }
  
  // Reference API Types
  export interface CreateReferenceRequest {
    title: string;
    url: string;
    authors: string[];
    publishedDate?: string;
    publisher?: string;
    description: string;
    type: Reference['type'];
  }
  
  // Profile API Types
  export interface UpdateProfileRequest {
    firstName?: string;
    lastName?: string;
    biography?: string;
  }
  
  // Credential API Types
  export interface CreateCredentialRequest {
    title: string;
    institution: string;
    yearObtained: number;
    field: string;
    description?: string;
  }