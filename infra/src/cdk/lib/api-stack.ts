// infra/src/cdk/lib/api-stack.ts
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { AuthConstruct } from './constructs/auth-construct';
import { StorageConstruct } from './constructs/storage-construct';
import { EmailConstruct } from './constructs/email-construct';

interface ApiStackProps extends cdk.StackProps {
  stage: string;
  domainName: string;
  hostedZoneId: string;
  hostedZoneName: string;
}

export class ApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // Create storage construct
    const storage = new StorageConstruct(this, 'Storage', {
      stage: props.stage,
      account: this.account,
      region: this.region
    });

    // Create email construct
    const email = new EmailConstruct(this, 'Email', {
      stage: props.stage,
      account: this.account,
      region: this.region
    });

    // Create auth construct
    const auth = new AuthConstruct(this, 'Auth', {
      stage: props.stage,
      account: this.account,
      region: this.region
    });

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
    const api = new apigateway.RestApi(this, 'PolicyImpactApi', {
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

    // Create API routes
    const authRoutes = api.root.addResource('auth');
    const registerRoute = authRoutes.addResource('register');
    registerRoute.addMethod('POST', new apigateway.LambdaIntegration(auth.registerFunction));

    // Create DNS record for API
    new route53.ARecord(this, 'ApiDomainRecord', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGateway(api)
      ),
      recordName: 'api',
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `https://api.${props.domainName}`,
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
    });
  }
}