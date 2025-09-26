
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { firebaseConfig } from './config';

// Define the shape of the services object for the server
interface FirebaseServerServices {
  app: App;
  firestore: Firestore;
}

let app: App;
let firestore: Firestore;

// This service account is a placeholder. In a real production environment,
// you would use environment variables to securely load the service account credentials.
const serviceAccount = {
  projectId: firebaseConfig.projectId,
  // These are intentionally left blank for this example.
  // In a real app, you'd populate them from secure environment variables.
  clientEmail: `firebase-adminsdk-placeholder@${firebaseConfig.projectId}.iam.gserviceaccount.com`,
  privateKey: '-----BEGIN PRIVATE KEY-----\n...placeholder...\n-----END PRIVATE KEY-----\n',
};


/**
 * Initializes and returns the Firebase Admin SDK services for server-side use.
 * This ensures that the Admin SDK is initialized only once.
 */
export const initializeFirebaseAdmin = (): FirebaseServerServices => {
  if (!getApps().length) {
    try {
      app = initializeApp({
        credential: cert(serviceAccount),
      });
      firestore = getFirestore(app);
      firestore.settings({ ignoreUndefinedProperties: true });

    } catch (error) {
      console.error("Firebase Admin initialization error:", error);
      throw new Error("Failed to initialize Firebase Admin SDK. Check your service account configuration.");
    }
  } else {
    app = getApps()[0];
    firestore = getFirestore(app);
  }

  return { app, firestore };
};

// Initialize and export the firestore instance for use in server actions
const services = initializeFirebaseAdmin();
firestore = services.firestore;

export { firestore };

    