const usersRouter = require('express').Router();
// const User = require('../models/user');

usersRouter.post('/', async (req, res, next) => {
  try {
    console.log('Hit post');

    res.json({ msg: 'I See You' });
  } catch (exception) {
    next(exception);
  }
});

usersRouter.get('/', async (req, res) => {
  res.json({ msg: 'I See You' });
});

module.exports = usersRouter;
