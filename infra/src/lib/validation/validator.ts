// infra/src/lib/validation/validator.ts
export class ValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  }
  
  export interface ValidationRule<T> {
    validate: (value: T) => boolean;
    message: string;
  }
  
  export function validateRequired(value: any, fieldName: string): void {
    if (value === undefined || value === null || value === '') {
      throw new ValidationError(`${fieldName} is required`);
    }
  }
  
  export function validateString(value: string, fieldName: string, minLength = 1, maxLength = 1000): void {
    validateRequired(value, fieldName);
    
    if (typeof value !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`);
    }
    
    if (value.length < minLength) {
      throw new ValidationError(`${fieldName} must be at least ${minLength} characters`);
    }
    
    if (value.length > maxLength) {
      throw new ValidationError(`${fieldName} must not exceed ${maxLength} characters`);
    }
  }
  
  export function validateArray<T>(
    array: T[],
    fieldName: string,
    minItems = 0,
    maxItems = 100,
    itemValidator?: (item: T) => void
  ): void {
    if (!Array.isArray(array)) {
      throw new ValidationError(`${fieldName} must be an array`);
    }
  
    if (array.length < minItems) {
      throw new ValidationError(`${fieldName} must have at least ${minItems} items`);
    }
  
    if (array.length > maxItems) {
      throw new ValidationError(`${fieldName} must not exceed ${maxItems} items`);
    }
  
    if (itemValidator) {
      array.forEach((item, index) => {
        try {
          itemValidator(item);
        } catch (error) {
          throw new ValidationError(`${fieldName}[${index}]: ${error.message}`);
        }
      });
    }
  }
  
  export function validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }
  }
  
  export function validateUrl(url: string): void {
    try {
      new URL(url);
    } catch {
      throw new ValidationError('Invalid URL format');
    }
  }