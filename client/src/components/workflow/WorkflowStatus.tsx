import React from 'react';
import { Check, Clock, Edit, Files, Loader2, Search } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ArticleStatus = 
  | 'DRAFT'
  | 'RESEARCH_REQUIRED'
  | 'RESEARCH_IN_PROGRESS'
  | 'REVIEW_REQUIRED'
  | 'REVIEW_IN_PROGRESS'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'PUBLISHED';

interface StatusConfig {
  icon: LucideIcon;
  color: string;
  label: string;
  description: string;
}

interface WorkflowStatusProps {
  status: ArticleStatus;
  updatedAt?: string;
}

const statusConfigs: Record<ArticleStatus, StatusConfig> = {
  DRAFT: {
    icon: Edit,
    color: 'text-gray-500',
    label: 'Draft',
    description: 'Article is being drafted'
  },
  RESEARCH_REQUIRED: {
    icon: Search,
    color: 'text-blue-500',
    label: 'Research Required',
    description: 'Waiting for researcher assignment'
  },
  RESEARCH_IN_PROGRESS: {
    icon: Loader2,
    color: 'text-yellow-500',
    label: 'Research In Progress',
    description: 'Researcher is gathering references'
  },
  REVIEW_REQUIRED: {
    icon: Files,
    color: 'text-purple-500',
    label: 'Review Required',
    description: 'Waiting for reviewer assignment'
  },
  REVIEW_IN_PROGRESS: {
    icon: Clock,
    color: 'text-orange-500',
    label: 'Under Review',
    description: 'Reviewer is evaluating content'
  },
  REVISION_REQUIRED: {
    icon: Edit,
    color: 'text-red-500',
    label: 'Revision Required',
    description: 'Updates needed based on review'
  },
  APPROVED: {
    icon: Check,
    color: 'text-green-500',
    label: 'Approved',
    description: 'Ready for publication'
  },
  PUBLISHED: {
    icon: Check,
    color: 'text-emerald-500',
    label: 'Published',
    description: 'Live on the platform'
  }
};

const WorkflowStatus = ({ status, updatedAt }: WorkflowStatusProps) => {
  const config = statusConfigs[status] || statusConfigs.DRAFT;
  const Icon = config.icon;

  return (
    <div className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
      <div className={`p-2 rounded-full bg-opacity-10 ${config.color.replace('text', 'bg')}`}>
        <Icon className={`w-6 h-6 ${config.color}`} />
      </div>
      <div>
        <h4 className="font-medium">{config.label}</h4>
        <p className="text-sm text-gray-500">{config.description}</p>
        {updatedAt && (
          <p className="text-xs text-gray-400 mt-1">
            Updated {new Date(updatedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
};

export default WorkflowStatus;