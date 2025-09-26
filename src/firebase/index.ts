
export * from './provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export { setDocumentNonBlocking } from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';

// Re-export initializeFirebase and other client-side providers
export * from './initialize';
export { FirebaseClientProvider } from './client-provider';
