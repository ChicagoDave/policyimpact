// infra/src/cdk/lib/constructs/email-construct.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';

export interface EmailConstructProps {
  stage: string;
  region: string;
  account: string;
}

export class EmailConstruct extends Construct {
  public readonly notificationTopic: sns.Topic;
  public readonly emailHandler: lambda.Function;

  constructor(scope: Construct, id: string, props: EmailConstructProps) {
    super(scope, id);

    // Create SNS topic for notifications
    this.notificationTopic = new sns.Topic(this, 'NotificationTopic', {
      topicName: `policy-impact-notifications-${props.stage}`,
      displayName: 'Policy Impact Notifications',
    });

    // Create Lambda function to handle email sending
    this.emailHandler = new lambda.Function(this, 'EmailHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../functions/email')),
      handler: 'sendEmail.handler',
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      tracing: lambda.Tracing.ACTIVE,
      logRetention: logs.RetentionDays.ONE_WEEK,
      environment: {
        STAGE: props.stage,
        SENDER_EMAIL: `no-reply@policyimpact.us`,
      },
    });

    // Grant SES permissions to Lambda
    const sesPolicy = new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: [`arn:aws:ses:${props.region}:${props.account}:identity/*`],
    });
    this.emailHandler.addToRolePolicy(sesPolicy);

    // Subscribe Lambda to SNS topic
    this.notificationTopic.addSubscription(
      new snsSubs.LambdaSubscription(this.emailHandler)
    );

    // Create SES configuration set for tracking
    new ses.CfnConfigurationSet(this, 'EmailConfigSet', {
      name: `policy-impact-emails-${props.stage}`,
    });

    // Output the SNS topic ARN
    new cdk.CfnOutput(this, 'NotificationTopicArn', {
      value: this.notificationTopic.topicArn,
    });
  }
}