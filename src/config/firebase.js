import admin from "firebase-admin";

const initFirebase = () => {
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT env var is missing");
    }

    // 1. Parse string to object
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    // 2. Fix the private key line breaks
    const formattedServiceAccount = {
      ...serviceAccount,
      privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
    };

    // 3. Initialize
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(formattedServiceAccount),
      });
    }

    return admin;
  } catch (error) {
    console.error("Firebase Initialization Error:", error.message);
    throw error;
  }
};

const db = initFirebase();
export default db;
