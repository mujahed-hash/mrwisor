
import express from 'express';
import * as pushController from '../controllers/pushController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateToken);

router.post('/register', pushController.registerToken);
router.post('/test', pushController.testPush);

export default router;
