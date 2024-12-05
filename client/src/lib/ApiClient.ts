// src/lib/ApiClient.ts
const API_BASE_URL = 'https://api.policyimpact.us';

// Types
export interface ApiResponse<T = any> {
  data: T;
  error?: string;
}

export interface RequestOptions {
  method?: string;
  body?: any;
  requiresAuth?: boolean;
  queryParams?: Record<string, string | number | undefined>;
}

export interface Article {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  status: ArticleStatus;
  authorIds: string[];
  referenceIds: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  currentResearcherId?: string;
  currentReviewerId?: string;
  approvedBy?: string;
  approvedAt?: string;
  publishedAt?: string;
}

export type ArticleStatus = 
  | 'DRAFT'
  | 'RESEARCH_REQUIRED'
  | 'RESEARCH_IN_PROGRESS'
  | 'REVIEW_REQUIRED'
  | 'REVIEW_IN_PROGRESS'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'PUBLISHED';

export interface Reference {
  id: string;
  title: string;
  url: string;
  authors: string[];
  publishedDate?: string;
  publisher?: string;
  description: string;
  type: 'ACADEMIC' | 'GOVERNMENT' | 'NEWS' | 'OTHER';
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  biography: string;
  roles: UserRole[];
  credentialIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'AUTHOR' | 'REVIEWER' | 'EDITOR' | 'RESEARCHER';

export interface Credential {
  id: string;
  title: string;
  institution: string;
  yearObtained: number;
  field: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// Main API Client
const ApiClient = {
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      body,
      queryParams,
      requiresAuth = true
    } = options;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (requiresAuth) {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new ApiError(401, 'No authentication token found');
        }
        headers.Authorization = `Bearer ${token}`;
      }

      // Construct URL with query parameters if they exist
      let url = `${API_BASE_URL}${endpoint}`;
      if (queryParams) {
        const params = new URLSearchParams();
        Object.entries(queryParams).forEach(([key, value]) => {
          if (value !== undefined) {
            params.append(key, value.toString());
          }
        });
        if (params.toString()) {
          url += `?${params.toString()}`;
        }
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new ApiError(response.status, errorData.message || 'An error occurred');
      }

      const data = await response.json();
      return { data };

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      if (error instanceof Error) {
        throw new ApiError(500, error.message);
      }
      
      throw new ApiError(500, 'An unexpected error occurred');
    }
  },

  // Articles
  articles: {
    list: (params?: { status?: string; authorId?: string; tag?: string }) => 
      ApiClient.request<Article[]>('/articles', {
        queryParams: params
      }),
    
    get: (id: string) => 
      ApiClient.request<Article>(`/articles/${id}`),
    
    create: (data: Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => 
      ApiClient.request<Article>('/articles', {
        method: 'POST',
        body: data
      }),
    
    update: (id: string, data: Partial<Omit<Article, 'id' | 'createdAt' | 'updatedAt' | 'status'>>) => 
      ApiClient.request<Article>(`/articles/${id}`, {
        method: 'PUT',
        body: data
      }),

    submit: (id: string, notes?: string) => 
      ApiClient.request<Article>(`/articles/${id}/submit`, {
        method: 'POST',
        body: { notes }
      }),
  },

  // Research
  research: {
    start: (articleId: string) => 
      ApiClient.request<Article>(`/articles/${articleId}/research/start`, {
        method: 'POST'
      }),

    complete: (articleId: string, data: { referenceIds: string[], researchNotes: string }) => 
      ApiClient.request<Article>(`/articles/${articleId}/research/complete`, {
        method: 'POST',
        body: data
      }),
  },

  // Reviews
  reviews: {
    start: (articleId: string) => 
      ApiClient.request<Article>(`/articles/${articleId}/review/start`, {
        method: 'POST'
      }),

    submit: (articleId: string, data: { 
      decision: 'APPROVE' | 'REVISE' | 'REJECT',
      reviewNotes: string 
    }) => 
      ApiClient.request<Article>(`/articles/${articleId}/review/submit`, {
        method: 'POST',
        body: data
      }),
  },

  // References
  references: {
    list: () => ApiClient.request<Reference[]>('/references'),
    
    get: (id: string) => ApiClient.request<Reference>(`/references/${id}`),
    
    create: (data: Omit<Reference, 'id' | 'createdAt' | 'updatedAt' | 'verifiedBy' | 'verifiedAt'>) => 
      ApiClient.request<Reference>('/references', {
        method: 'POST',
        body: data
      }),

    verify: (id: string) => 
      ApiClient.request<Reference>(`/references/${id}/verify`, {
        method: 'POST'
      }),
  },

  // User Profiles
  profiles: {
    get: (userId: string) => ApiClient.request<UserProfile>(`/profiles/${userId}`),
    
    update: (userId: string, data: Partial<Omit<UserProfile, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>) => 
      ApiClient.request<UserProfile>(`/profiles/${userId}`, {
        method: 'PUT',
        body: data
      }),
  },

  // Credentials
  credentials: {
    list: (userId: string) => 
      ApiClient.request<Credential[]>(`/users/${userId}/credentials`),
    
    create: (data: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>) => 
      ApiClient.request<Credential>('/credentials', {
        method: 'POST',
        body: data
      }),

    verify: (id: string) => 
      ApiClient.request<Credential>(`/credentials/${id}/verify`, {
        method: 'POST'
      }),
  },
};

export default ApiClient;