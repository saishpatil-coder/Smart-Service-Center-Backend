// config/firebase.js
import admin from "firebase-admin";
import serviceAccount from "../ccsms-1d901-firebase-adminsdk-fbsvc-5ca69d3250.json" with { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
