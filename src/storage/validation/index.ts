/**
 * Storage validation module - exports all validation schemas and utilities
 */

import { z } from 'zod';

export * from './schemas';

/**
 * Utility function to create a Formik-compatible validation function from a Zod schema
 * @param schema Zod schema to use for validation
 * @returns Formik validation function
 */
export function createFormikValidation<T>(
  schema: z.ZodSchema<T>
): (values: any) => Record<string, string> {
  return (values: any) => {
    const result = schema.safeParse(values);

    if (result.success) {
      return {};
    }

    const errors: Record<string, string> = {};

    // Convert Zod errors to Formik error format
    result.error.issues.forEach(issue => {
      const path = issue.path.join('.');
      if (path) {
        errors[path] = issue.message;
      }
    });

    return errors;
  };
}

/**
 * Utility function to validate data with a Zod schema and return formatted errors
 * @param schema Zod schema to use for validation
 * @param data Data to validate
 * @returns Validation result with formatted errors
 */
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: any
): { isValid: boolean; data?: T; errors?: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { isValid: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  result.error.issues.forEach(issue => {
    const path = issue.path.join('.');
    if (path) {
      errors[path] = issue.message;
    }
  });

  return { isValid: false, errors };
}
