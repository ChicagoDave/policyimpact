// infra/src/lib/auth/cognito.ts
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { APIGatewayProxyEvent } from 'aws-lambda';

export interface CognitoToken {
  sub: string;
  email: string;
  'custom:role': string;
  'custom:credentialsId': string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function verifyToken(event: APIGatewayProxyEvent): Promise<CognitoToken> {
  try {
    const token = event.headers.Authorization?.replace('Bearer ', '');
    
    if (!token) {
      throw new AuthError('No authorization token provided');
    }

    const verifier = CognitoJwtVerifier.create({
      userPoolId: process.env.COGNITO_USER_POOL_ID!,
      clientId: process.env.COGNITO_CLIENT_ID!,
      tokenUse: "access",
    });

    const payload = await verifier.verify(token);
    return payload as CognitoToken;
  } catch (error) {
    throw new AuthError(`Token verification failed: ${error.message}`);
  }
}

export function requireRole(token: CognitoToken, ...allowedRoles: string[]): void {
  if (!allowedRoles.includes(token['custom:role'])) {
    throw new AuthError('Insufficient permissions for this operation');
  }
}