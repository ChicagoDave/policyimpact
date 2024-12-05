# Policy Impact Platform

A comprehensive platform for publishing policy articles with rigorous research verification and editorial review processes.

## Overview

Policy Impact is a platform that enables authors to publish well-researched policy articles. Each article goes through a structured workflow involving research verification and editorial review before publication.

### Key Features

- Article submission and management
- Research verification with reference tracking
- Editorial review process
- User credential management
- Email notifications for workflow events
- Protected content based on user roles

## Architecture

### Frontend
- Next.js React application with TypeScript
- ShadCN UI components
- Protected routes with authentication
- Responsive design
- Role-based access control

### Backend
- AWS Lambda functions for API endpoints
- Amazon DynamoDB for data storage
- Amazon Cognito for authentication
- Amazon SES for email notifications
- Amazon SNS for workflow events
- Amazon CloudFront for content delivery

## Project Structure

```
/
├── client/                 # Frontend application
│   ├── src/
│   │   ├── app/           # Next.js pages
│   │   ├── components/    # React components
│   │   ├── hooks/        # Custom React hooks
│   │   └── lib/          # Utility functions
│   
├── infra/                 # Infrastructure code
│   ├── src/
│   │   ├── cdk/          # AWS CDK stacks
│   │   ├── functions/    # Lambda functions
│   │   └── lib/          # Shared utilities
│   
└── shared/               # Shared types and utilities
    └── src/
        └── types/        # TypeScript interfaces
```

## Prerequisites

- Node.js 18+
- AWS CLI configured with appropriate credentials
- AWS CDK CLI
- TypeScript 5+

## Development Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/policy-impact.git
cd policy-impact
```

2. Install dependencies:
```bash
# Install client dependencies
cd client
npm install

# Install infrastructure dependencies
cd ../infra
npm install

# Install shared dependencies
cd ../shared
npm install
```

3. Configure environment variables:

Create `.env.local` in the client directory:
```
NEXT_PUBLIC_API_URL=https://api.policyimpact.us
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your-user-pool-id
NEXT_PUBLIC_COGNITO_CLIENT_ID=your-client-id
```

4. Start development server:
```bash
# In client directory
npm run dev
```

## Deployment

### Frontend Deployment

1. Build the Next.js application:
```bash
cd client
npm run build
```

2. Deploy infrastructure:
```bash
cd ../infra
npm run deploy
```

This will deploy:
- CloudFront distribution
- S3 bucket for hosting
- Route53 DNS records
- SSL certificates

### Backend Deployment

1. Bootstrap CDK (first time only):
```bash
cd infra
npm run cdk bootstrap
```

2. Deploy all stacks:
```bash
npm run deploy
```

This deploys:
- Lambda functions
- DynamoDB tables
- Cognito user pool
- API Gateway
- Required IAM roles

## User Roles

- **Authors**: Can create and submit articles
- **Researchers**: Verify articles with references
- **Reviewers**: Review articles for accuracy
- **Editors**: Approve and publish articles

## Workflow

1. Author submits article
2. Article assigned to researcher
3. Researcher verifies with references
4. Article moves to review queue
5. Reviewer assesses article
6. Editor approves for publication
7. Article published

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Create a Pull Request

## License

Copyright 2024 David Cornelson (for now)
