// infra/src/cdk/lib/constructs/auth-construct.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';

export interface AuthConstructProps {
    stage: string;
    region: string;
    account: string;
  }

export class AuthConstruct extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly registerFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: AuthConstructProps) {
    super(scope, id);

    // Create the User Pool
    this.userPool = new cognito.UserPool(this, 'PolicyImpactUserPool', {
      userPoolName: `policy-impact-user-pool-${props.stage}`,
      selfSignUpEnabled: false,
      signInAliases: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        role: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
    });

    // Create common Lambda layer for shared code
    const commonLayer = new lambda.LayerVersion(this, 'CommonLayer', {
      code: lambda.Code.fromAsset(path.join(__dirname, '../../layers/common')),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'Common utilities and dependencies',
    });

    // Create the register Lambda function
    this.registerFunction = new lambda.Function(this, 'RegisterFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../functions/auth')),
      handler: 'register.handler',
      layers: [commonLayer],
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        COGNITO_USER_POOL_ID: this.userPool.userPoolId,
        STAGE: props.stage,
      },
    });

    // Grant the register function permission to manage Cognito users
    this.userPool.grant(this.registerFunction, 
      'cognito-idp:AdminCreateUser',
      'cognito-idp:AdminSetUserPassword',
      'cognito-idp:AdminAddUserToGroup'
    );

    // Create the User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, 'PolicyImpactUserPoolClient', {
      userPool: this.userPool,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
      preventUserExistenceErrors: true,
      generateSecret: false,
    });

    // Create required user groups
    const groups = ['Author', 'Reviewer', 'Researcher', 'Editor'];
    groups.forEach(groupName => {
      new cognito.CfnUserPoolGroup(this, `${groupName}Group`, {
        userPoolId: this.userPool.userPoolId,
        groupName: groupName,
      });
    });

    // Output values
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
    });
  }
}