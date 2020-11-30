import express from 'express'
import bodyParser from 'body-parser'
import middleware from './utils/middleware'
// import * as cors from 'cors'

import usersRouter from './controllers/users'
import schoolsRouter from './controllers/schools'

const app = express();

// Middleware
// app.use(cors());
app.use(bodyParser.json());

// Routers
app.use('/users', usersRouter);
app.use('/schools', schoolsRouter);

// After router middleware
app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

export default app;