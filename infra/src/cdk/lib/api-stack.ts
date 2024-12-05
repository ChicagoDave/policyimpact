// infra/src/cdk/lib/api-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

interface ApiStackProps extends cdk.StackProps {
  stage: string;
  domainName: string;
  hostedZoneId: string;
  hostedZoneName: string;
  tables: {
    articles: dynamodb.Table;
    references: dynamodb.Table;
    authors: dynamodb.Table;
    credentials: dynamodb.Table;
  };
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
}

export class ApiStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly apiEndpoint: string;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Look up the hosted zone
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.hostedZoneName,
    });

    // Create certificate for API domain
    const certificate = new acm.Certificate(this, 'ApiCertificate', {
      domainName: `api.${props.domainName}`,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    // Create API Gateway
    this.api = new apigateway.RestApi(this, 'PolicyImpactApi', {
      restApiName: `policy-impact-api-${props.stage}`,
      domainName: {
        domainName: `api.${props.domainName}`,
        certificate: certificate,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: [
          `https://${props.domainName}`,
          `https://www.${props.domainName}`,
        ],
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization'],
        allowCredentials: true,
      },
    });

    // Create common Lambda role
    const lambdaRole = new iam.Role(this, 'ApiLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
      ]
    });

    // Articles routes
    const articlesRoutes = this.api.root.addResource('articles');
    
    const listArticlesFunction = new lambda.Function(this, 'ListArticlesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      handler: 'articles/list.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../functions')),
      role: lambdaRole,
      environment: {
        STAGE: props.stage,
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        COGNITO_CLIENT_ID: props.userPoolClient.userPoolClientId,
        ARTICLES_TABLE: props.tables.articles.tableName,
      }
    });
    props.tables.articles.grantReadData(listArticlesFunction);
    
    articlesRoutes.addMethod('GET', new apigateway.LambdaIntegration(listArticlesFunction));

    const createArticleFunction = new lambda.Function(this, 'CreateArticleFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      handler: 'articles/post.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../functions')),
      role: lambdaRole,
      environment: {
        STAGE: props.stage,
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        COGNITO_CLIENT_ID: props.userPoolClient.userPoolClientId,
        ARTICLES_TABLE: props.tables.articles.tableName,
      }
    });
    props.tables.articles.grantWriteData(createArticleFunction);
    
    articlesRoutes.addMethod('POST', new apigateway.LambdaIntegration(createArticleFunction));

    // References routes
    const referencesRoutes = this.api.root.addResource('references');
    
    const createReferenceFunction = new lambda.Function(this, 'CreateReferenceFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      handler: 'references/create.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../functions')),
      role: lambdaRole,
      environment: {
        STAGE: props.stage,
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        COGNITO_CLIENT_ID: props.userPoolClient.userPoolClientId,
        REFERENCES_TABLE: props.tables.references.tableName,
      }
    });
    props.tables.references.grantWriteData(createReferenceFunction);

    referencesRoutes.addMethod('POST', 
      new apigateway.LambdaIntegration(createReferenceFunction),
      {
        authorizationType: apigateway.AuthorizationType.IAM,
        methodResponses: [{
          statusCode: '201',
          responseParameters: {
            'method.response.header.Access-Control-Allow-Origin': true
          }
        }]
      }
    );

    const listReferencesFunction = new lambda.Function(this, 'ListReferencesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      handler: 'references/list.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../functions')),
      role: lambdaRole,
      environment: {
        STAGE: props.stage,
        COGNITO_USER_POOL_ID: props.userPool.userPoolId,
        COGNITO_CLIENT_ID: props.userPoolClient.userPoolClientId,
        REFERENCES_TABLE: props.tables.references.tableName,
      }
    });
    props.tables.references.grantReadData(listReferencesFunction);

    referencesRoutes.addMethod('GET', new apigateway.LambdaIntegration(listReferencesFunction));

    // Create DNS record for API
    new route53.ARecord(this, 'ApiDomainRecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGateway(this.api)
      ),
      recordName: 'api',
    });

    // Store the API endpoint for other stacks to use
    this.apiEndpoint = this.api.urlForPath();

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `https://api.${props.domainName}`,
      description: 'API URL',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.apiEndpoint,
      description: 'API Gateway endpoint',
    });
  }
}