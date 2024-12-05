import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ApiStack } from '../lib/api-stack';
import { AuthStack } from '../lib/auth-stack';
import { FrontendStack } from '../lib/frontend-stack';
import { StorageStack } from '../lib/storage-stack';
import { MonitoringStack } from '../lib/monitoring-stack';

const app = new cdk.App();

// Get account and region with fallbacks
const account = process.env.CDK_DEFAULT_ACCOUNT || 
  (() => { throw new Error('CDK_DEFAULT_ACCOUNT is required'); })();

const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';

// Environment configuration
const env = { 
    account,
    region
};

// Base stack with shared resources
const storageStack = new StorageStack(app, 'PolicyImpactStorage', {
    env,
    stackName: 'policy-impact-storage'
});

const authStack = new AuthStack(app, 'PolicyImpactAuth', {
    env,
    stackName: 'policy-impact-auth'
});

const apiStack = new ApiStack(app, 'PolicyImpactApi', {
    env,
    stackName: 'policy-impact-api',
    userPool: authStack.userPool,
    tables: storageStack.tables
});

const frontendStack = new FrontendStack(app, 'PolicyImpactFrontend', {
    env,
    stackName: 'policy-impact-frontend',
    apiEndpoint: apiStack.apiEndpoint,
    userPool: authStack.userPool
});

new MonitoringStack(app, 'PolicyImpactMonitoring', {
    env,
    stackName: 'policy-impact-monitoring',
    api: apiStack.api,
    distribution: frontendStack.distribution
});

// Add tags to all stacks
const tags = {
    Environment: 'production',
    Project: 'PolicyImpact',
    ManagedBy: 'CDK'
};

cdk.Tags.of(app).add('Environment', tags.Environment);
cdk.Tags.of(app).add('Project', tags.Project);
cdk.Tags.of(app).add('ManagedBy', tags.ManagedBy);