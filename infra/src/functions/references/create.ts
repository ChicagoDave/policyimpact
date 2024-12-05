// infra/src/functions/references/create.ts
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { 
  Reference,
  put,
  verifyToken,
  ValidationError 
} from '../../lib';
import { v4 as uuidv4 } from 'uuid';

// API request schema matches client-side but transforms authors to array of strings
const createReferenceSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must not exceed 200 characters'),
  url: z.string()
    .min(1, 'URL is required')
    .url('Must be a valid URL')
    .refine((url) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    }, 'Must be a valid URL'),
  authors: z.array(z.string())
    .min(1, 'At least one author is required')
    .transform(authors => 
      authors.filter(author => author.trim().length > 0)
    ),
  publishedDate: z.string().optional(),
  publisher: z.string()
    .min(1, 'Publisher is required')
    .max(100, 'Publisher must not exceed 100 characters'),
  description: z.string()
    .min(1, 'Description is required')
    .max(1000, 'Description must not exceed 1000 characters'),
  type: z.enum(['ACADEMIC', 'GOVERNMENT', 'NEWS', 'OTHER'], {
    required_error: 'Reference type is required'
  })
});

type CreateReferenceRequest = z.infer<typeof createReferenceSchema>;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    // Verify authentication
    const token = await verifyToken(event);

    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Request body is required' })
      };
    }

    // Parse and validate request body
    const requestData: CreateReferenceRequest = await createReferenceSchema.parseAsync(
      JSON.parse(event.body)
    );

    const now = new Date().toISOString();

    // Create reference object
    const reference: Reference = {
      id: uuidv4(),
      ...requestData,
      verifiedBy: undefined,
      verifiedAt: undefined,
      createdAt: now,
      updatedAt: now
    };

    // Save to DynamoDB
    await put('ReferencesTable', reference);

    return {
      statusCode: 201,
      body: JSON.stringify(reference)
    };

  } catch (error) {
    console.error('Error creating reference:', error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'Validation failed',
          errors: error.errors
        })
      };
    }

    // Handle other validation errors
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