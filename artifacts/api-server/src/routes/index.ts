import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import usersRouter from './users';
import logsRouter from './logs';
import analyticsRouter from './analytics';

const router = Router();

router.use('/healthz', healthRouter);
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/logs', logsRouter);
router.use('/analytics', analyticsRouter);

export default router;
