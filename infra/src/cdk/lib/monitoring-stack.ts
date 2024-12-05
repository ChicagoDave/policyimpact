import * as cdk from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as actions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface MonitoringStackProps extends cdk.StackProps {
    env: {
      account: string;
      region: string;
    };
    api: apigateway.RestApi;
    distribution: cloudfront.Distribution;
  }

export class MonitoringStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: MonitoringStackProps) {
    super(scope, id, props);

    // Create SNS topic for alerts
    const alertTopic = new sns.Topic(this, 'AlertTopic', {
      topicName: 'policy-impact-alerts',
      displayName: 'Policy Impact Alerts',
    });

    // Add email subscription for alerts
    alertTopic.addSubscription(
      new subscriptions.EmailSubscription('alerts@policyimpact.us')
    );

    // Create dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'MainDashboard', {
      dashboardName: 'PolicyImpact-MainDashboard',
    });

    // API Gateway Metrics
    const apiMetricsWidget = new cloudwatch.GraphWidget({
      title: 'API Metrics',
      left: [
        this.createMetric(props.api, '4XXError', 'API Gateway 4XX Errors'),
        this.createMetric(props.api, '5XXError', 'API Gateway 5XX Errors'),
        this.createMetric(props.api, 'Count', 'API Gateway Request Count'),
        this.createMetric(props.api, 'Latency', 'API Gateway Latency', 'Average'),
      ],
      width: 12,
    });

    // CloudFront Metrics
    const cloudfrontMetricsWidget = new cloudwatch.GraphWidget({
      title: 'CloudFront Metrics',
      left: [
        this.createCloudfrontMetric('Requests', 'CloudFront Requests'),
        this.createCloudfrontMetric('BytesDownloaded', 'Bytes Downloaded'),
        this.createCloudfrontMetric('4xxErrorRate', '4XX Error Rate'),
        this.createCloudfrontMetric('5xxErrorRate', '5XX Error Rate'),
      ],
      width: 12,
    });

    // Add widgets to dashboard
    dashboard.addWidgets(
      apiMetricsWidget,
      cloudfrontMetricsWidget,
      this.createLambdaMetricsWidget(),
      this.createDynamoDBMetricsWidget()
    );

    // Create alarms
    this.createApiAlarms(props.api, alertTopic);
    this.createCloudfrontAlarms(props.distribution, alertTopic);
    this.createLambdaAlarms(alertTopic);
    this.createDynamoDBAlarms(alertTopic);

    // Create API Gateway error rate alarm
    new cloudwatch.Alarm(this, 'ApiErrorRateAlarm', {
      metric: new cloudwatch.MathExpression({
        expression: '(errors4xx + errors5xx) / requests * 100',
        usingMetrics: {
          errors4xx: this.createMetric(props.api, '4XXError', 'API 4XX Errors'),
          errors5xx: this.createMetric(props.api, '5XXError', 'API 5XX Errors'),
          requests: this.createMetric(props.api, 'Count', 'API Requests'),
        },
      }),
      threshold: 5,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API error rate is too high',
    }).addAlarmAction(new actions.SnsAction(alertTopic));

    // Create custom widget for article workflow metrics
    const workflowWidget = new cloudwatch.CustomWidget({
      title: 'Article Workflow Metrics',
      width: 12,
      height: 6,
      updateOnRefresh: true,
      updateOnResize: true,
      updateOnTimeRangeChange: true,
      functionBody: `
        const params = {
          MetricDataQueries: [
            {
              Id: 'articles_submitted',
              MetricStat: {
                Metric: {
                  Namespace: 'PolicyImpact',
                  MetricName: 'ArticlesSubmitted',
                  Dimensions: []
                },
                Period: 3600,
                Stat: 'Sum'
              }
            },
            {
              Id: 'articles_reviewed',
              MetricStat: {
                Metric: {
                  Namespace: 'PolicyImpact',
                  MetricName: 'ArticlesReviewed',
                  Dimensions: []
                },
                Period: 3600,
                Stat: 'Sum'
              }
            },
            {
              Id: 'articles_published',
              MetricStat: {
                Metric: {
                  Namespace: 'PolicyImpact',
                  MetricName: 'ArticlesPublished',
                  Dimensions: []
                },
                Period: 3600,
                Stat: 'Sum'
              }
            }
          ],
          StartTime: startTime,
          EndTime: endTime
        };
        
        return getMetricData(params);
      `,
    });

    dashboard.addWidgets(workflowWidget);

    // Output the dashboard URL and alert topic ARN
    new cdk.CfnOutput(this, 'DashboardURL', {
      value: `https://${props.env.region}.console.aws.amazon.com/cloudwatch/home?region=${props.env.region}#dashboards:name=${dashboard.dashboardName}`,
      description: 'URL for the CloudWatch Dashboard',
    });

    new cdk.CfnOutput(this, 'AlertTopicArn', {
      value: alertTopic.topicArn,
      description: 'ARN for the Alert SNS Topic',
    });
  }

  private createMetric(
    api: apigateway.RestApi,
    metricName: string,
    label: string,
    statistic: string = 'Sum'
  ): cloudwatch.Metric {
    return new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName,
      dimensionsMap: {
        ApiId: api.restApiId,
      },
      period: cdk.Duration.minutes(1),
      statistic,
      label,
    });
  }

  private createCloudfrontMetric(
    metricName: string,
    label: string
  ): cloudwatch.Metric {
    return new cloudwatch.Metric({
      namespace: 'AWS/CloudFront',
      metricName,
      dimensionsMap: {
        DistributionId: this.distribution.distributionId,
        Region: 'Global',
      },
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
      label,
    });
  }

  private createLambdaMetricsWidget(): cloudwatch.GraphWidget {
    return new cloudwatch.GraphWidget({
      title: 'Lambda Metrics',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          statistic: 'Sum',
          period: cdk.Duration.minutes(1),
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Duration',
          statistic: 'Average',
          period: cdk.Duration.minutes(1),
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Throttles',
          statistic: 'Sum',
          period: cdk.Duration.minutes(1),
        }),
      ],
      width: 12,
    });
  }

  private createDynamoDBMetricsWidget(): cloudwatch.GraphWidget {
    return new cloudwatch.GraphWidget({
      title: 'DynamoDB Metrics',
      left: [
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ConsumedReadCapacityUnits',
          statistic: 'Sum',
          period: cdk.Duration.minutes(1),
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ConsumedWriteCapacityUnits',
          statistic: 'Sum',
          period: cdk.Duration.minutes(1),
        }),
        new cloudwatch.Metric({
          namespace: 'AWS/DynamoDB',
          metricName: 'ThrottledRequests',
          statistic: 'Sum',
          period: cdk.Duration.minutes(1),
        }),
      ],
      width: 12,
    });
  }

  private createApiAlarms(api: apigateway.RestApi, topic: sns.Topic) {
    // API Latency Alarm
    new cloudwatch.Alarm(this, 'ApiLatencyAlarm', {
      metric: this.createMetric(api, 'Latency', 'API Latency', 'Average'),
      threshold: 5000, // 5 seconds
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'API latency is too high',
    }).addAlarmAction(new actions.SnsAction(topic));

    // API 5XX Error Alarm
    new cloudwatch.Alarm(this, 'Api5xxErrorAlarm', {
      metric: this.createMetric(api, '5XXError', 'API 5XX Errors'),
      threshold: 5,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Too many 5XX errors in API',
    }).addAlarmAction(new actions.SnsAction(topic));
  }

  private createCloudfrontAlarms(
    distribution: cloudfront.Distribution,
    topic: sns.Topic
  ) {
    // CloudFront Error Rate Alarm
    new cloudwatch.Alarm(this, 'CloudFrontErrorRateAlarm', {
      metric: new cloudwatch.MathExpression({
        expression: '(error4xx + error5xx) / requests * 100',
        usingMetrics: {
          error4xx: this.createCloudfrontMetric('4xxErrorRate', '4XX Errors'),
          error5xx: this.createCloudfrontMetric('5xxErrorRate', '5XX Errors'),
          requests: this.createCloudfrontMetric('Requests', 'Total Requests'),
        },
      }),
      threshold: 5,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'CloudFront error rate is too high',
    }).addAlarmAction(new actions.SnsAction(topic));
  }

  private createLambdaAlarms(topic: sns.Topic) {
    // Lambda Error Rate Alarm
    new cloudwatch.Alarm(this, 'LambdaErrorRateAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Errors',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 5,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Lambda error rate is too high',
    }).addAlarmAction(new actions.SnsAction(topic));

    // Lambda Duration Alarm
    new cloudwatch.Alarm(this, 'LambdaDurationAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/Lambda',
        metricName: 'Duration',
        statistic: 'Average',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10000, // 10 seconds
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'Lambda duration is too high',
    }).addAlarmAction(new actions.SnsAction(topic));
  }

  private createDynamoDBAlarms(topic: sns.Topic) {
    // DynamoDB Throttling Alarm
    new cloudwatch.Alarm(this, 'DynamoDBThrottlingAlarm', {
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ThrottledRequests',
        statistic: 'Sum',
        period: cdk.Duration.minutes(5),
      }),
      threshold: 10,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      alarmDescription: 'DynamoDB is experiencing throttling',
    }).addAlarmAction(new actions.SnsAction(topic));
  }
}