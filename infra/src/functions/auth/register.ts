// infra/src/functions/auth/register.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityServiceProvider } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '../../lib/validation/validator';
import { validateString, validateEmail } from '../../lib/validation/validator';

const cognito = new CognitoIdentityServiceProvider();

interface RegistrationRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  biography?: string;
}

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!process.env.COGNITO_USER_POOL_ID) {
      throw new Error('COGNITO_USER_POOL_ID environment variable is not set');
    }

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Request body is required' })
      };
    }

    const request: RegistrationRequest = JSON.parse(event.body);

    // Validate required fields
    validateString(request.firstName, 'firstName', 1, 50);
    validateString(request.lastName, 'lastName', 1, 50);
    validateString(request.password, 'password', 8, 100);
    validateEmail(request.email);
    validateString(request.role, 'role', 1, 20);

    if (request.biography) {
      validateString(request.biography, 'biography', 0, 1000);
    }

    const userId = uuidv4();

    // Create user in Cognito
    const createUserParams = {
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: request.email,
      TemporaryPassword: request.password,
      UserAttributes: [
        {
          Name: 'email',
          Value: request.email
        },
        {
          Name: 'email_verified',
          Value: 'true'
        },
        {
          Name: 'custom:role',
          Value: request.role
        },
        {
          Name: 'given_name',
          Value: request.firstName
        },
        {
          Name: 'family_name',
          Value: request.lastName
        },
        {
          Name: 'sub',
          Value: userId
        }
      ]
    };

    await cognito.adminCreateUser(createUserParams).promise();

    // Set permanent password
    await cognito.adminSetUserPassword({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: request.email,
      Password: request.password,
      Permanent: true
    }).promise();

    // Add user to appropriate group based on role
    await cognito.adminAddUserToGroup({
      UserPoolId: process.env.COGNITO_USER_POOL_ID,
      Username: request.email,
      GroupName: request.role
    }).promise();

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'User registered successfully',
        userId: userId
      })
    };

  } catch (error) {
    console.error('Error registering user:', error);

    if (error instanceof ValidationError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: error.message })
      };
    }

    if (error instanceof Error) {
      // Handle Cognito-specific errors
      if (error.name === 'UsernameExistsException') {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Email address is already registered' })
        };
      }

      if (error.name === 'InvalidPasswordException') {
        return {
          statusCode: 400,
          body: JSON.stringify({ message: 'Password does not meet requirements' })
        };
      }
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};