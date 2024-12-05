// infra/src/functions/auth/verifyEmail.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityServiceProvider, SNS } from 'aws-sdk';
import { NotificationEvent } from '../../types/events';
import { ValidationError, validateEmail } from '../../lib/validation/validator';

const cognito = new CognitoIdentityServiceProvider();
const sns = new SNS();

interface VerifyEmailRequest {
  email: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!process.env.COGNITO_USER_POOL_ID) {
      throw new Error('COGNITO_USER_POOL_ID environment variable is not set');
    }

    if (!process.env.NOTIFICATION_TOPIC_ARN) {
      throw new Error('NOTIFICATION_TOPIC_ARN environment variable is not set');
    }

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Request body is required' })
      };
    }

    const request: VerifyEmailRequest = JSON.parse(event.body);

    // Validate email
    validateEmail(request.email);

    // Search for user by email
    const userResponse = await cognito.listUsers({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Filter: `email = "${request.email}"`,
    }).promise();

    if (!userResponse.Users || userResponse.Users.length === 0) {
      throw new ValidationError('No user found with this email address');
    }

    const user = userResponse.Users[0];
    
    if (!user.Username) {
      throw new Error('User ID not found in Cognito response');
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresIn = 15 * 60; // 15 minutes in seconds

    // Create notification event with validated userId
    const notificationEvent: NotificationEvent = {
      type: 'EMAIL',
      recipient: {
        userId: user.Username,
        email: request.email,
      },
      template: 'EMAIL_VERIFICATION',
      data: {
        code: verificationCode,
        expiresIn,
        email: request.email
      }
    };

    await sns.publish({
      TopicArn: process.env.NOTIFICATION_TOPIC_ARN,
      Message: JSON.stringify(notificationEvent),
      MessageAttributes: {
        type: {
          DataType: 'String',
          StringValue: 'EMAIL',
        },
      },
    }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Verification code sent successfully',
        expiresIn,
      }),
    };

  } catch (error) {
    console.error('Error in email verification:', error);

    if (error instanceof ValidationError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: error.message }),
      };
    }

    if (error instanceof Error) {
      if (error.name === 'UserNotFoundException') {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: 'User not found' }),
        };
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};