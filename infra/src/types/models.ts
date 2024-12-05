// infra/src/types/models.ts
export type UserId = string;
export type ArticleId = string;
export type CredentialId = string;
export type ReferenceId = string;

export type UserRole = 'AUTHOR' | 'REVIEWER' | 'EDITOR' | 'RESEARCHER';

export interface BaseModel {
  id: string;
  createdAt: string;
  updatedAt: string;
}

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