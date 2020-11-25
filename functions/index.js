// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require('firebase-functions');

// The Firebase Admin SDK to access Cloud Firestore.
const admin = require('firebase-admin');
const app = require('./app');

admin.initializeApp(functions.config().firebase);

// const updateClaims = (uid) => firestore.collection('claims').doc(uid).get().then((doc) => {
//   if (!doc) { return {} }
//   const data = doc.data()
//   console.log(`${uid} has custom claims`, data)
//   return data
// })
// .then((additionalClaims) => {
//   const defaultClaims = {
//     'x-hasura-default-role': 'user',
//     'x-hasura-allowed-roles': ['user'],
//     'x-hasura-user-id': uid,
//   }
//   const claims = {
//     'https://hasura.io/jwt/claims': {
//       ...defaultClaims,
//       ...additionalClaims,
//     },
//   }
//   return admin.auth().setCustomUserClaims(uid, claims)
// })

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
    .catch((error) => {
      console.log(error);
    });
});

// Update users table
exports.syncDatabaseOnSignUp = functions.auth.user().onCreate(async (user) => {
  const { uid: id, email } = user;
  const mutation = gql`
    mutation($id: String!, $email: String) {
      insert_users(objects: [{ id: $id, email: $email }]) {
        affected_rows
      }
    }
  `;

  try {
    const data = await client.request(mutation, { id, email });

    return data;
  } catch (e) {
    throw new functions.https.HttpsError('invalid-argument', e.message);
  }
});

// Express App
exports.expressApp = functions.https.onRequest(app);

// TODOS
// Add function to add user to a school as a specific role, they must be an admin of the school to do so.
// -> This will take the user's UID and the school's ID and create a row in school_assignments.
// THIS CAN BE HANDLED CLIENT SIDE

// Add user to take in CSV to bulk add users. The requesting user must be an admin of the school to do this.
