import express, { Request, Response } from 'express';
import { gql } from 'graphql-request';
import { graphQLClient } from '../utils/gqlClient';
const usersRouter = express.Router();

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

const STUDENT_PERMISSIONS = [4];
const TEACHER_PERMISSIONS = [4, 5]; // Added on to default permissions
const ADMIN_PERMISSIONS = [4, 5, 6, 7]; // Added on to default permissions

export const updatePermissions = async (
  permissionsArray: number[],
  userID: string,
  schoolID: string
) => {
  // Clears all existing permissions and sets the corresponding permission IDs in *permissionsArray*
  // TODO: Rewrite this using a SQL query or something. This can't be efficient.

  try {
    const permissionsDataArray = permissionsArray.map((permission) => ({
      school_id: schoolID,
      user_id: userID,
      permission_id: permission,
    }));

    // Remove permissions of user
    const removeExistingPermissionsMutation = gql`
      mutation DeletePermissionsMutation($school_id: uuid = "", $user_id: uuid = "") {
        delete_users_permissions(
          where: { school_id: { _eq: $school_id }, user_id: { _eq: $user_id } }
        ) {
          affected_rows
        }
      }
    `;

    await graphQLClient.request(removeExistingPermissionsMutation, {
      school_id: schoolID,
      user_id: userID,
    });

    const updatePermissionsMutation = gql`
      mutation UpdatePermissionsMutation($objects: [users_permissions_insert_input!]! = {}) {
        insert_users_permissions(objects: $objects) {
          affected_rows
        }
      }
    `;

    console.log(JSON.stringify(permissionsDataArray));

    const updatePermissionsResponse = await graphQLClient.request(updatePermissionsMutation, {
      objects: permissionsDataArray,
    });
    return updatePermissionsResponse;
  } catch (e) {
    throw e;
  }
};

// Creates user given input, returns user UID. Will throw error if something goes wrong and will clean itself up.
export const createUser = async (
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  schoolID: string,
  userRole: string
) => {
  let userUID: any = null;
  let databaseUserID: string | null = null;

  const lowercaseUserRole = userRole.toLowerCase();

  // Validation
  if (userRole !== 'student' && userRole !== 'admin' && userRole !== 'teacher') {
    throw Error('Role not valid');
  }
  if (password.length < 6) {
    throw Error('Password less than 6 characters');
  }

  // TODO: Check if the user creating the user has permission to add to the school

  try {
    // Create Firebase user
    const user = await admin.auth().createUser({
      uid: uuidv4(),
      email,
      password,
    });

    // Deal with Hasura claims
    const customClaims = {
      'https://hasura.io/jwt/claims': {
        'x-hasura-default-role': 'user',
        'x-hasura-allowed-roles': ['user'],
        'x-hasura-user-id': user.uid,
      },
    };
    admin
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
        throw error;
      });

    // Create user object in database
    console.log('Creating user for: ', schoolID);
    userUID = user.uid;

    const createUserMutation = gql`
      mutation CreateUser(
        $first_name: String = ""
        $last_name: String = ""
        $full_name: String = ""
        $user_role: String = ""
        $school_id: uuid = ""
        $user_id: uuid = ""
      ) {
        insert_users_one(
          object: {
            first_name: $first_name
            last_name: $last_name
            full_name: $full_name
            id: $user_id
            schools: { data: { school_id: $school_id, role: $user_role } }
            # permissions: {
            #   # DEFAULT PERMISSIONS FOR ALL CREATED USERS
            #   data: [
            #     { permission_id: 4, school_id: $school_id }
            #     { permission_id: 5, school_id: $school_id }
            #   ]
            # }
          }
        ) {
          id
          first_name
          last_name
        }
      }
    `;

    const createUserResponse = await graphQLClient.request(createUserMutation, {
      school_id: schoolID,
      user_id: userUID,
      first_name: firstName,
      last_name: lastName,
      user_role: lowercaseUserRole,
      full_name: firstName + ' ' + lastName,
    });
    databaseUserID = createUserResponse['insert_users_one'].id;

    // Handle adding permissions to user
    const permissionsArray = [];
    if (lowercaseUserRole === 'student') permissionsArray.push(...STUDENT_PERMISSIONS);
    if (lowercaseUserRole === 'teacher') permissionsArray.push(...TEACHER_PERMISSIONS);
    if (lowercaseUserRole === 'admin') permissionsArray.push(...ADMIN_PERMISSIONS);
    await updatePermissions(permissionsArray, userUID, schoolID);

    // On Success
    return databaseUserID;
  } catch (e) {
    if (userUID) {
      // Delete firebase user
      await admin.auth().deleteUser(userUID);
    }

    if (databaseUserID) {
      // Delete database record for user
      const deleteAssociatedUser = gql`
        mutation DeleteUser($id: uuid!) {
          delete_users_by_pk(id: $id) {
            id
          }
        }
      `;
      await graphQLClient.request(deleteAssociatedUser, { id: userUID });
    }

    throw e;
  }
};

usersRouter.post('/createUser', async (req: Request, res: Response) => {
  let userUid;
  try {
    const { email, password, firstName, lastName, schoolID, userRole } = req.body.input;

    userUid = await createUser(email, password, firstName, lastName, schoolID, userRole);
  } catch (e) {
    return res.status(400).json({
      message: 'An Error Occurred: ' + e.message,
    });
  }

  return res.json({
    userUid,
  });
});

export default usersRouter;
