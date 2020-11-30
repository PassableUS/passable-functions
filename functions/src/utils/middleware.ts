import { Request, Response, NextFunction } from 'express';
import logger from './logger'
const logRequest = (req: Request, res: Response, next: NextFunction) => {
  logger.info('Method:  ', req.method);
  logger.info('Path:    ', req.path);
  logger.info('Body:    ', req.body);
  logger.info('--------');
  return next();
};

const unknownEndpoint = (req: Request, res: Response, next: NextFunction) => {
  return res.status(404).send({ error: 'Endpoint does not exist (Unknown Endpoint)' });
};

const errorHandler =  (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.message);

  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    return res.status(400).send({ error: 'Incorrect format for id parameter' });
  } else if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  } else if (err.name === 'JsonWebTokenError') {
    return res.status(400).json({ error: 'Invalid token' });
  }

  logger.error(err);

  return next(err);
};

export default {
  logRequest,
  unknownEndpoint,
  errorHandler,
};
