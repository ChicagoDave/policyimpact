import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface StorageStackProps extends cdk.StackProps {
  env: {
    account: string;
    region: string;
  };
}

export class StorageStack extends cdk.Stack {
  public readonly tables: {
    articles: dynamodb.Table;
    users: dynamodb.Table;
    credentials: dynamodb.Table;
    references: dynamodb.Table;
    workflow: dynamodb.Table;
  };

  public readonly mediaBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    // Create S3 bucket for media storage (images, PDFs, etc.)
    this.mediaBucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: `media.policyimpact.us`,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(90),
            },
          ],
        },
      ],
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
          ],
          allowedOrigins: [
            'https://policyimpact.us',
            'https://www.policyimpact.us',
            'http://localhost:3000',
          ],
          allowedHeaders: ['*'],
          exposedHeaders: [
            'ETag',
            'x-amz-server-side-encryption',
            'x-amz-request-id',
            'x-amz-id-2',
          ],
          maxAge: 3000,
        },
      ],
    });

    // Create DynamoDB Tables
    // Users Table
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: 'policy-impact-users',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // Add GSIs for users table
    usersTable.addGlobalSecondaryIndex({
      indexName: 'byEmail',
      partitionKey: { name: 'email', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    usersTable.addGlobalSecondaryIndex({
      indexName: 'byRole',
      partitionKey: { name: 'role', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lastName', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Articles Table
    const articlesTable = new dynamodb.Table(this, 'ArticlesTable', {
      tableName: 'policy-impact-articles',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // Add GSIs for articles table
    articlesTable.addGlobalSecondaryIndex({
      indexName: 'byStatus',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    articlesTable.addGlobalSecondaryIndex({
      indexName: 'byAuthor',
      partitionKey: { name: 'authorId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    articlesTable.addGlobalSecondaryIndex({
      indexName: 'byTag',
      partitionKey: { name: 'tag', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Credentials Table
    const credentialsTable = new dynamodb.Table(this, 'CredentialsTable', {
      tableName: 'policy-impact-credentials',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    credentialsTable.addGlobalSecondaryIndex({
      indexName: 'byInstitution',
      partitionKey: { name: 'institution', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'yearObtained', type: dynamodb.AttributeType.NUMBER },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // References Table
    const referencesTable = new dynamodb.Table(this, 'ReferencesTable', {
      tableName: 'policy-impact-references',
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    referencesTable.addGlobalSecondaryIndex({
      indexName: 'byType',
      partitionKey: { name: 'type', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'publishedDate', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Workflow Table for tracking article review/research status
    const workflowTable = new dynamodb.Table(this, 'WorkflowTable', {
      tableName: 'policy-impact-workflow',
      partitionKey: { name: 'articleId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
      timeToLiveAttribute: 'ttl',
    });

    workflowTable.addGlobalSecondaryIndex({
      indexName: 'byAssignee',
      partitionKey: { name: 'assigneeId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // Store table references
    this.tables = {
      articles: articlesTable,
      users: usersTable,
      credentials: credentialsTable,
      references: referencesTable,
      workflow: workflowTable,
    };

    // Output the table names and ARNs
    Object.entries(this.tables).forEach(([name, table]) => {
      new cdk.CfnOutput(this, `${name}TableName`, {
        value: table.tableName,
        description: `${name} Table Name`,
      });

      new cdk.CfnOutput(this, `${name}TableArn`, {
        value: table.tableArn,
        description: `${name} Table ARN`,
      });
    });

    new cdk.CfnOutput(this, 'MediaBucketName', {
      value: this.mediaBucket.bucketName,
      description: 'Media Bucket Name',
    });
  }

  // Helper method to add backup configurations
  private addBackupConfig(table: dynamodb.Table) {
    new dynamodb.CfnTable.PointInTimeRecoverySpecificationProperty({
      pointInTimeRecoveryEnabled: true,
    });
  }

  // Helper method to add auto-scaling
  private addAutoScaling(table: dynamodb.Table, maxCapacity: number = 10) {
    const readScaling = table.autoScaleReadCapacity({
      minCapacity: 1,
      maxCapacity: maxCapacity,
    });

    readScaling.scaleOnUtilization({
      targetUtilizationPercent: 75,
    });

    const writeScaling = table.autoScaleWriteCapacity({
      minCapacity: 1,
      maxCapacity: maxCapacity,
    });

    writeScaling.scaleOnUtilization({
      targetUtilizationPercent: 75,
    });
  }
}