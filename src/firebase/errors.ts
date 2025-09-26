
import { FirebaseError } from 'firebase/app';
import { errorEmitter } from './error-emitter';

const isDev = process.env.NODE_ENV === 'development';

export type SecurityRuleContext = {
  path: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete' | 'write';
  requestResourceData?: unknown;
};

export class FirestorePermissionError extends Error {
  public readonly context: SecurityRuleContext;

  constructor(context: SecurityRuleContext) {
    // Construct a developer-friendly message for the error overlay.
    const message = `
Firestore Security Rules Denied Request:
-----------------------------------------
Operation: ${context.operation.toUpperCase()}
Path: /${context.path}
${context.requestResourceData ? `Request Data: ${JSON.stringify(context.requestResourceData, null, 2)}` : ''}
-----------------------------------------
Check your firestore.rules file to ensure this request is allowed.
    `.trim();

    super(message);
    this.name = 'FirestorePermissionError';
    this.context = context;
    // This maintains the correct prototype chain
    Object.setPrototypeOf(this, FirestorePermissionError.prototype);
  }
}


export class StandardizedError extends Error {
  public readonly code: string;
  public readonly originalError: Error | undefined;

  constructor(code: string, message: string, originalError?: Error) {
    super(message);
    this.name = 'StandardizedError';
    this.code = code;
    this.originalError = originalError;
    Object.setPrototypeOf(this, StandardizedError.prototype);
  }
}

export function handleFirebaseError(
  error: Error,
  options: { source: string; throw?: boolean },
): StandardizedError {
  let standardizedError: StandardizedError;

  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
      case 'unauthenticated':
        standardizedError = new StandardizedError(
          error.code,
          'You do not have permission to perform this action.',
          error,
        );
        // Special handling for auth errors that should redirect to login
        if (options.source !== 'useAuth') {
          errorEmitter.emit('navigation:push', '/');
        }
        break;
      default:
        standardizedError = new StandardizedError(
          'firebase-error',
          isDev ? `[${error.code}] ${error.message}` : 'A server error occurred.',
          error,
        );
    }
  } else {
    standardizedError = new StandardizedError(
      'unknown-error',
      isDev ? error.message : 'An unexpected error occurred.',
      error,
    );
  }

  if (isDev) {
    console.error(`[${options.source}]`, standardizedError);
  }

  if (options.throw) {
    throw standardizedError;
  }

  return standardizedError;
}

