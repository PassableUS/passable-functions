import express, { NextFunction, Request, Response } from 'express'
const usersRouter = express.Router()
// const User = require('../models/user');

usersRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('Hit post');

    return res.json({ msg: 'I See You' });
  } catch (exception) {
    return next(exception);
  }
});

usersRouter.get('/', async (req: Request, res: Response) => {
  return res.json({ msg: 'I See You' });
});

export default usersRouter;