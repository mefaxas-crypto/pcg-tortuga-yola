
import { EventEmitter } from 'events';
import type { FirestorePermissionError } from './errors';

// Define the shape of the events we can emit.
// This makes the emitter type-safe.
interface TypedEvents {
  'permission-error': (error: FirestorePermissionError) => void;
  'navigation:push': (path: string) => void;
  error: (details: { source: string; error: Error }) => void;
}

// Extend EventEmitter with our custom typed events
class TypedEventEmitter extends EventEmitter {
  emit<T extends keyof TypedEvents>(event: T, ...args: Parameters<TypedEvents[T]>): boolean {
    return super.emit(event, ...args);
  }

  on<T extends keyof TypedEvents>(event: T, listener: TypedEvents[T]): this {
    return super.on(event, listener);
  }

  off<T extends keyof TypedEvents>(event: T, listener: TypedEvents[T]): this {
    return super.off(event, listener);
  }
}

// Create a singleton instance of our typed event emitter.
// This ensures that the same emitter is used throughout the application.
const getEventEmitter = (): TypedEventEmitter => {
  const g = global as typeof global & { __eventEmitter?: TypedEventEmitter };
  if (!g.__eventEmitter) {
    g.__eventEmitter = new TypedEventEmitter();
    // Increase the listener limit if necessary, though it's better to avoid leaks.
    g.__eventEmitter.setMaxListeners(20); 
  }
  return g.__eventEmitter;
};

export const errorEmitter = getEventEmitter();

// Convenience object for navigation events, though could be emitted directly.
export const navigation = {
  push: (path: string) => {
    errorEmitter.emit('navigation:push', path);
  },
};
