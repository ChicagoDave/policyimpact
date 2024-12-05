// infra/src/cdk/lib/constructs/storage-construct.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface StorageConstructProps {
  stage: string;
  region: string;
  account: string;
}

export class StorageConstruct extends Construct {
  public readonly articlesTable: dynamodb.Table;
  public readonly authorsTable: dynamodb.Table;
  public readonly referencesTable: dynamodb.Table;
  public readonly credentialsTable: dynamodb.Table;
  public readonly articlesBucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageConstructProps) {
    super(scope, id);

    // Create DynamoDB tables
    this.articlesTable = new dynamodb.Table(this, 'ArticlesTable', {
      tableName: `policy-impact-articles-${props.stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'version', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
      timeToLiveAttribute: 'ttl',
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    // GSIs for articles
    this.articlesTable.addGlobalSecondaryIndex({
      indexName: 'byStatus',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
    });

    this.articlesTable.addGlobalSecondaryIndex({
      indexName: 'byAuthor',
      partitionKey: { name: 'authorId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'updatedAt', type: dynamodb.AttributeType.STRING },
    });

    this.authorsTable = new dynamodb.Table(this, 'AuthorsTable', {
      tableName: `policy-impact-authors-${props.stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    this.referencesTable = new dynamodb.Table(this, 'ReferencesTable', {
      tableName: `policy-impact-references-${props.stage}`,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'articleId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    this.credentialsTable = new dynamodb.Table(this, 'CredentialsTable', {
      tableName: `policy-impact-credentials-${props.stage}`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'type', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecovery: true,
    });

    // Create S3 bucket for article attachments and images
    this.articlesBucket = new s3.Bucket(this, 'ArticlesBucket', {
      bucketName: `policy-impact-articles-${props.stage}-${props.account}`,
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(360),
            },
          ],
        },
      ],
    });

    // Outputs
    new cdk.CfnOutput(this, 'ArticlesTableName', {
      value: this.articlesTable.tableName,
    });

    new cdk.CfnOutput(this, 'AuthorsTableName', {
      value: this.authorsTable.tableName,
    });

    new cdk.CfnOutput(this, 'ReferencesTableName', {
      value: this.referencesTable.tableName,
    });

    new cdk.CfnOutput(this, 'CredentialsTableName', {
      value: this.credentialsTable.tableName,
    });

    new cdk.CfnOutput(this, 'ArticlesBucketName', {
      value: this.articlesBucket.bucketName,
    });
  }
}