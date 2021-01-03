import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import app from './app';

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.

// The Firebase Admin SDK to access Cloud Firestore.

admin.initializeApp(functions.config().firebase);

// On sign up.
// exports.processSignUp = functions.auth.user().onCreate((user) => {
//   return;
// });

// Update users table (handled by functions)
// exports.syncDatabaseOnSignUp = functions.auth.user().onCreate(async (user) => {
//   const { uid: id, email } = user;
//   const mutation = gql`
//     mutation($id: String!, $email: String) {
//       insert_users(objects: [{ id: $id, email: $email }]) {
//         affected_rows
//       }
//     }
//   `;

//   try {
//     const data = await graphQLClient.request(mutation, { id, email });

//     return data;
//   } catch (e) {
//     throw new functions.https.HttpsError('invalid-argument', e.message);
//   }
// });

// Express App
exports.expressApp = functions.https.onRequest(app);

// TODOS

// Add user to take in CSV to bulk add users. The requesting user must be an admin of the school to do this.
