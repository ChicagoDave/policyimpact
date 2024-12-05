import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ses from 'aws-cdk-lib/aws-ses';
import * as sns from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

export interface AuthStackProps extends cdk.StackProps {
  env: {
    account: string;
    region: string;
  };
}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;
  public readonly adminGroup: cognito.CfnUserPoolGroup;
  public readonly adminRole: iam.Role;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    // Create the Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'PolicyImpactUserPool', {
      userPoolName: 'policy-impact-users',
      selfSignUpEnabled: false, // Admin needs to create users
      signInAliases: {
        email: true,
        username: true,
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
        role: new cognito.StringAttribute({
          mutable: true,
          minLen: 4,
          maxLen: 10
        }),
        credentialsId: new cognito.StringAttribute({
          mutable: true,
          minLen: 1,
          maxLen: 50
        }),
        isAdmin: new cognito.StringAttribute({ // Added for admin flag
          mutable: true,
          minLen: 1,
          maxLen: 5
        }),
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      email: cognito.UserPoolEmail.withSES({
        sesRegion: props.env.region,
        fromEmail: 'noreply@policyimpact.us',
        fromName: 'Policy Impact',
        sesVerifiedDomain: 'policyimpact.us',
      }),
      userInvitation: {
        emailSubject: 'Welcome to Policy Impact',
        emailBody: 'Your username is {username} and temporary password is {####}. Please change your password on first sign in.',
        smsMessage: 'Your username is {username} and temporary password is {####}',
      },
      userVerification: {
        emailSubject: 'Verify your Policy Impact account',
        emailBody: 'Thanks for signing up! Your verification code is {####}',
        emailStyle: cognito.VerificationEmailStyle.CODE,
      },
    });

    // Create Admin Group
    this.adminGroup = new cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Administrators',
      description: 'Administrators with full access to user management',
      precedence: 0, // Highest precedence
    });

    // Create app client
    this.userPoolClient = this.userPool.addClient('PolicyImpactWebClient', {
      userPoolClientName: 'policy-impact-web',
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
        custom: true, // Enable custom auth flow for admin operations
      },
      oAuth: {
        flows: {
          implicitCodeGrant: true,
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.OPENID,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.COGNITO_ADMIN, // Add admin scope
        ],
        callbackUrls: [
          'https://policyimpact.us/auth/callback',
          'https://www.policyimpact.us/auth/callback',
          'http://localhost:3000/auth/callback',
        ],
        logoutUrls: [
          'https://policyimpact.us',
          'https://www.policyimpact.us',
          'http://localhost:3000',
        ],
      },
      preventUserExistenceErrors: true,
    });

    // Create Identity Pool
    this.identityPool = new cognito.CfnIdentityPool(this, 'PolicyImpactIdentityPool', {
      identityPoolName: 'policy_impact_identity_pool',
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [{
        clientId: this.userPoolClient.userPoolClientId,
        providerName: this.userPool.userPoolProviderName,
      }],
    });

    // Create admin role
    this.adminRole = new iam.Role(this, 'CognitoAdminRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
            'cognito-identity.amazonaws.com:groups': 'Administrators',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // Add admin permissions
    this.adminRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'cognito-idp:AdminCreateUser',
          'cognito-idp:AdminDeleteUser',
          'cognito-idp:AdminDisableUser',
          'cognito-idp:AdminEnableUser',
          'cognito-idp:AdminGetUser',
          'cognito-idp:AdminListGroupsForUser',
          'cognito-idp:AdminListUserAuthEvents',
          'cognito-idp:AdminRemoveUserFromGroup',
          'cognito-idp:AdminResetUserPassword',
          'cognito-idp:AdminSetUserPassword',
          'cognito-idp:AdminUpdateUserAttributes',
          'cognito-idp:ListUsers',
          'cognito-idp:ListUsersInGroup',
        ],
        resources: [this.userPool.userPoolArn],
      })
    );

    // Create regular authenticated role
    const authenticatedRole = new iam.Role(this, 'CognitoAuthenticatedRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // Add basic authenticated user permissions
    authenticatedRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'sns:Publish',
          'ses:SendEmail',
          'ses:SendRawEmail',
        ],
        resources: [
          `arn:aws:sns:${props.env.region}:${props.env.account}:*`,
          `arn:aws:ses:${props.env.region}:${props.env.account}:*`,
        ],
      })
    );

    // Attach roles to identity pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
      },
      roleMappings: {
        mapping: {
          type: 'Token',
          ambiguousRoleResolution: 'AuthenticatedRole',
          identityProvider: `${this.userPool.userPoolProviderName}:${this.userPoolClient.userPoolClientId}`,
        },
      },
    });

    // Output values
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'The ID of the Cognito User Pool',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'The ID of the Cognito User Pool Client',
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPool.ref,
      description: 'The ID of the Cognito Identity Pool',
    });

    new cdk.CfnOutput(this, 'AdminGroupName', {
      value: this.adminGroup.groupName!,
      description: 'The name of the administrators group',
    });
  }
}