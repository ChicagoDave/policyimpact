import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface FrontendStackProps extends cdk.StackProps {
    env: {
      account: string;
      region: string;
    };
    apiEndpoint: string;
    userPool: cognito.IUserPool;
  }

export class FrontendStack extends cdk.Stack {
  public readonly distribution: cloudfront.Distribution;
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // Create S3 bucket for website hosting
    this.bucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: 'policyimpact.us',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
    });

    // Get the hosted zone
    const zone = route53.HostedZone.fromLookup(this, 'Zone', {
      domainName: 'policyimpact.us',
    });

    // Create ACM certificate
    const certificate = new acm.DnsValidatedCertificate(this, 'SiteCertificate', {
      domainName: 'policyimpact.us',
      subjectAlternativeNames: ['www.policyimpact.us'],
      hostedZone: zone,
      region: 'us-east-1', // CloudFront requires certificates in us-east-1
      validation: acm.CertificateValidation.fromDns(zone),
    });

    // Create CloudFront Origin Access Identity
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'WebsiteOAI');
    this.bucket.grantRead(originAccessIdentity);

    // Create response headers policy
    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeadersPolicy', {
      responseHeadersPolicyName: 'SecurityHeadersPolicy',
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          override: true,
          contentSecurityPolicy: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com",
            "img-src 'self' data: https:",
            "connect-src 'self'",
            `https://${props.apiEndpoint}`,
            `https://${props.userPool.userPoolId}.auth.${props.env.region}.amazoncognito.com`,
          ].join('; '),
        },
        strictTransportSecurity: {
          override: true,
          accessControlMaxAge: cdk.Duration.days(365 * 2),
          includeSubdomains: true,
          preload: true,
        },
        contentTypeOptions: { override: true },
        frameOptions: {
          override: true,
          frameOption: cloudfront.HeadersFrameOption.DENY,
        },
        xssProtection: {
          override: true,
          protection: true,
          modeBlock: true,
        },
        referrerPolicy: {
          override: true,
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
        },
      },
      customHeadersBehavior: {
        customHeaders: [
          {
            header: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
            override: true,
          },
        ],
      },
      corsBehavior: {
        accessControlAllowCredentials: false,
        accessControlAllowHeaders: ['Authorization', 'Content-Type'],
        accessControlAllowMethods: ['GET', 'HEAD', 'OPTIONS'],
        accessControlAllowOrigins: [
          'https://policyimpact.us',
          'https://www.policyimpact.us',
          'http://localhost:3000',
        ],
        originOverride: true,
      },
    });

    // Create CloudFront function for default directory index
    const indexFunction = new cloudfront.Function(this, 'IndexFunction', {
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var request = event.request;
          var uri = request.uri;
          
          // Check whether the URI is missing a file name.
          if (uri.endsWith('/')) {
              request.uri += 'index.html';
          } 
          // Check whether the URI is missing a file extension.
          else if (!uri.includes('.')) {
              request.uri += '/index.html';
          }
          
          return request;
        }
      `),
    });

    // Create error response configuration
    const errorResponses: cloudfront.ErrorResponse[] = [
      {
        httpStatus: 404,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: cdk.Duration.minutes(0),
      },
      {
        httpStatus: 403,
        responseHttpStatus: 200,
        responsePagePath: '/index.html',
        ttl: cdk.Duration.minutes(0),
      },
    ];

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(this.bucket, { originAccessIdentity }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        functionAssociations: [{
          function: indexFunction,
          eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
        }],
        responseHeadersPolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
      },
      domainNames: ['policyimpact.us', 'www.policyimpact.us'],
      certificate,
      errorResponses,
      defaultRootObject: 'index.html',
      enableLogging: true,
      logBucket: new s3.Bucket(this, 'LogsBucket', {
        encryption: s3.BucketEncryption.S3_MANAGED,
        lifecycleRules: [
          {
            expiration: cdk.Duration.days(30),
          },
        ],
      }),
      logFilePrefix: 'cdn-logs/',
      logIncludesCookies: true,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      webAclId: undefined, // Optional: Add WAF WebACL
    });

    // Create Route53 records
    new route53.ARecord(this, 'SiteAliasRecord', {
      recordName: 'policyimpact.us',
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(this.distribution)
      ),
      zone,
    });

    new route53.ARecord(this, 'WWWSiteAliasRecord', {
      recordName: 'www.policyimpact.us',
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(this.distribution)
      ),
      zone,
    });

    // Output the distribution URL and bucket name
    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront Distribution ID',
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.domainName,
      description: 'CloudFront Distribution Domain Name',
    });

    new cdk.CfnOutput(this, 'BucketName', {
      value: this.bucket.bucketName,
      description: 'Website Bucket Name',
    });
  }
}