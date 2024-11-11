// types.ts - Adding only what's missing from current requirements

export interface Article {
  id: string;
  title: string;
  subtitle?: string;
  authors: string[];
  editors: string[];
  researchers: string[];
  body: string;
  tags: string[];
  decisionKeyword: string;
  status: 'draft' | 'in_review' | 'approved' | 'published';
  sources: Source[];
  images?: ArticleImage[];  // Adding support for embedded images
  createdAt: string;
  updatedAt: string;
}

export interface Source {
  id: string;
  url: string;
  title: string;
  type: 'primary' | 'secondary' | 'reference';
  status: 'pending' | 'validated' | 'rejected';
  validatedBy?: string;
  validatedAt?: string;
  validationNotes?: string;
}

export interface ArticleImage {
  url: string;
  alt: string;
  alignment: 'left' | 'center' | 'right';
  wrap: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'author' | 'editor' | 'proofreader' | 'researcher';
}

// Adding review tracking
export interface ReviewRecord {
  articleId: string;
  reviewerId: string;
  role: User['role'];
  decision: 'approved' | 'rejected';
  comments: string;
  timestamp: string;
}