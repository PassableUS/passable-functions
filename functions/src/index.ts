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
exports.processSignUp = functions.auth.user().onCreate((user) => {
  const customClaims = {
    'https://hasura.io/jwt/claims': {
      'x-hasura-default-role': 'user',
      'x-hasura-allowed-roles': ['user'],
      'x-hasura-user-id': user.uid,
    },
  };

  return admin
    .auth()
    .setCustomUserClaims(user.uid, customClaims)
    .then(() => {
      // Update real-time database to notify client to force refresh.
      const claimRef = admin.database().ref('claims/' + user.uid);
      // Set the refresh time to the current UTC timestamp.
      // This will be captured on the client to force a token refresh.
      return claimRef.set({ refreshTime: new Date().getTime() });
    })
    .catch((error: Error) => {
      console.log(error);
    });
});

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
// Add function to add user to a school as a specific role, they must be an admin of the school to do so.
// -> This will take the user's UID and the school's ID and create a row in school_assignments.
// THIS CAN BE HANDLED CLIENT SIDE

// Add user to take in CSV to bulk add users. The requesting user must be an admin of the school to do this.
