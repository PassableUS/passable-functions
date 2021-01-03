import { gql } from 'graphql-request';
import { Request, Response } from 'express';
import { createUser } from './users';

const schoolsRouter = require('express').Router();
const { graphQLClient } = require('../utils/gqlClient');

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
    console.log('School does not already exist. Proceed with creation.');
    return false;
  }
  return true;
};

schoolsRouter.post('/createSchool', async (req: Request, res: Response) => {
  // get request input
  const { email, password, firstName, lastName, schoolName, schoolPlaceID } = req?.body?.input;

  let schoolID: string = '';
  let userUid: string | null = null;
  // checks
  const doesSchoolExist = await doesSchoolExistAsync(schoolPlaceID);
  if (doesSchoolExist) {
    return res.status(400).json({
      type: 'place_id_duplicate',
      message: 'Error: School with the place ID ' + schoolPlaceID + ' already exists.',
    });
  }

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

    // console.log('Create school response', JSON.stringify(createSchoolResponse));

    userUid = await createUser(email, password, firstName, lastName, schoolID, 'admin');

    // On Success
    return res.json({
      userUid,
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

    return res.status(400).json({
      message: 'An Error Occurred: ' + e.message,
    });
  }
});

export default schoolsRouter;
