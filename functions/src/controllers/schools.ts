import { gql } from 'graphql-request';
import { Request, Response } from 'express';

const schoolsRouter = require('express').Router();
const admin = require('firebase-admin');
const { graphQLClient } = require('../utils/gqlClient');
const { v4: uuidv4 } = require('uuid');

const doesSchoolExistAsync = async (schoolPlaceID: string) => {
  const getSchoolQuery = gql`
    query GetSchoolByPlaceID($placeID: String = "") {
      schools(where: { place_id: { _eq: $placeID } }) {
        id
      }
    }
  `;
  const getSchoolResponse = await graphQLClient.request(getSchoolQuery, {
    placeID: schoolPlaceID,
  });
  const matchingSchools = getSchoolResponse.schools;
  console.log(matchingSchools);
  console.log('Matching schools length: ', matchingSchools.length);

  if (matchingSchools === undefined || matchingSchools.length === 0) {
    console.log('School does not exist.');
    return false;
  }
  return true;
};

schoolsRouter.post('/createSchool', async (req: Request, res: Response) => {
  // get request input
  const { email, password, fullName, schoolName, schoolPlaceID } = req?.body?.input;

  let schoolID: string | null = null;
  let userUID: string | null = null;
  let databaseUserID: string | null = null;

  // checks
  const doesSchoolExist = await doesSchoolExistAsync(schoolPlaceID);
  if (doesSchoolExist) {
    return res.status(400).json({
      type: 'place_id_duplicate',
      message: 'Error: School with the place ID ' + schoolPlaceID + ' already exists.',
    });
  }

  // run business logic
  try {
    // create school
    const createSchoolMutation = gql`
      mutation CreateSchool($name: String = "", $place_id: String = "") {
        insert_schools_one(object: { name: $name, place_id: $place_id }) {
          id
          name
        }
      }
    `;

    const createSchoolResponse = await graphQLClient.request(createSchoolMutation, {
      name: schoolName,
      place_id: schoolPlaceID,
    });
    schoolID = createSchoolResponse['insert_schools_one'].id;

    // create user
    const user = await admin.auth().createUser({
      uid: uuidv4(),
      email,
      password,
    });

    userUID = user.uid;

    // create corresponding database user (school admin) and set the user as an admin of the school (by adding the school id to the user's schools (add to users of school) and the user's schools_admins (add to admins of school))
    const createAdminUser = gql`
      mutation CreateAdminUser($school_id: uuid = "", $user_id: uuid = "", $name: String = "") {
        insert_users_one(
          object: {
            name: $name
            current_school_id: $school_id
            schools_admins: { data: { school_id: $school_id } }
            id: $user_id
            schools: { data: { school_id: $school_id } }
          }
        ) {
          id
          name
        }
      }
    `;
    // @ts-ignore
    const createAdminUserResponse = await graphQLClient.request(createAdminUser, {
      school_id: schoolID,
      user_id: userUID,
      name: fullName,
    });
    databaseUserID = createAdminUserResponse['insert_users_one'].id;

    // On Success
    return res.json({
      userUid: databaseUserID,
    });
  } catch (e) {
    if (schoolID) {
      // Delete school
      const deleteSchoolMutation = gql`
        mutation DeleteSchool($id: uuid! = "") {
          delete_schools_by_pk(id: $id) {
            id
          }
        }
      `;
      await graphQLClient.request(deleteSchoolMutation, { id: schoolID });
    }

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

    return res.status(400).json({
      message: 'An Error Occurred: ' + e.message,
    });
  }
});

export default schoolsRouter;
