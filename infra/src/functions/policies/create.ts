// infra/src/functions/policies/create.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { 
  Policy,
  CreatePolicyRequest,
  put,
  verifyToken,
  requireRole,
  validateString,
  validateArray
} from '../../lib';
import { ValidationError } from '../../lib/validation/validator';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Only editors can create policies
    const token = await verifyToken(event);
    requireRole(token, 'EDITOR');

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Request body is required' })
      };
    }

    const request: CreatePolicyRequest = JSON.parse(event.body);

    // Validate request
    validateString(request.title, 'title', 1, 200);
    validateString(request.description, 'description', 1, 10000);
    validateString(request.jurisdiction, 'jurisdiction', 1, 100);
    validateArray(request.tags, 'tags', 1, 10);

    const now = new Date().toISOString();
    const policy: Policy = {
      id: uuidv4(),
      title: request.title,
      description: request.description,
      type: request.type,
      status: 'DRAFT',
      jurisdiction: request.jurisdiction,
      agency: request.agency,
      referenceIds: [],
      articleIds: [],
      tags: request.tags,
      editorId: token.sub,
      createdAt: now,
      updatedAt: now
    };

    await put('PoliciesTable', policy);

    return {
      statusCode: 201,
      body: JSON.stringify(policy)
    };

  } catch (error) {
    console.error('Error creating policy:', error);

    if (error instanceof ValidationError) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: error.message })
      };
    }

    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};

// infra/src/functions/policies/proposeCoverage.ts
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const token = await verifyToken(event);
    requireRole(token, 'AUTHOR');

    const policyId = event.pathParameters?.id;
    if (!policyId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Policy ID is required' })
      };
    }

    const request: ProposeCoverageRequest = JSON.parse(event.body || '{}');
    
    // Get policy
    const policy = await get<Policy>('PoliciesTable', { id: policyId });
    if (!policy) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Policy not found' })
      };
    }

    // Create coverage proposal
    const now = new Date().toISOString();
    const proposal = {
      id: uuidv4(),
      policyId,
      authorId: token.sub,
      coverageType: request.coverageType,
      outline: request.outline,
      status: 'PENDING',
      createdAt: now,
      updatedAt: now
    };

    await put('CoverageProposalsTable', proposal);

    // Notify editor
    const notificationEvent: NotificationEvent = {
      type: 'EMAIL',
      recipient: {
        userId: policy.editorId
      },
      template: 'COVERAGE_PROPOSED',
      data: {
        policyTitle: policy.title,
        authorId: token.sub,
        proposalId: proposal.id,
        coverageType: request.coverageType
      }
    };

    await publishNotification(notificationEvent);

    return {
      statusCode: 201,
      body: JSON.stringify(proposal)
    };

  } catch (error) {
    console.error('Error proposing coverage:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};