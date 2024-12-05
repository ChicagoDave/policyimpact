// client/src/components/articles/ArticleStatus.tsx
import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { 
  FileEdit, 
  Search, 
  ClipboardCheck, 
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Globe
} from 'lucide-react';

type ArticleStatus =
  | 'DRAFT'
  | 'RESEARCH_REQUIRED'
  | 'RESEARCH_IN_PROGRESS'
  | 'REVIEW_REQUIRED'
  | 'REVIEW_IN_PROGRESS'
  | 'REVISION_REQUIRED'
  | 'APPROVED'
  | 'PUBLISHED';

interface ArticleStatusProps {
  status: ArticleStatus;
  researchCompletedAt?: string;
  reviewCompletedAt?: string;
  publishedAt?: string;
  className?: string;
}

const statusConfig = {
  DRAFT: {
    label: 'Draft',
    color: 'bg-gray-500',
    icon: FileEdit,
    step: 0
  },
  RESEARCH_REQUIRED: {
    label: 'Research Required',
    color: 'bg-blue-500',
    icon: Search,
    step: 1
  },
  RESEARCH_IN_PROGRESS: {
    label: 'Research in Progress',
    color: 'bg-blue-400',
    icon: Search,
    step: 1
  },
  REVIEW_REQUIRED: {
    label: 'Review Required',
    color: 'bg-purple-500',
    icon: ClipboardCheck,
    step: 2
  },
  REVIEW_IN_PROGRESS: {
    label: 'Review in Progress',
    color: 'bg-purple-400',
    icon: BookOpen,
    step: 2
  },
  REVISION_REQUIRED: {
    label: 'Revision Required',
    color: 'bg-orange-500',
    icon: AlertCircle,
    step: 1
  },
  APPROVED: {
    label: 'Approved',
    color: 'bg-green-500',
    icon: CheckCircle2,
    step: 3
  },
  PUBLISHED: {
    label: 'Published',
    color: 'bg-emerald-500',
    icon: Globe,
    step: 4
  }
};

const ArticleStatus = ({
  status,
  researchCompletedAt,
  reviewCompletedAt,
  publishedAt,
  className
}: ArticleStatusProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  const currentStep = config.step;

  const steps = [
    { label: 'Draft', step: 0 },
    { label: 'Research', step: 1 },
    { label: 'Review', step: 2 },
    { label: 'Approved', step: 3 },
    { label: 'Published', step: 4 }
  ];

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Icon className="w-5 h-5" />
          <Badge className={cn("text-white", config.color)}>
            {config.label}
          </Badge>
        </div>

        <div className="relative">
          {/* Progress Bar */}
          <div className="absolute top-4 left-0 w-full h-1 bg-gray-200 rounded">
            <div 
              className="absolute h-full bg-blue-500 rounded transition-all duration-500"
              style={{ 
                width: `${(currentStep / (steps.length - 1)) * 100}%` 
              }}
            />
          </div>

          {/* Steps */}
          <div className="relative flex justify-between">
            {steps.map((step, index) => {
              const isCompleted = currentStep > step.step;
              const isCurrent = currentStep === step.step;
              
              return (
                <div 
                  key={step.label} 
                  className="flex flex-col items-center"
                >
                  <div 
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center mb-2",
                      isCompleted || isCurrent 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-200 text-gray-400"
                    )}
                  >
                    {index + 1}
                  </div>
                  <span className="text-sm font-medium">{step.label}</span>
                  {(step.label === 'Research' && researchCompletedAt) && (
                    <span className="text-xs text-gray-500 mt-1">
                      {new Date(researchCompletedAt).toLocaleDateString()}
                    </span>
                  )}
                  {(step.label === 'Review' && reviewCompletedAt) && (
                    <span className="text-xs text-gray-500 mt-1">
                      {new Date(reviewCompletedAt).toLocaleDateString()}
                    </span>
                  )}
                  {(step.label === 'Published' && publishedAt) && (
                    <span className="text-xs text-gray-500 mt-1">
                      {new Date(publishedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ArticleStatus;