// infra/src/cdk/lib/constructs/api-functions-construct.ts
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface ApiFunctionDefinition {
  path: string;
  methods: string[];
  handler: string;
  tableName?: string;
  requiresNotifications?: boolean;
}

export interface ApiFunctionsConstructProps {
  env: cdk.Environment;
  tables: {
    articles: dynamodb.Table;
    authors: dynamodb.Table;
    credentials: dynamodb.Table;
    references: dynamodb.Table;
  };
  notificationsTopic: sns.Topic;
  commonLambdaLayer: lambda.LayerVersion;
}

export class ApiFunctionsConstruct extends Construct {
  public readonly functions: { [key: string]: lambda.Function } = {};

  constructor(scope: Construct, id: string, props: ApiFunctionsConstructProps) {
    super(scope, id);

    const functionDefinitions: ApiFunctionDefinition[] = [
      {
        path: '/articles',
        methods: ['GET', 'POST'],
        handler: 'articles/index.handler',
        tableName: 'articles'
      },
      {
        path: '/articles/{id}',
        methods: ['GET', 'PUT', 'DELETE'],
        handler: 'articles/[id].handler',
        tableName: 'articles'
      },
      {
        path: '/articles/{id}/submit',
        methods: ['POST'],
        handler: 'workflow/submit.handler',
        tableName: 'articles',
        requiresNotifications: true
      },
      // Add other function definitions here
    ];

    const commonLambdaConfig: Omit<lambda.FunctionProps, 'handler' | 'code'> = {
      runtime: lambda.Runtime.NODEJS_18_X,
      layers: [props.commonLambdaLayer],
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        ARTICLES_TABLE: props.tables.articles.tableName,
        AUTHORS_TABLE: props.tables.authors.tableName,
        CREDENTIALS_TABLE: props.tables.credentials.tableName,
        REFERENCES_TABLE: props.tables.references.tableName,
        NOTIFICATIONS_TOPIC_ARN: props.notificationsTopic.topicArn,
      }
    };

    // Create Lambda functions
    functionDefinitions.forEach(def => {
      const functionName = def.path.replace(/[{}]/g, '').replace(/\//g, '-') + 
        `-${def.methods.join('-')}`.toLowerCase();

      const lambdaFunction = new lambda.Function(this, functionName, {
        ...commonLambdaConfig,
        handler: def.handler,
        code: lambda.Code.fromAsset(path.join(__dirname, '../../../functions')),
      });

      // Grant permissions
      if (def.tableName) {
        props.tables[def.tableName as keyof typeof props.tables].grantReadWriteData(lambdaFunction);
      }
      if (def.requiresNotifications) {
        props.notificationsTopic.grantPublish(lambdaFunction);
      }

      this.functions[functionName] = lambdaFunction;
    });
  }
}